// Pruebas de POST /api/respuestas (T4) sin Next y sin llamar a la IA: proponer es simulado.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { EstructuraForm } from '../lib/motor/google-forms/estructura.ts'
import { ErrorIA } from '../lib/motor/ia/gemini.ts'
import type { ResultadoPropuesta } from '../lib/motor/proponer.ts'
import { atenderRespuestas, encabezadosCors, type Dependencias } from '../lib/servidor/respuestas.ts'

const leer = (ruta: string) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'))
const formB: EstructuraForm = leer('fixtures/form-b.estructura.json')
const guardada: ResultadoPropuesta = leer('fixtures/form-b.respuestas.json')
const TOKEN = 'token-de-prueba'

function deps(extra: Partial<Dependencias> = {}) {
  const llamadas: EstructuraForm[] = []
  const d: Dependencias = {
    tokenEsperado: TOKEN,
    ficha: {},
    proponer: async (e) => (llamadas.push(e), guardada),
    ...extra,
  }
  return { d, llamadas }
}
const pedido = (token: string | null, cuerpo: unknown = { estructura: formB }) => ({ origen: 'chrome-extension://abc', token, cuerpo })
const motivo = (r: { cuerpo: unknown }) => (r.cuerpo as any).error?.motivo

test('Con el token correcto devuelve las propuestas (1 llamada)', async () => {
  const { d, llamadas } = deps()
  const r = await atenderRespuestas(pedido(TOKEN), d)
  assert.equal(r.estado, 200)
  assert.equal((r.cuerpo as any).ok, true)
  assert.equal((r.cuerpo as any).respuestas.length, guardada.respuestas.length)
  assert.equal(llamadas.length, 1)
})

test('Sin token, con token equivocado o sin token configurado: no llama a la IA', async () => {
  for (const [token, esperado] of [[null, 401], ['otro', 401]] as const) {
    const { d, llamadas } = deps()
    const r = await atenderRespuestas(pedido(token), d)
    assert.equal(r.estado, esperado)
    assert.equal(motivo(r), 'token_invalido')
    assert.equal(llamadas.length, 0)
  }
  const { d, llamadas } = deps({ tokenEsperado: undefined })
  const r = await atenderRespuestas(pedido(TOKEN), d)
  assert.equal(r.estado, 500)
  assert.equal(motivo(r), 'servidor_sin_configurar')
  assert.equal(llamadas.length, 0)
})

test('Pedido sin estructura válida: 400 sin llamar a la IA', async () => {
  for (const cuerpo of [null, {}, { estructura: { ok: false } }]) {
    const { d, llamadas } = deps()
    const r = await atenderRespuestas(pedido(TOKEN, cuerpo), d)
    assert.equal(r.estado, 400)
    assert.equal(motivo(r), 'pedido_invalido')
    assert.equal(llamadas.length, 0)
  }
})

test('Fallas de la IA: mensaje claro, sin respuesta a medias', async () => {
  const casos: [ErrorIA['motivo'], number, RegExp][] = [
    ['sin_cupo', 503, /límite de uso/],
    ['tiempo', 502, /tardó demasiado/],
    ['conexion', 502, /conexión a internet/],
    ['otro', 502, /problema/],
  ]
  for (const [m, estado, texto] of casos) {
    const { d } = deps({ proponer: async () => { throw new ErrorIA(m, 'x') } })
    const r = await atenderRespuestas(pedido(TOKEN), d)
    assert.equal(r.estado, estado, m)
    assert.equal(motivo(r), `ia_${m}`)
    assert.match((r.cuerpo as any).error.mensaje, texto)
    assert.equal((r.cuerpo as any).respuestas, undefined)
  }
  const { d } = deps({ proponer: async () => ({ ...guardada, completo: false, faltantes: ['x'] }) })
  assert.equal(motivo(await atenderRespuestas(pedido(TOKEN), d)), 'respuesta_incompleta')
})

test('Falla simulada (solo desarrollo): no llama a la IA', async () => {
  const { d, llamadas } = deps({ simularFallaIA: 'sin_cupo' })
  const r = await atenderRespuestas(pedido(TOKEN), d)
  assert.equal(motivo(r), 'ia_sin_cupo')
  assert.equal(llamadas.length, 0)
})

test('CORS: solo para la extensión', () => {
  assert.equal(encabezadosCors('chrome-extension://abc')['Access-Control-Allow-Origin'], 'chrome-extension://abc')
  assert.deepEqual(encabezadosCors('https://otro-sitio.com'), {})
  assert.deepEqual(encabezadosCors(null), {})
})
