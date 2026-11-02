/**
 * POST /api/respuestas (T4): recibe la estructura de un formulario (leída en la extensión) y devuelve las
 * respuestas propuestas con la ficha de demo. Solo servidor: la clave de la IA nunca sale de acá.
 * Separado de la ruta de Next para poder probarlo sin Next y con una IA simulada.
 */
import type { EstructuraForm } from '../motor/google-forms/estructura.ts'
import { ErrorIA } from '../motor/ia/gemini.ts'
import type { ResultadoPropuesta } from '../motor/proponer.ts'

export interface Pedido {
  origen: string | null
  token: string | null
  cuerpo: unknown
}

export interface Respuesta {
  estado: number
  cuerpo: unknown
}

export interface Dependencias {
  /** Token de desarrollo esperado (STAGEFLOW_DEV_TOKEN). Las cuentas reales llegan en el paso 3. */
  tokenEsperado: string | undefined
  ficha: unknown
  proponer: (estructura: EstructuraForm, ficha: unknown) => Promise<ResultadoPropuesta>
  /** Solo en desarrollo: fuerza una falla de la IA sin llamarla (para probar los mensajes de error). */
  simularFallaIA?: string
}

/** Errores en castellano simple: el panel los muestra tal cual. */
const error = (estado: number, motivo: string, mensaje: string): Respuesta => ({ estado, cuerpo: { ok: false, error: { motivo, mensaje } } })

const MENSAJES_IA: Record<ErrorIA['motivo'], string> = {
  sin_cupo: 'El asistente llegó a su límite de uso por ahora. Probá de nuevo en unos minutos.',
  tiempo: 'El asistente tardó demasiado en responder. Probá de nuevo.',
  conexion: 'No se pudo conectar con el asistente. Revisá tu conexión a internet y probá de nuevo.',
  sin_clave: 'El servidor de StageFlow no está bien configurado (falta la clave del asistente).',
  clave_invalida: 'El servidor de StageFlow no está bien configurado (la clave del asistente no es válida).',
  respuesta_invalida: 'El asistente respondió algo que no se pudo usar. Probá de nuevo.',
  otro: 'El asistente tuvo un problema. Probá de nuevo en unos minutos.',
}

/** Encabezados para que el panel de la extensión (chrome-extension://…) pueda llamar a la ruta. */
export function encabezadosCors(origen: string | null): Record<string, string> {
  if (!origen?.startsWith('chrome-extension://')) return {}
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-StageFlow-Token',
    Vary: 'Origin',
  }
}

let llamadasDesdeQueArranco = 0

function esEstructura(x: unknown): x is EstructuraForm {
  const e = x as EstructuraForm
  return !!e && e.ok === true && typeof e.titulo === 'string' && Array.isArray(e.secciones)
}

export async function atenderRespuestas(pedido: Pedido, deps: Dependencias): Promise<Respuesta> {
  if (!deps.tokenEsperado) return error(500, 'servidor_sin_configurar', 'El servidor de StageFlow no está bien configurado (falta el token de desarrollo).')
  if (pedido.token !== deps.tokenEsperado) return error(401, 'token_invalido', 'Esta extensión no está autorizada para usar el servidor de StageFlow.')

  const estructura = (pedido.cuerpo as { estructura?: unknown } | null)?.estructura
  if (!esEstructura(estructura)) return error(400, 'pedido_invalido', 'No se recibió el formulario a completar.')

  try {
    if (deps.simularFallaIA) throw new ErrorIA(deps.simularFallaIA as ErrorIA['motivo'], 'Falla simulada (STAGEFLOW_SIMULAR_FALLA_IA)')
    llamadasDesdeQueArranco++
    console.log(`[api/respuestas] llamada a la IA nº ${llamadasDesdeQueArranco} desde que arrancó el servidor: "${estructura.titulo}"`)
    const r = await deps.proponer(estructura, deps.ficha)
    if (!r.completo) return error(502, 'respuesta_incompleta', 'El asistente no respondió todas las preguntas. Probá de nuevo.')
    return { estado: 200, cuerpo: { ok: true, ...r } }
  } catch (e) {
    if (!(e instanceof ErrorIA)) throw e
    console.log(`[api/respuestas] error de la IA: ${e.motivo} — ${e.message}${e.detalle ? ` (${e.detalle})` : ''}`)
    return error(e.motivo === 'sin_cupo' ? 503 : 502, `ia_${e.motivo}`, MENSAJES_IA[e.motivo] ?? MENSAJES_IA.otro)
  }
}
