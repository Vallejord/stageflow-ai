// Pruebas del completado (T3) sobre HTML guardado de secciones reales (fixtures/html/).
// Corren en Chromium headless sin red y sin el JS de Google: prueban ubicar, leer, escribir texto y las reglas.
// Los clics en radios, casillas y desplegables dependen del JS de Google: se prueban con un simulador mínimo
// de ese clic y, de verdad, en las corridas reales (tools/completar.ts).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium, type Page } from 'playwright'
import type { EstructuraForm } from '../lib/motor/google-forms/estructura.ts'
import type { Propuesta } from '../lib/motor/google-forms/respuestas.ts'
import { esConfirmacionHumana } from '../lib/motor/google-forms/completar.ts'
import { scriptCompletar } from '../tools/inyectar-completar.ts'

const leer = (ruta: string) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8')
const formA: EstructuraForm = JSON.parse(leer('fixtures/form-a.estructura.json'))
const formB: EstructuraForm = JSON.parse(leer('fixtures/form-b.estructura.json'))
const propuestasA: Propuesta[] = JSON.parse(leer('fixtures/form-a.respuestas.json')).respuestas

const navegador = await chromium.launch({ channel: 'chrome', headless: true })
after(() => navegador.close())

/** Abre el HTML guardado sin scripts ni red, e inyecta el módulo. */
async function abrir(fixture: string): Promise<Page> {
  const page = await navegador.newPage()
  await page.route('**/*', (r) => r.abort())
  const html = leer(`fixtures/html/${fixture}.html`).replace(/<script\b[\s\S]*?<\/script>/gi, '')
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.addScriptTag({ content: scriptCompletar() })
  return page
}

/** Simula el clic de Google sobre radios y casillas (alterna aria-checked). Solo para pruebas offline. */
const simularClicGoogle = (page: Page) =>
  page.evaluate(() => {
    document.addEventListener('click', (e) => {
      const o = (e.target as Element).closest('[role="radio"], [role="checkbox"]')
      if (!o) return
      if (o.getAttribute('role') === 'radio') {
        o.closest('[role="radiogroup"]')?.querySelectorAll('[role="radio"]').forEach((r) => r.setAttribute('aria-checked', 'false'))
        o.setAttribute('aria-checked', 'true')
      } else o.setAttribute('aria-checked', o.getAttribute('aria-checked') === 'true' ? 'false' : 'true')
    })
  })

const propuesta = (p: Partial<Propuesta> & Pick<Propuesta, 'entry' | 'tipo' | 'respuesta'>): Propuesta => ({
  pregunta: '', obligatoria: true, origen: 'ficha', campo: null, nota: null, revisar: false, motivos: [], avisos: [], ...p,
})

test('El módulo no importa nada de Node ni de Playwright (criterio 8)', () => {
  const src = leer('lib/motor/google-forms/completar.ts')
  const imports = [...src.matchAll(/^import\s+(type\s+)?.*from\s+['"]([^'"]+)['"]/gm)]
  for (const m of imports) {
    assert.ok(m[1], `import de valores no permitido: ${m[0]}`)
    assert.ok(!m[2].startsWith('node:') && m[2] !== 'playwright', `import no permitido: ${m[0]}`)
  }
  assert.doesNotMatch(src, /\brequire\(|process\.|playwright/)
})

test('Confirmaciones del artista: solo la aceptación de bases del A', () => {
  const todas = formA.secciones.flatMap((s) => s.preguntas)
  const conf = todas.filter((p) => esConfirmacionHumana(p.titulo))
  assert.deepEqual(conf.map((p) => p.entry), ['entry.530285729'])
  assert.ok(esConfirmacionHumana('Acepto los términos y condiciones'))
  assert.ok(esConfirmacionHumana('Declaro bajo juramento que los datos son verdaderos'))
  assert.ok(!esConfirmacionHumana('Nombre de la obra'))
})

test('Formulario B, página 1: ubica cada pregunta por su entry y lee los botones', async () => {
  const page = await abrir('form-b-p1')
  const s = await page.evaluate(() => (window as any).__stageflowCompletar.leerSeccion())
  const esperados = formB.secciones[0].preguntas.map((p) => p.entry)
  assert.deepEqual(s.campos.map((c: any) => c.entry), esperados)
  assert.deepEqual(s.campos.map((c: any) => c.valor), ['', '', ''])
  assert.equal(s.haySiguiente, true)
  assert.equal(s.hayEnviar, false)
  assert.ok(s.firma.includes('entry.1121520150'))
  await page.close()
})

test('Formulario B, página 1: escribe y verifica texto; casillas exactas (con clic simulado)', async () => {
  const page = await abrir('form-b-p1')
  await simularClicGoogle(page)
  const props = [
    propuesta({ entry: 'entry.223954454', tipo: 'respuesta_corta', respuesta: '2019', pregunta: 'Año de estreno' }),
    propuesta({ entry: 'entry.1121520150', tipo: 'casillas', respuesta: ['Teatro', 'Danza'], pregunta: 'Disciplinas' }),
  ]
  // Borrador previo con una casilla que sobra: tiene que quedar desmarcada.
  await page.evaluate(() => (document.querySelector('[role="checkbox"][data-answer-value="Circo"]') as HTMLElement).click())
  const r = await page.evaluate((p) => (window as any).__stageflowCompletar.completarSeccion(p), props)
  assert.deepEqual(r.map((x: any) => [x.entry, x.estado, x.leido]), [
    ['entry.223954454', 'ok', '2019'],
    ['entry.1121520150', 'ok', 'Teatro + Danza'],
  ])
  // Segunda pasada sobre lo ya escrito: sobrescribe y sigue ok.
  props[0].respuesta = '2020'
  const r2 = await page.evaluate((p) => (window as any).__stageflowCompletar.completarSeccion(p), props)
  assert.deepEqual(r2.map((x: any) => x.estado), ['ok', 'ok'])
  assert.equal(r2[0].leido, '2020')
  await page.close()
})

test('Valor distinto se informa como "distinto", no como ok', async () => {
  const page = await abrir('form-b-p1')
  // Sin el simulador, el clic no cambia nada: la casilla no queda marcada y se detecta.
  const r = await page.evaluate(
    (p) => (window as any).__stageflowCompletar.completarSeccion(p),
    [propuesta({ entry: 'entry.1121520150', tipo: 'casillas', respuesta: ['Teatro'] })],
  )
  assert.equal(r[0].estado, 'distinto')
  assert.equal(r[0].leido, '')
  await page.close()
})

test('Formulario A, página 1: la aceptación de bases no se completa y queda pendiente de la persona', async () => {
  const page = await abrir('form-a-p1')
  await simularClicGoogle(page)
  const r = await page.evaluate((p) => (window as any).__stageflowCompletar.completarSeccion(p), propuestasA)
  assert.equal(r.length, 1)
  assert.equal(r[0].entry, 'entry.530285729')
  assert.equal(r[0].accion, 'confirmacion_humana')
  assert.equal(r[0].estado, null)
  assert.equal(r[0].leido, '', 'no se tildó')
  const pend = await page.evaluate((p) => (window as any).__stageflowCompletar.estadoPendientes(p), propuestasA)
  assert.deepEqual(pend, [{ entry: 'entry.530285729', pregunta: propuestasA[0].pregunta, tipo: 'confirmacion', hecho: false }])
  // Cuando la persona tilda "Sí", queda hecho.
  await page.evaluate(() => (document.querySelector('[role="radio"]') as HTMLElement).click())
  const pend2 = await page.evaluate((p) => (window as any).__stageflowCompletar.estadoPendientes(p), propuestasA)
  assert.equal(pend2[0].hecho, true)
  await page.close()
})

test('Archivos: no se tocan y se marcan pendientes hasta que hay un archivo subido', async () => {
  const page = await abrir('form-a-p1')
  // Se reemplaza la pregunta por una de archivo con el formato de data-params real.
  await page.evaluate(() => {
    const dp = document.querySelector('[data-params]')!
    dp.setAttribute('data-params', '%.@.[1,"Dossier de la obra",null,13,[[184215241,null,true]]],"i1"]')
  })
  const props = [propuesta({ entry: 'entry.184215241', tipo: 'archivo', respuesta: null, origen: 'archivo_manual', pregunta: 'Dossier' })]
  const r = await page.evaluate((p) => (window as any).__stageflowCompletar.completarSeccion(p), props)
  assert.equal(r[0].accion, 'archivo_manual')
  const antes = await page.evaluate((p) => (window as any).__stageflowCompletar.estadoPendientes(p), props)
  assert.equal(antes[0].hecho, false)
  await page.evaluate(() => {
    const i = Object.assign(document.createElement('input'), { type: 'hidden', name: 'entry.184215241', value: '1AbCdEf' })
    document.querySelector('[role="listitem"] [data-params]')!.appendChild(i)
  })
  const despues = await page.evaluate((p) => (window as any).__stageflowCompletar.estadoPendientes(p), props)
  assert.equal(despues[0].hecho, true)
  await page.close()
})
