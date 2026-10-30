// Compara la estructura leída con la esperada, pregunta por pregunta, y arma la tabla del criterio 3.
import type { EstructuraForm } from '../lib/motor/google-forms/estructura.ts'

export interface Fila { n: number; seccion: string; dato: string; esperado: string; leido: string; coincide: boolean }

const corto = (s: string) => (s.length > 60 ? s.slice(0, 57) + '…' : s)

export function comparar(esperado: any, leido: EstructuraForm): Fila[] {
  const filas: Fila[] = []
  let n = 0
  const add = (seccion: string, dato: string, e: unknown, l: unknown) =>
    filas.push({ n, seccion, dato, esperado: String(e), leido: String(l), coincide: JSON.stringify(e) === JSON.stringify(l) })

  add('—', 'título del formulario', esperado.titulo, leido.titulo)
  add('—', 'requiere iniciar sesión', esperado.requiereLogin, leido.requiereLogin)
  add('—', 'cantidad de secciones', esperado.secciones.length, leido.secciones.length)
  const totalEsp = esperado.secciones.reduce((a: number, s: any) => a + s.preguntas.length, 0)
  add('—', 'cantidad de preguntas', totalEsp, leido.totalPreguntas)

  esperado.secciones.forEach((se: any, i: number) => {
    const sl = leido.secciones[i]
    const nombre = `S${i + 1}`
    add(nombre, 'título de sección', se.titulo, sl?.titulo)
    add(nombre, 'preguntas en la sección', se.preguntas.length, sl?.preguntas.length)
    se.preguntas.forEach((pe: any, j: number) => {
      n++
      const pl = sl?.preguntas[j]
      add(nombre, `P${n} título`, corto(pe.titulo), corto(pl?.titulo ?? '(falta)'))
      filas[filas.length - 1].coincide = pe.titulo === pl?.titulo
      add(nombre, `P${n} tipo`, pe.tipo, pl?.tipo)
      add(nombre, `P${n} obligatoria`, pe.obligatoria ? 'sí' : 'no', pl ? (pl.obligatoria ? 'sí' : 'no') : '(falta)')
      add(nombre, `P${n} validaciones`, JSON.stringify(pe.validaciones), JSON.stringify(pl?.validaciones))
      if (pe.opciones) add(nombre, `P${n} opciones`, JSON.stringify(pe.opciones), JSON.stringify(pl?.opciones))
      if (pe.extremos) add(nombre, `P${n} extremos de la escala`, JSON.stringify(pe.extremos), JSON.stringify(pl?.extremos))
      if (pe.filas) {
        add(nombre, `P${n} filas`, JSON.stringify(pe.filas), JSON.stringify(pl?.filas?.map((f) => f.titulo)))
        add(nombre, `P${n} cada fila tiene entry.<número>`, 'sí', pl?.filas?.every((f) => /^entry\.\d+$/.test(f.entry)) ? 'sí' : 'no')
      }
      const necesitaEntry = pe.tipo !== 'archivo' && !pe.filas
      if (necesitaEntry) add(nombre, `P${n} tiene entry.<número>`, 'sí', pl?.entry && /^entry\.\d+$/.test(pl.entry) ? 'sí' : 'no')
    })
  })
  return filas
}

export function tablaMarkdown(filas: Fila[]): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|')
  const cuerpo = filas.map((f) => `| ${f.seccion} | ${esc(f.dato)} | ${esc(f.esperado)} | ${esc(f.leido)} | ${f.coincide ? '✅' : '❌'} |`)
  const dif = filas.filter((f) => !f.coincide).length
  return [`Diferencias: ${dif} de ${filas.length} comprobaciones`, '', '| Sección | Dato | Esperado | Leído | Coincide |', '|---|---|---|---|---|', ...cuerpo].join('\n')
}
