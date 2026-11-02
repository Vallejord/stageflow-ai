// Prueba la extensión compilada (extension/.output/chrome-mv3) en el Chromium de Playwright, con un perfil temporal
// sin sesión de Google. Le habla al script de contenido desde una página de la extensión, como lo hace el panel.
// "Siguiente" lo aprieta ESTE script haciendo de persona: la extensión nunca lo aprieta.
// Uso: node tools/probar-extension.ts contenido-b
import { chromium, type BrowserContext, type Page } from 'playwright'
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const FORM_B = 'https://docs.google.com/forms/d/e/1FAIpQLSdB-Spfi_-8eemcSWvTf_1lakNyaaDpQuhY7V5EkIOWay6S0Q/viewform'
const EXTENSION = path.resolve('extension/.output/chrome-mv3')
const escenario = process.argv[2]

export async function abrirConExtension(): Promise<{ context: BrowserContext; idExtension: string }> {
  const context = await chromium.launchPersistentContext(mkdtempSync(path.join(tmpdir(), 'sf-ext-')), {
    channel: 'chromium',
    headless: !process.env.SF_VISIBLE, // SF_VISIBLE=1 abre la ventana
    viewport: { width: 1280, height: 900 },
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  })
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 10_000 }))
  return { context, idExtension: sw.url().split('/')[2] }
}

/** Manda un pedido al script de contenido de la pestaña del formulario, desde una página de la extensión. */
export const pedir = (extension: Page, tabId: number, pedido: unknown) =>
  extension.evaluate(([id, p]) => chrome.tabs.sendMessage(id as number, p), [tabId, pedido] as const) as Promise<any>

/** Id de la pestaña donde contesta el script de contenido. */
export async function pestanaDelFormulario(extension: Page): Promise<number> {
  const ids: number[] = await extension.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.id!))
  for (const id of ids) {
    const r = await pedir(extension, id, { tipo: 'leer' }).catch(() => null)
    if (r?.ok) return id
  }
  throw new Error('Ninguna pestaña tiene el script de contenido')
}

/** Clic de la PERSONA en "Siguiente" (solo en este script de prueba). */
async function personaApretaSiguiente(form: Page) {
  const boton = form.locator('[role="button"]').filter({ hasText: /^\s*Siguiente\s*$/ })
  if ((await boton.count()) !== 1) throw new Error('No hay un único "Siguiente"')
  await boton.click()
}

async function esperarNuevaSeccion(extension: Page, tabId: number, firmaAnterior: string) {
  const t0 = performance.now()
  while (performance.now() - t0 < 15_000) {
    await extension.waitForTimeout(300)
    const r = await pedir(extension, tabId, { tipo: 'leer' }).catch(() => null) // mientras navega, no contesta
    if (r?.ok && r.estado.seccion.firma !== firmaAnterior) return { estado: r.estado, ms: Math.round(performance.now() - t0) }
  }
  throw new Error('No apareció la sección nueva en 15 s')
}

const resumen = (rs: any[]) => rs.map((r) => `${r.estado === 'ok' ? '✅' : r.estado ? '❌' : '—'} ${r.pregunta.slice(0, 40)}: ${r.leido || '(vacío)'}`).join('\n   ')

async function contenidoB() {
  const { context, idExtension } = await abrirConExtension()
  try {
    const form = await context.newPage()
    await form.goto(FORM_B, { waitUntil: 'load' })
    const extension = await context.newPage()
    await extension.goto(`chrome-extension://${idExtension}/sidepanel.html`)
    const tabId = await pestanaDelFormulario(extension)
    // Como con el panel lateral real, el formulario tiene que estar a la vista: en una pestaña oculta Chrome
    // frena las animaciones y el desplegable de Google no llega a abrirse.
    await form.bringToFront()
    const propuestas = JSON.parse(readFileSync('tests/respuestas-prueba-form-b.json', 'utf8')).respuestas

    let { estado } = await pedir(extension, tabId, { tipo: 'leer', propuestas })
    console.log(`formId ${estado.formId} · ${estado.estructura.titulo}: ${estado.estructura.totalPreguntas} preguntas`)
    for (let pagina = 1; ; pagina++) {
      const s = estado.seccion
      console.log(`\nPágina ${pagina}: ${s.titulo} — ${s.campos.length} preguntas · Siguiente: ${s.haySiguiente ? 'sí' : 'no'} · Enviar: ${s.hayEnviar ? 'sí' : 'no'} · pendientes de la persona: ${estado.pendientes.length}`)
      await form.waitForFunction(() => !document.querySelector('[role="listitem"] input[disabled], [role="listbox"][aria-disabled="true"]'), null, { timeout: 10_000 }).catch(() => {})
      const r = await pedir(extension, tabId, { tipo: 'completar', propuestas })
      if (!r.ok) throw new Error(r.error)
      console.log(`   ${resumen(r.resultados)}`)
      if (!s.haySiguiente) break
      await personaApretaSiguiente(form)
      const nueva = await esperarNuevaSeccion(extension, tabId, s.firma)
      console.log(`   (la persona apretó "Siguiente"; sección nueva detectada en ${nueva.ms} ms)`)
      estado = nueva.estado
    }
  } finally {
    await context.close()
  }
}

/** Panel real (como pestaña, con ?tab=) sobre el Formulario B: respuestas, completar, página nueva y última página. */
async function panelB() {
  const DIR = path.join('fixtures', 't4', 'capturas')
  mkdirSync(DIR, { recursive: true })
  const { context, idExtension } = await abrirConExtension()
  try {
    const form = await context.newPage()
    await form.goto(FORM_B, { waitUntil: 'load' })
    const ayudante = await context.newPage()
    await ayudante.goto(`chrome-extension://${idExtension}/sidepanel.html`)
    const tabId = await pestanaDelFormulario(ayudante)
    await ayudante.close()
    const panel = await context.newPage()
    await panel.setViewportSize({ width: 400, height: 1000 })
    const t0 = performance.now()
    await panel.goto(`chrome-extension://${idExtension}/sidepanel.html?tab=${tabId}`)
    await form.bringToFront() // el formulario a la vista, como con el panel lateral real
    const foto = async (nombre: string) => {
      await panel.screenshot({ path: path.join(DIR, `${nombre}.png`), fullPage: true })
      await form.bringToFront()
    }
    await panel.getByText('Completar esta página').waitFor({ timeout: 30_000 })
    console.log(`Respuestas visibles en el panel a los ${((performance.now() - t0) / 1000).toFixed(1)} s`)
    await foto('b-1-respuestas')

    for (let pagina = 1; ; pagina++) {
      await form.waitForFunction(() => !document.querySelector('[role="listitem"] input[disabled], [role="listbox"][aria-disabled="true"]'), null, { timeout: 10_000 }).catch(() => {})
      // Clic en el botón del panel sin traer el panel al frente (el formulario sigue a la vista).
      await panel.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Completar esta página')!.click())
      await panel.waitForFunction(() => /quedaron bien|hay que mirarlas|nada para completar/.test(document.body.innerText), null, { timeout: 30_000 })
      console.log(`Página ${pagina}: ${(await panel.locator("p.ok, p.error, p.nota").last().innerText()).trim()}`)
      await foto(`b-${pagina + 1}-completada`)
      const s = await pedir(panel, tabId, { tipo: 'leer' })
      if (!s.estado.seccion.haySiguiente) break
      await personaApretaSiguiente(form)
      await panel.waitForFunction((t) => !document.body.innerText.includes(t), (await panel.locator('h2').innerText()), { timeout: 15_000 })
      console.log(`   la persona apretó "Siguiente"; el panel muestra: ${await panel.locator('h2').innerText()}`)
    }
    console.log(`Última página en el panel: ${await panel.locator('p.final').innerText().catch(() => '(no aparece)')}`)
  } finally {
    await context.close()
  }
}

/**
 * Criterio 3: 1 llamada a la IA por formulario aunque se recargue la página, se cierre el panel o se cambie de sección.
 * Cuenta las llamadas en el registro del servidor (SF_LOG_SERVIDOR = archivo con la salida de npm run dev).
 */
async function unaLlamadaB() {
  const log = process.env.SF_LOG_SERVIDOR
  if (!log) throw new Error('Falta SF_LOG_SERVIDOR (archivo con la salida de npm run dev)')
  const llamadas = () => (readFileSync(log, 'utf8').match(/\[api\/respuestas\] llamada a la IA/g) ?? []).length
  const antes = llamadas()
  const { context, idExtension } = await abrirConExtension()
  try {
    const form = await context.newPage()
    await form.goto(FORM_B, { waitUntil: 'load' })
    const ayudante = await context.newPage()
    await ayudante.goto(`chrome-extension://${idExtension}/sidepanel.html`)
    const tabId = await pestanaDelFormulario(ayudante)
    await ayudante.close()
    const panel = await context.newPage()
    const urlPanel = `chrome-extension://${idExtension}/sidepanel.html?tab=${tabId}`
    const paso = (texto: string) => console.log(`${texto} — llamadas a la IA hasta ahora: ${llamadas() - antes}`)

    await panel.goto(urlPanel)
    await form.bringToFront()
    await panel.getByText('Completar esta página').waitFor({ timeout: 30_000 })
    paso('1. Panel abierto, respuestas visibles')

    await form.reload({ waitUntil: 'load' })
    await panel.waitForTimeout(3000)
    await panel.getByText('Completar esta página').waitFor({ timeout: 10_000 })
    paso('2. La persona recargó el formulario (F5)')

    await panel.reload()
    await form.bringToFront()
    await panel.getByText('Respuestas guardadas de antes').waitFor({ timeout: 10_000 })
    paso('3. Se cerró y se volvió a abrir el panel ("Respuestas guardadas de antes")')

    await form.waitForFunction(() => !document.querySelector('[role="listitem"] input[disabled], [role="listbox"][aria-disabled="true"]'), null, { timeout: 10_000 }).catch(() => {})
    await panel.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Completar esta página')!.click())
    await panel.waitForFunction(() => /quedaron bien|hay que mirarlas/.test(document.body.innerText), null, { timeout: 30_000 })
    await personaApretaSiguiente(form)
    await panel.getByText('Fechas y valoración').waitFor({ timeout: 15_000 })
    paso('4. Completó la página 1 y la persona pasó a la página 2')

    await panel.reload()
    await form.bringToFront()
    await panel.getByText('Respuestas guardadas de antes').waitFor({ timeout: 10_000 })
    paso('5. Se volvió a abrir el panel en la página 2')

    const total = llamadas() - antes
    console.log(`\nTotal: ${total} llamada(s) a la IA para el Formulario B → ${total === 1 ? 'OK (criterio 3)' : 'FALLA'}`)
    if (total !== 1) process.exitCode = 1
  } finally {
    await context.close()
  }
}

if (escenario === 'contenido-b') await contenidoB()
else if (escenario === 'una-llamada-b') await unaLlamadaB()
else if (escenario === 'panel-b') await panelB()
else if (escenario) throw new Error(`Escenario desconocido: ${escenario}`)
