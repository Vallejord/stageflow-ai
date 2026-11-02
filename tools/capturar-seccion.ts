// Guarda el HTML de la sección visible de un Google Form en fixtures/html/ (para las pruebas del completado).
// Solo abre y lee: no escribe en el formulario ni toca ningún botón.
// Uso: npm run capturar-seccion -- <link> <nombre>
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [url, nombre] = process.argv.slice(2)
if (!url || !nombre) {
  console.error('Uso: npm run capturar-seccion -- <link del formulario> <nombre>')
  process.exit(1)
}

const context = await chromium.launchPersistentContext(path.resolve('.browser-user-data'), {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 800 },
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
})

try {
  const page = context.pages()[0] || (await context.newPage())
  await page.goto(url, { waitUntil: 'load' })
  mkdirSync(path.join('fixtures', 'html'), { recursive: true })
  const destino = path.join('fixtures', 'html', `${nombre}.html`)
  writeFileSync(destino, await page.content(), 'utf8')
  console.log(`Guardado en ${destino}`)
} finally {
  await context.close()
}
