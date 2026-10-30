/** proponerRespuestas(estructura, ficha): 1 llamada a la IA + revisión por código. */
import type { EstructuraForm } from './google-forms/estructura.ts'
import { construirPedido, ESQUEMA_RESPUESTA, revisarRespuestas, type Propuesta, type RespuestaIA } from './google-forms/respuestas.ts'
import { ErrorIA, llamarGemini, type ResultadoLlamada } from './ia/gemini.ts'

export interface ResultadoPropuesta {
  formulario: string
  modelo: string
  completo: boolean
  faltantes: string[]
  llamadasIA: number
  tokens: ResultadoLlamada['tokens']
  costoUSD: number
  msIA: number
  respuestas: Propuesta[]
}

export async function proponerRespuestas(
  estructura: EstructuraForm,
  ficha: unknown,
  llamar: typeof llamarGemini = llamarGemini,
): Promise<ResultadoPropuesta> {
  const { prompt } = construirPedido(estructura, ficha)
  const r = await llamar(prompt, ESQUEMA_RESPUESTA) // única llamada
  const lista = (r.json as { respuestas?: unknown })?.respuestas
  if (!Array.isArray(lista)) throw new ErrorIA('respuesta_invalida', 'La IA no devolvió la lista de respuestas.')
  const revision = revisarRespuestas(estructura, ficha, lista as RespuestaIA[])
  return {
    formulario: estructura.titulo,
    modelo: r.modelo,
    completo: revision.completo,
    faltantes: revision.faltantes,
    llamadasIA: 1,
    tokens: r.tokens,
    costoUSD: r.costoUSD,
    msIA: r.ms,
    respuestas: revision.propuestas,
  }
}
