// Pruebas de POST /api/respuestas (T4, cuentas en T5) sin Next, sin Firebase y sin llamar a la IA: sesión, ficha y proponer son simulados.
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
const FICHA_EZEQUIEL = { general: { email_contacto: 'meli@ejemplo.com' } }
/** Sesiones simuladas: el token de cada usuario y la ficha de cada uno. */
const SESIONES: Record<string, string> = { 'token-ezequiel': 'ezequiel', 'token-otro': 'otro' }
const FICHAS: Record<string, unknown> = { ezequiel: FICHA_EZEQUIEL }

function deps(extra: Partial<Dependencias> = {}) {
  const llamadas: { estructura: EstructuraForm; ficha: unknown }[] = []
  const d: Dependencias = {
    verificarSesion: async (t) => SESIONES[t] ?? null,
    leerFicha: async (uid) => FICHAS[uid] ?? null,
    proponer: async (estructura, ficha) => (llamadas.push({ estructura, ficha }), guardada),
    ...extra,
  }
  return { d, llamadas }
}
const ORIGEN = 'chrome-extension://ibepmlkkjffdhonobnhhklckchmdbgjo'
const pedido = (token: string | null, cuerpo: unknown = { estructura: formB }) => ({
  origen: ORIGEN,
  autorizacion: token === null ? null : `Bearer ${token}`,
  cuerpo,
})
const motivo = (r: { cuerpo: unknown }) => (r.cuerpo as any).error?.motivo

test('Con la sesión de Ezequiel: usa su ficha y devuelve las propuestas (1 llamada)', async () => {
  const { d, llamadas } = deps()
  const r = await atenderRespuestas(pedido('token-ezequiel'), d)
  assert.equal(r.estado, 200)
  assert.equal((r.cuerpo as any).ok, true)
  assert.equal((r.cuerpo as any).respuestas.length, guardada.respuestas.length)
  assert.equal(llamadas.length, 1)
  assert.deepEqual(llamadas[0].ficha, FICHA_EZEQUIEL)
})

test('Sin sesión o con sesión inválida: 401 y no llama a la IA (criterio 5)', async () => {
  for (const [autorizacion, esperado] of [[null, 'sin_sesion'], ['Bearer', 'sin_sesion'], ['Basic abc', 'sin_sesion'], ['Bearer vencido', 'sesion_invalida']] as const) {
    const { d, llamadas } = deps()
    const r = await atenderRespuestas({ origen: ORIGEN, autorizacion, cuerpo: { estructura: formB } }, d)
    assert.equal(r.estado, 401, String(autorizacion))
    assert.equal(motivo(r), esperado)
    assert.equal(llamadas.length, 0)
  }
  const { d, llamadas } = deps({ verificarSesion: async () => { throw new Error('caído') } })
  assert.equal((await atenderRespuestas(pedido('token-ezequiel'), d)).estado, 401)
  assert.equal(llamadas.length, 0)
})

test('Con la sesión de otro usuario: no ve la ficha de Ezequiel (criterio 5)', async () => {
  const { d, llamadas } = deps()
  const r = await atenderRespuestas(pedido('token-otro'), d)
  assert.equal(r.estado, 404)
  assert.equal(motivo(r), 'sin_obra')
  assert.equal(llamadas.length, 0)
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /meli@ejemplo/)
})

test('El uid sale de la sesión, nunca del pedido', async () => {
  const { d, llamadas } = deps()
  const r = await atenderRespuestas(pedido('token-otro', { estructura: formB, uid: 'ezequiel' }), d)
  assert.equal(r.estado, 404)
  assert.equal(llamadas.length, 0)
})

test('Si no se puede leer la ficha: 503 con mensaje claro y sin llamar a la IA', async () => {
  const { d, llamadas } = deps({ leerFicha: async () => { throw new Error('Firestore caído') } })
  const r = await atenderRespuestas(pedido('token-ezequiel'), d)
  assert.equal(r.estado, 503)
  assert.equal(motivo(r), 'ficha_no_disponible')
  assert.equal(llamadas.length, 0)
})

test('Pedido sin estructura válida: 400 sin llamar a la IA', async () => {
  for (const cuerpo of [null, {}, { estructura: { ok: false } }]) {
    const { d, llamadas } = deps()
    const r = await atenderRespuestas(pedido('token-ezequiel', cuerpo), d)
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
    const r = await atenderRespuestas(pedido('token-ezequiel'), d)
    assert.equal(r.estado, estado, m)
    assert.equal(motivo(r), `ia_${m}`)
    assert.match((r.cuerpo as any).error.mensaje, texto)
    assert.equal((r.cuerpo as any).respuestas, undefined)
  }
  const { d } = deps({ proponer: async () => ({ ...guardada, completo: false, faltantes: ['x'] }) })
  assert.equal(motivo(await atenderRespuestas(pedido('token-ezequiel'), d)), 'respuesta_incompleta')
})

test('IA sin cupo: mensaje claro y estado 503 (la falla se simula en la prueba, no en el servidor)', async () => {
  const { d } = deps({ proponer: async () => { throw new ErrorIA('sin_cupo', 'cupo agotado') } })
  const r = await atenderRespuestas(pedido('token-ezequiel'), d)
  assert.equal(r.estado, 503)
  assert.equal(motivo(r), 'ia_sin_cupo')
  assert.equal((r.cuerpo as any).respuestas, undefined)
})

test('CORS: solo para la extensión de StageFlow', () => {
  assert.equal(encabezadosCors(ORIGEN)['Access-Control-Allow-Origin'], ORIGEN)
  assert.match(encabezadosCors(ORIGEN)['Access-Control-Allow-Headers'], /Authorization/)
  assert.deepEqual(encabezadosCors('chrome-extension://otra-extension'), {})
  assert.deepEqual(encabezadosCors('https://otro-sitio.com'), {})
  assert.deepEqual(encabezadosCors(null), {})
})
