import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { leerEstructura, type EstructuraForm } from '../lib/motor/google-forms/estructura.ts'
import { comparar, tablaMarkdown } from './comparar.ts'

const cargar = (archivo: string) => readFileSync(new URL(`../fixtures/${archivo}`, import.meta.url), 'utf8')

test('Formulario A: coincide pregunta por pregunta con lo esperado (criterio 1 y 3)', () => {
  const leido = leerEstructura(cargar('form-a.script.txt'))
  assert.equal(leido.ok, true)
  const esperado = JSON.parse(readFileSync(new URL('./esperado-form-a.json', import.meta.url), 'utf8'))
  const filas = comparar(esperado, leido as EstructuraForm)
  writeFileSync(new URL('../fixtures/comparacion-form-a.md', import.meta.url), tablaMarkdown(filas) + '\n')
  const dif = filas.filter((f) => !f.coincide)
  assert.deepEqual(dif, [], `Hay ${dif.length} diferencias; ver fixtures/comparacion-form-a.md`)
})

test('Formulario A: leer dos veces da el mismo resultado (criterio 7)', () => {
  const c = cargar('form-a.script.txt')
  assert.deepEqual(leerEstructura(c), leerEstructura(c))
})

test('Página de inicio de sesión de Google: aviso claro, sin error (criterio 6)', () => {
  const r = leerEstructura('<html><body><form action="https://accounts.google.com/v3/signin/identifier">Iniciar sesión</form></body></html>')
  assert.deepEqual(r, { ok: false, motivo: 'requiere_login', mensaje: 'Este formulario requiere iniciar sesión en Google.' })
})

test('Página que no es un Google Form: aviso, sin error', () => {
  const r = leerEstructura('<html><body>Hola</body></html>')
  assert.equal(r.ok, false)
})

test('Tipo desconocido: queda como no_soportado y no rompe la lectura', () => {
  const datos = [null, [null, [[1, 'Pregunta rara', null, 99, [[123, null, 0]]], [2, 'Normal', null, 0, [[456, null, 1]]]]], null, 'Form X']
  const r = leerEstructura(`var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(datos)};`) as EstructuraForm
  assert.equal(r.ok, true)
  assert.equal(r.totalPreguntas, 2)
  assert.equal(r.secciones[0].preguntas[0].tipo, 'no_soportado')
  assert.deepEqual(r.noSoportadas, ['Pregunta rara (código 99)'])
})

const hayFormB = existsSync(new URL('../fixtures/form-b.script.txt', import.meta.url))
test('Formulario B: reconoce cada tipo con sus opciones (criterio 2 y 3)', { skip: !hayFormB && 'falta capturar el formulario B' }, () => {
  const leido = leerEstructura(cargar('form-b.script.txt'))
  assert.equal(leido.ok, true)
  const esperado = JSON.parse(readFileSync(new URL('./esperado-form-b.json', import.meta.url), 'utf8'))
  const filas = comparar(esperado, leido as EstructuraForm)
  writeFileSync(new URL('../fixtures/comparacion-form-b.md', import.meta.url), tablaMarkdown(filas) + '\n')
  assert.deepEqual((leido as EstructuraForm).noSoportadas, [])
  const dif = filas.filter((f) => !f.coincide)
  assert.deepEqual(dif, [], `Hay ${dif.length} diferencias; ver fixtures/comparacion-form-b.md`)
})
