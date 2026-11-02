// Pedidos del panel al script de contenido (y sus respuestas). El panel pregunta; la página contesta.
import type { EstructuraForm, LecturaFallida } from '../../lib/motor/google-forms/estructura.ts'
import type { LecturaSeccion, Pendiente, ResultadoCampo } from '../../lib/motor/google-forms/completar.ts'
import type { Propuesta } from '../../lib/motor/google-forms/respuestas.ts'

export type Pedido =
  | { tipo: 'leer'; propuestas?: Propuesta[] }
  | { tipo: 'completar'; propuestas: Propuesta[] }
  | { tipo: 'vaciar'; entry: string }

export interface EstadoPagina {
  /** Id público del formulario (de la URL /forms/d/e/<id>/): clave para guardar sus respuestas. */
  formId: string | null
  estructura: EstructuraForm | LecturaFallida
  seccion: LecturaSeccion
  /** Solo si el pedido trajo las propuestas. */
  pendientes: Pendiente[]
}

export type RespuestaContenido =
  | { ok: true; estado: EstadoPagina }
  | { ok: true; resultados: ResultadoCampo[] }
  | { ok: true; vaciado: boolean }
  | { ok: false; error: string }
