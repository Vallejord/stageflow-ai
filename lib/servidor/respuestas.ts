/**
 * POST /api/respuestas: recibe la estructura de un formulario (leída en la extensión) y devuelve las
 * respuestas propuestas con la ficha de la cuenta que hace el pedido (T5). Solo servidor: la clave de la IA nunca sale de acá.
 * Separado de la ruta de Next para poder probarlo sin Next, sin Firebase y con una IA simulada.
 */
import type { EstructuraForm } from '../motor/google-forms/estructura.ts'
import { ErrorIA } from '../motor/ia/gemini.ts'
import type { ResultadoPropuesta } from '../motor/proponer.ts'

/** Identificador fijo de la extensión (extension/.clave/id.txt). Es el único origen al que se le responde. */
export const ORIGEN_EXTENSION = 'chrome-extension://ibepmlkkjffdhonobnhhklckchmdbgjo'

export interface Pedido {
  origen: string | null
  /** Encabezado Authorization tal cual llega ("Bearer <token de sesión de Firebase>"). */
  autorizacion: string | null
  cuerpo: unknown
}

export interface Respuesta {
  estado: number
  cuerpo: unknown
}

export interface Dependencias {
  /** Verifica el token de sesión de Firebase y devuelve el uid, o null si no es válido. */
  verificarSesion: (token: string) => Promise<string | null>
  /** La ficha de la obra de ese usuario, o null si no tiene ninguna. */
  leerFicha: (uid: string) => Promise<unknown | null>
  proponer: (estructura: EstructuraForm, ficha: unknown) => Promise<ResultadoPropuesta>
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
  if (origen !== ORIGEN_EXTENSION) return {}
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
}

let llamadasDesdeQueArranco = 0

function esEstructura(x: unknown): x is EstructuraForm {
  const e = x as EstructuraForm
  return !!e && e.ok === true && typeof e.titulo === 'string' && Array.isArray(e.secciones)
}

export async function atenderRespuestas(pedido: Pedido, deps: Dependencias): Promise<Respuesta> {
  const token = /^Bearer (.+)$/.exec(pedido.autorizacion ?? '')?.[1]
  if (!token) return error(401, 'sin_sesion', 'Entrá con tu cuenta de Google en el panel de StageFlow.')
  const uid = await deps.verificarSesion(token).catch(() => null)
  if (!uid) return error(401, 'sesion_invalida', 'Tu sesión venció. Volvé a entrar con tu cuenta de Google.')

  const estructura = (pedido.cuerpo as { estructura?: unknown } | null)?.estructura
  if (!esEstructura(estructura)) return error(400, 'pedido_invalido', 'No se recibió el formulario a completar.')

  let ficha: unknown
  try {
    ficha = await deps.leerFicha(uid)
  } catch (e) {
    console.log(`[api/respuestas] no se pudo leer la ficha: ${e instanceof Error ? e.message : String(e)}`)
    return error(503, 'ficha_no_disponible', 'No se pudo leer tu ficha en este momento. Probá de nuevo en unos minutos.')
  }
  if (!ficha) return error(404, 'sin_obra', 'Todavía no tenés una obra cargada en StageFlow.')

  try {
    llamadasDesdeQueArranco++
    console.log(`[api/respuestas] llamada a la IA nº ${llamadasDesdeQueArranco} desde que arrancó el servidor: "${estructura.titulo}"`)
    const r = await deps.proponer(estructura, ficha)
    if (!r.completo) return error(502, 'respuesta_incompleta', 'El asistente no respondió todas las preguntas. Probá de nuevo.')
    return { estado: 200, cuerpo: { ok: true, ...r } }
  } catch (e) {
    if (!(e instanceof ErrorIA)) throw e
    console.log(`[api/respuestas] error de la IA: ${e.motivo} — ${e.message}${e.detalle ? ` (${e.detalle})` : ''}`)
    return error(e.motivo === 'sin_cupo' ? 503 : 502, `ia_${e.motivo}`, MENSAJES_IA[e.motivo] ?? MENSAJES_IA.otro)
  }
}
