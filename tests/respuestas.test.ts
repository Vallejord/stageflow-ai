import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { EstructuraForm } from '../lib/motor/google-forms/estructura.ts'
import { construirPedido, revisarRespuestas, type RespuestaIA } from '../lib/motor/google-forms/respuestas.ts'
import { proponerRespuestas } from '../lib/motor/proponer.ts'
import { ErrorIA } from '../lib/motor/ia/gemini.ts'
import { compararRespuestas, tablaRespuestas } from './comparar-respuestas.ts'

const leer = (ruta: string) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'))
const formA: EstructuraForm = leer('fixtures/form-a.estructura.json')
const formB: EstructuraForm = leer('fixtures/form-b.estructura.json')
const ficha = leer('data/obra-demo.json')
const esperadas = leer('tests/respuestas-esperadas-form-a.json').respuestas

/** Respuesta "perfecta" de una IA simulada, armada desde lo esperado. */
function iaSimuladaPerfecta(): RespuestaIA[] {
  const valores: Record<string, string> = {
    'Ciudad': 'Capilla del Monte y San Marcos Sierras, Córdoba',
    'Reseña (máx. 500)': ficha.espectaculo.sinopsis,
  }
  return esperadas.map((e: any, i: number) => {
    const origen = e.origenes[0]
    const v = e.respuesta ?? valores[e.pregunta]
    return { id: `p${i + 1}`, valores: origen === 'sin_dato' || origen === 'archivo_manual' || v == null ? [] : [{ fila: '', valor: v }], origen: e.pregunta === 'Reseña (máx. 500)' ? 'ficha' : origen, campo: e.campo ?? '', nota: '' }
  })
}

test('Pedido: una pregunta por cada una del formulario, con la ficha incluida', () => {
  const { prompt, ids } = construirPedido(formA, ficha)
  assert.equal(ids.length, 23)
  assert.ok(prompt.includes('meli_schneider@hotmail.com'))
  assert.ok(prompt.includes('entry') === false, 'no se le pasan los entry a la IA (se usan ids p1..pN)')
})

test('IA simulada correcta: pasa la revisión y coincide con lo esperado', () => {
  const r = revisarRespuestas(formA, ficha, iaSimuladaPerfecta())
  assert.equal(r.completo, true)
  const filas = compararRespuestas(esperadas, r.propuestas)
  assert.deepEqual(filas.filter((f) => !f.coincide), [])
})

test('Detecta errores de la IA (validación por código)', () => {
  const crudas = iaSimuladaPerfecta()
  const mod = (n: number, cambios: Partial<RespuestaIA>) => Object.assign(crudas[n - 1], cambios)
  mod(6, { valores: [{ fila: '', valor: 'contacto@montevirgen.com' }] }) // email inventado marcado como ficha
  mod(1, { valores: [{ fila: '', valor: 'Acepto' }] }) // opción que no existe
  mod(11, { valores: [{ fila: '', valor: 'x'.repeat(501) }], origen: 'adaptado' }) // pasa el límite
  mod(20, { valores: [{ fila: '', valor: 'dos' }] }) // no es número entero
  mod(16, { valores: [{ fila: '', valor: 'Juan Pérez' }], origen: 'ficha', campo: 'general.persona_contacto' }) // nombre inventado
  mod(14, { valores: [{ fila: '', valor: 'https://vimeo.com/123' }] }) // link inventado
  mod(5, { valores: [{ fila: '', valor: '+54 9 351 555 1234' }] }) // teléfono inventado
  crudas.splice(22, 1) // falta la última respuesta

  const r = revisarRespuestas(formA, ficha, crudas)
  const motivos = (n: number) => r.propuestas[n - 1].motivos.join(' | ')
  assert.match(motivos(6), /no están en la ficha/)
  assert.match(motivos(1), /no es una opción/)
  assert.match(motivos(11), /501 caracteres/)
  assert.match(motivos(20), /número entero/)
  assert.match(motivos(16), /Juan|Pérez|no es igual/)
  assert.match(motivos(14), /no están en la ficha/)
  assert.match(motivos(5), /no están en la ficha|no es igual/)
  for (const n of [6, 1, 11, 20, 16, 14, 5, 23]) assert.equal(r.propuestas[n - 1].revisar, true, `pregunta ${n} debe quedar para revisar`)
  assert.equal(r.completo, false)
  assert.deepEqual(r.faltantes, [formA.secciones[4].preguntas[2].titulo])
})

test('Formulario B: opciones inexistentes y formatos de fecha/hora/número se detectan', () => {
  const crudas: RespuestaIA[] = [
    { id: 'p1', valores: [{ fila: '', valor: 'Teatro' }, { fila: '', valor: 'Ópera' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p2', valores: [{ fila: '', valor: 'Córdoba' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p3', valores: [{ fila: '', valor: '1890' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p4', valores: [{ fila: '', valor: '15/03/2024' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p5', valores: [{ fila: '', valor: '9 pm' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p6', valores: [{ fila: '', valor: '6' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p7', valores: [{ fila: 'Enero', valor: 'Disponible' }, { fila: 'Abril', valor: 'Disponible' }], origen: 'propuesta_ia', campo: '', nota: '' },
    { id: 'p8', valores: [], origen: 'sin_dato', campo: '', nota: '' },
  ]
  const r = revisarRespuestas(formB, ficha, crudas)
  const m = (n: number) => r.propuestas[n - 1].motivos.join(' | ')
  assert.match(m(1), /Ópera" no es una opción/)
  assert.equal(m(2), '')
  assert.match(m(3), /entre 1950 y 2027/)
  assert.match(m(4), /AAAA-MM-DD/)
  assert.match(m(5), /HH:MM/)
  assert.match(m(6), /no es una opción/)
  assert.match(m(7), /Abril" no es una fila/)
  assert.match(m(7), /Faltan filas obligatorias/)
  assert.equal(m(8), '')
})

test('Si la IA falla, no se devuelve nada a medias (criterio 8)', async () => {
  const falla = async () => { throw new ErrorIA('sin_cupo', 'La IA no tiene cupo disponible en este momento.') }
  await assert.rejects(proponerRespuestas(formA, ficha, falla as any), (e: any) => e instanceof ErrorIA && e.motivo === 'sin_cupo')
  const basura = async () => ({ json: { otra: 1 }, tokens: { entrada: 0, salida: 0, pensamiento: 0 }, costoUSD: 0, ms: 0, modelo: 'x' })
  await assert.rejects(proponerRespuestas(formA, ficha, basura as any), (e: any) => e instanceof ErrorIA && e.motivo === 'respuesta_invalida')
})

// ---- Sobre corridas reales (se activan cuando existen los archivos) ----
const corridasA = existsSync(new URL('../fixtures', import.meta.url))
  ? readdirSync(new URL('../fixtures', import.meta.url)).filter((f) => /^form-a(-\d+)?\.respuestas\.json$/.test(f)).sort()
  : []

test('Corrida real del A coincide con lo esperado (criterio 2 y 3)', { skip: !corridasA.length && 'todavía no hay corrida real' }, () => {
  const r = leer(`fixtures/${corridasA[0]}`)
  const filas = compararRespuestas(esperadas, r.respuestas)
  writeFileSync(new URL('../fixtures/comparacion-respuestas-form-a.md', import.meta.url), tablaRespuestas(filas) + '\n')
  assert.equal(r.llamadasIA, 1)
  assert.deepEqual(filas.filter((f) => !f.coincide), [], 'ver fixtures/comparacion-respuestas-form-a.md')
})

test('Tres corridas del A: mismos valores en lo que sale de la ficha (criterio 7)', { skip: corridasA.length < 3 && 'faltan corridas' }, () => {
  const valores = corridasA.map((f) => leer(`fixtures/${f}`).respuestas.filter((p: any) => p.origen === 'ficha').map((p: any) => [p.entry, p.respuesta]))
  for (const v of valores.slice(1)) assert.deepEqual(v, valores[0])
})

test('Corrida real del B: opciones y formatos válidos (criterio 4)', { skip: !existsSync(new URL('../fixtures/form-b.respuestas.json', import.meta.url)) && 'todavía no hay corrida real' }, () => {
  const r = leer('fixtures/form-b.respuestas.json')
  const conMotivos = r.respuestas.filter((p: any) => p.motivos.length)
  assert.deepEqual(conMotivos.map((p: any) => [p.pregunta, p.motivos]), [])
})
