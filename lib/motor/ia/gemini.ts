/**
 * Llamada a Gemini con salida estructurada. Corre en el servidor (la clave nunca va a la extensión).
 * Errores: siempre se lanza ErrorIA con un mensaje claro; nunca se devuelve un resultado a medias.
 */
import { GoogleGenAI } from '@google/genai'

export const MODELO = 'gemini-3.8-flash'
/** USD por millón de tokens, tarifa vigente hasta el 31/12/2026 (se duplica el 1/1/2027). */
export const PRECIO_USD_POR_MILLON = { entrada: 0.75, salida: 3.75 }
const TIMEOUT_MS = 30_000

export class ErrorIA extends Error {
  motivo: 'sin_clave' | 'clave_invalida' | 'sin_cupo' | 'tiempo' | 'conexion' | 'respuesta_invalida' | 'otro'
  constructor(motivo: ErrorIA['motivo'], mensaje: string) {
    super(mensaje)
    this.motivo = motivo
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
  if (/API key not valid|API_KEY_INVALID|401|403|PERMISSION_DENIED/i.test(msg))
    return new ErrorIA('clave_invalida', 'La clave de la IA no es válida o no tiene permiso. Revisá GEMINI_API_KEY.')
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg))
    return new ErrorIA('sin_cupo', 'La IA no tiene cupo disponible en este momento (límite de uso alcanzado). Probá más tarde o revisá la facturación.')
  if (/fetch failed|ENOTFOUND|ECONNRESET|network/i.test(msg))
    return new ErrorIA('conexion', 'No se pudo conectar con la IA. Revisá la conexión a internet.')
  return new ErrorIA('otro', `La IA devolvió un error: ${msg.slice(0, 300)}`)
}

export async function llamarGemini(prompt: string, esquema: object, apiKey = process.env.GEMINI_API_KEY): Promise<ResultadoLlamada> {
  if (!apiKey) throw new ErrorIA('sin_clave', 'Falta la clave de la IA (GEMINI_API_KEY en .env.local).')
  const ai = new GoogleGenAI({ apiKey })
  const t0 = performance.now()
  let respuesta
  try {
    respuesta = await Promise.race([
      ai.models.generateContent({
        model: MODELO,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: esquema as never, temperature: 0 },
      }),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new ErrorIA('tiempo', `La IA no respondió en ${TIMEOUT_MS / 1000} segundos.`)), TIMEOUT_MS),
      ),
    ])
  } catch (e) {
    throw e instanceof ErrorIA ? e : clasificar(e)
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
