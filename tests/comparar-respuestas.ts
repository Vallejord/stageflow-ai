// Compara las respuestas propuestas con tests/respuestas-esperadas-form-a.json (criterio 2).
import type { Propuesta } from '../lib/motor/google-forms/respuestas.ts'

export interface FilaR { n: number; pregunta: string; esperado: string; obtenido: string; coincide: boolean; detalle: string }

const norm = (s: unknown) => String(s ?? '').trim()

export function compararRespuestas(esperadas: any[], obtenidas: Propuesta[]): FilaR[] {
  return esperadas.map((e, i) => {
    const o = obtenidas.find((p) => p.entry === e.entry)
    const problemas: string[] = []
    if (!o) problemas.push('falta la pregunta')
    else {
      if (!e.origenes.includes(o.origen)) problemas.push(`origen ${o.origen} (se esperaba ${e.origenes.join(' o ')})`)
      if (e.respuesta != null && norm(o.respuesta) !== norm(e.respuesta)) problemas.push('valor distinto')
      if (o.revisar !== e.revisar && !(e.origenes.includes('adaptado') && o.origen === 'adaptado')) problemas.push(`revisar=${o.revisar ? 'sí' : 'no'} (se esperaba ${e.revisar ? 'sí' : 'no'})`)
      if (e.campo && (o.origen === 'ficha' || o.origen === 'adaptado') && o.campo !== e.campo) problemas.push(`campo ${o.campo} (se esperaba ${e.campo})`)
      if (e.contiene_alguno && !e.contiene_alguno.some((t: string) => norm(o.respuesta).includes(t))) problemas.push(`debe mencionar ${e.contiene_alguno.join(' o ')}`)
      if (o.motivos.length) problemas.push(`no pasó la revisión: ${o.motivos.join('; ')}`)
    }
    const esperado = `${e.respuesta ?? '(cualquiera válido)'} · ${e.origenes.join('/')}${e.revisar ? ' · revisar' : ''}`
    const obtenido = o ? `${o.respuesta == null ? '—' : typeof o.respuesta === 'string' ? o.respuesta : JSON.stringify(o.respuesta)} · ${o.origen}${o.revisar ? ' · revisar' : ''}` : '(falta)'
    return { n: i + 1, pregunta: e.pregunta, esperado, obtenido, coincide: problemas.length === 0, detalle: problemas.join('; ') }
  })
}

export function tablaRespuestas(filas: FilaR[]): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const corto = (s: string) => (s.length > 90 ? s.slice(0, 87) + '…' : s)
  return [
    `Diferencias: ${filas.filter((f) => !f.coincide).length} de ${filas.length} preguntas`,
    '',
    '| # | Pregunta | Esperado | Obtenido | Coincide | Detalle |',
    '|---|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.n} | ${esc(f.pregunta)} | ${esc(corto(f.esperado))} | ${esc(corto(f.obtenido))} | ${f.coincide ? '✅' : '❌'} | ${esc(f.detalle)} |`),
  ].join('\n')
}
