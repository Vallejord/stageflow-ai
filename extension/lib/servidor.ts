// Pide las respuestas al servidor de StageFlow (una vez por formulario) y las guarda en el almacenamiento de la extensión.
import type { EstructuraForm } from '../../lib/motor/google-forms/estructura.ts'
import type { Propuesta } from '../../lib/motor/google-forms/respuestas.ts'
import { SERVIDOR, TOKEN } from './config.ts'

export interface Guardadas {
  propuestas: Propuesta[]
  llamadasIA: number
  costoUSD: number
  msIA: number
  fecha: string
}

export type ResultadoPedido = { ok: true; guardadas: Guardadas; deLaMemoria: boolean } | { ok: false; motivo: string; mensaje: string }

const clave = (formId: string) => `respuestas:${formId}`

/** Respuestas del formulario: las guardadas si ya se pidieron; si no, una llamada al servidor. */
export async function respuestasDelFormulario(formId: string, estructura: EstructuraForm): Promise<ResultadoPedido> {
  const memoria = (await browser.storage.local.get(clave(formId)))[clave(formId)] as Guardadas | undefined
  if (memoria) return { ok: true, guardadas: memoria, deLaMemoria: true }

  let r: Response
  try {
    r = await fetch(`${SERVIDOR}/api/respuestas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-StageFlow-Token': TOKEN },
      body: JSON.stringify({ estructura }),
    })
  } catch {
    return { ok: false, motivo: 'servidor_apagado', mensaje: 'No pudimos conectarnos con StageFlow. Revisá tu conexión a internet y probá de nuevo.' }
  }
  const cuerpo = await r.json().catch(() => null)
  if (!cuerpo?.ok) return { ok: false, motivo: cuerpo?.error?.motivo ?? 'desconocido', mensaje: cuerpo?.error?.mensaje ?? 'StageFlow tuvo un problema. Probá de nuevo en unos minutos.' }

  const guardadas: Guardadas = { propuestas: cuerpo.respuestas, llamadasIA: cuerpo.llamadasIA, costoUSD: cuerpo.costoUSD, msIA: cuerpo.msIA, fecha: new Date().toISOString() }
  await browser.storage.local.set({ [clave(formId)]: guardadas })
  return { ok: true, guardadas, deLaMemoria: false }
}
