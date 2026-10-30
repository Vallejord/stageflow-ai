/**
 * Llamada a Gemini con salida estructurada. Corre en el servidor (la clave nunca va a la extensión).
 * Errores: siempre se lanza ErrorIA con un mensaje claro; nunca se devuelve un resultado a medias.
 */
import { GoogleGenAI, ThinkingLevel } from '@google/genai'

export const MODELO = 'gemini-3.8-flash'
/** USD por millón de tokens, tarifa vigente hasta el 31/12/2026 (se duplica el 1/1/2027). */
export const PRECIO_USD_POR_MILLON = { entrada: 0.75, salida: 3.75 }
const TIMEOUT_MS = 30_000

export class ErrorIA extends Error {
  motivo: 'sin_clave' | 'clave_invalida' | 'sin_cupo' | 'tiempo' | 'conexion' | 'respuesta_invalida' | 'otro'
  /** Mensaje original del proveedor, para diagnóstico. */
  detalle: string
  constructor(motivo: ErrorIA['motivo'], mensaje: string, detalle = '') {
    super(mensaje)
    this.motivo = motivo
    this.detalle = detalle
  }
}

export interface ResultadoLlamada {
  json: unknown
  tokens: { entrada: number; salida: number; pensamiento: number }
  costoUSD: number
  ms: number
  modelo: string
}

function clasificar(e: unknown): ErrorIA {
  const msg = e instanceof Error ? e.message : String(e)
  const detalle = msg.slice(0, 400)
  if (/API_KEY_INVALID|API key not valid|UNAUTHENTICATED|PERMISSION_DENIED|"code":\s*40[13]\b/i.test(msg))
    return new ErrorIA('clave_invalida', 'La clave de la IA no es válida o no tiene permiso. Revisá GEMINI_API_KEY.', detalle)
  if (/RESOURCE_EXHAUSTED|"code":\s*429\b|quota/i.test(msg))
    return new ErrorIA('sin_cupo', 'La IA no tiene cupo disponible en este momento (límite de uso alcanzado). Probá más tarde o revisá la facturación.', detalle)
  if (/fetch failed|ENOTFOUND|ECONNRESET|network/i.test(msg))
    return new ErrorIA('conexion', 'No se pudo conectar con la IA. Revisá la conexión a internet.', detalle)
  return new ErrorIA('otro', 'La IA devolvió un error.', detalle)
}

export async function llamarGemini(prompt: string, esquema: object, apiKey = process.env.GEMINI_API_KEY): Promise<ResultadoLlamada> {
  if (!apiKey) throw new ErrorIA('sin_clave', 'Falta la clave de la IA (GEMINI_API_KEY en .env.local).')
  const ai = new GoogleGenAI({ apiKey })
  const t0 = performance.now()
  // Corte real del pedido (no solo dejar de esperar): si no, el programa queda colgado hasta que Google responde.
  const corte = new AbortController()
  const reloj = setTimeout(() => corte.abort(), TIMEOUT_MS)
  let respuesta
  try {
    respuesta = await ai.models.generateContent({
      model: MODELO,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: esquema as never,
        temperature: 0,
        // Mapear preguntas a datos no necesita razonamiento largo; sin esto el modelo "piensa"
        // a veces 2.000+ tokens y tarda más de 20 s (visto en las corridas del 30/10). MINIMAL no está soportado en este modelo.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: corte.signal,
      },
    })
  } catch (e) {
    if (corte.signal.aborted) throw new ErrorIA('tiempo', `La IA no respondió en ${TIMEOUT_MS / 1000} segundos.`)
    throw clasificar(e)
  } finally {
    clearTimeout(reloj)
  }
  const ms = Math.round(performance.now() - t0)

  const texto = respuesta.text ?? ''
  let json: unknown
  try {
    json = JSON.parse(texto)
  } catch {
    throw new ErrorIA('respuesta_invalida', 'La IA devolvió una respuesta que no se pudo leer (JSON inválido).')
  }
  const u = respuesta.usageMetadata ?? {}
  const tokens = { entrada: u.promptTokenCount ?? 0, salida: u.candidatesTokenCount ?? 0, pensamiento: u.thoughtsTokenCount ?? 0 }
  const costoUSD =
    (tokens.entrada * PRECIO_USD_POR_MILLON.entrada + (tokens.salida + tokens.pensamiento) * PRECIO_USD_POR_MILLON.salida) / 1e6
  return { json, tokens, costoUSD, ms, modelo: MODELO }
}
