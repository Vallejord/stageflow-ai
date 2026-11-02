// T4 · Investigación del desplegable: ¿se puede cambiar un desplegable que ya trae un valor del borrador?
// Sin IA. Formulario B, pregunta "Provincia" (entry.474601466). Nunca toca "Siguiente", "Enviar" ni "Borrar".
//   A) Borrador real de Google: perfil con sesión (.browser-user-data, Chrome), el módulo corriendo en la página.
//   B) Extensión: script de contenido (contexto aislado), en el Chromium de Playwright.
// Uso: node tools/investigar-desplegable.ts
import { chromium, type Page } from 'playwright'
import path from 'node:path'
import type { Propuesta } from '../lib/motor/google-forms/respuestas.ts'
import { scriptCompletar } from './inyectar-completar.ts'
import { abrirConExtension, pedir, pestanaDelFormulario } from './probar-extension.ts'

const FORM_B = 'https://docs.google.com/forms/d/e/1FAIpQLSdB-Spfi_-8eemcSWvTf_1lakNyaaDpQuhY7V5EkIOWay6S0Q/viewform'
const ENTRY = 'entry.474601466'
const provincia = (valor: string): Propuesta => ({
  entry: ENTRY, pregunta: 'Provincia', tipo: 'desplegable', obligatoria: true, respuesta: valor,
  origen: 'ficha', campo: 'prueba', nota: null, revisar: false, motivos: [], avisos: [],
})
const valorVisible = (p: Page) =>
  p.evaluate((e) => {
    const item = [...document.querySelectorAll('[role="listitem"]')].find((li) => li.querySelector('[data-params]')?.getAttribute('data-params')?.includes(e.slice(6)))
    return item?.querySelector('[role="listbox"] [role="option"][aria-selected="true"]')?.getAttribute('data-value') ?? '(no encontrado)'
  }, ENTRY)
const listo = (p: Page) => p.waitForFunction(() => !document.querySelector('[role="listbox"][aria-disabled="true"]'), null, { timeout: 15_000 })
const filas: string[] = []
const anotar = (caso: string, accion: string, antes: string, despues: string, esperado: string) => {
  const ok = despues === esperado
  filas.push(`| ${caso} | ${accion} | ${antes || '(vacío)'} | ${despues || '(vacío)'} | ${ok ? '✅' : '❌'} |`)
  console.log(`${ok ? '✅' : '❌'} ${caso}: ${accion} — antes "${antes}", después "${despues}"`)
}

// ---------- A) Borrador real de Google ----------
{
  const context = await chromium.launchPersistentContext(path.resolve('.browser-user-data'), {
    channel: 'chrome', headless: false, viewport: null,
    ignoreDefaultArgs: ['--enable-automation'], args: ['--disable-blink-features=AutomationControlled'],
  })
  await context.addInitScript({ content: scriptCompletar() })
  const page = context.pages()[0] ?? (await context.newPage())
  const api = <T>(fn: string, arg?: unknown) => page.evaluate(([f, a]) => (window as any).__stageflowCompletar[f as string](a), [fn, arg] as const) as Promise<T>
  const recargar = async () => {
    await page.waitForTimeout(4000) // que Google guarde el borrador ("Guardando…")
    await page.goto(FORM_B, { waitUntil: 'load' })
    await listo(page)
    await page.waitForTimeout(1500)
  }
  try {
    await page.goto(FORM_B, { waitUntil: 'load' })
    await listo(page)
    await page.waitForTimeout(1500)
    // Preparación: que el borrador tenga "Córdoba" y que el valor venga de Google al cargar.
    if ((await valorVisible(page)) !== 'Córdoba') await api('completarSeccion', [provincia('Córdoba')])
    await recargar()
    const deGoogle = await valorVisible(page)
    console.log(`A) Al abrir, el borrador de Google trae: "${deGoogle}"`)
    let antes = deGoogle
    await api('completarSeccion', [provincia('Santa Cruz')])
    anotar('A · borrador real', 'cambiar a Santa Cruz', antes, await valorVisible(page), 'Santa Cruz')
    await recargar()
    anotar('A · borrador real', 'recargar: ¿Google guardó el cambio?', 'Santa Cruz', await valorVisible(page), 'Santa Cruz')
    antes = await valorVisible(page)
    await api('vaciarCampo', ENTRY)
    await page.waitForTimeout(800)
    anotar('A · borrador real', 'vaciar (opción "Elige")', antes, await valorVisible(page), '')
    await recargar()
    anotar('A · borrador real', 'recargar: ¿Google guardó el vacío?', '', await valorVisible(page), '')
  } finally {
    await context.close()
  }
}

// ---------- B) Desde la extensión (contexto aislado) ----------
{
  const { context, idExtension } = await abrirConExtension()
  try {
    const form = await context.newPage()
    await form.goto(FORM_B, { waitUntil: 'load' })
    const ext = await context.newPage()
    await ext.goto(`chrome-extension://${idExtension}/sidepanel.html?tab=-1`) // ayudante: ?tab=-1 para que el panel no pida respuestas
    const tab = await pestanaDelFormulario(ext)
    await form.bringToFront()
    await listo(form)
    await form.waitForTimeout(1500)
    for (const [accion, valor] of [['elegir Córdoba', 'Córdoba'], ['cambiar a Santa Cruz', 'Santa Cruz']] as const) {
      const antes = await valorVisible(form)
      const r = await pedir(ext, tab, { tipo: 'completar', propuestas: [provincia(valor)] })
      anotar('B · extensión', `${accion} (resultado del módulo: ${r.resultados[0].estado})`, antes, await valorVisible(form), valor)
    }
    const antes = await valorVisible(form)
    await pedir(ext, tab, { tipo: 'vaciar', entry: ENTRY })
    await form.waitForTimeout(800)
    anotar('B · extensión', 'vaciar (opción "Elige")', antes, await valorVisible(form), '')
  } finally {
    await context.close()
  }
}

console.log('\n| Caso | Acción | Antes | Después | |\n|---|---|---|---|---|\n' + filas.join('\n'))
