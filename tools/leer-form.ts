// Lee la estructura de un Google Form con la sesión guardada y la guarda en fixtures/.
// Solo abre y lee: no escribe en el formulario ni toca ningún botón.
// Uso: npm run leer-form -- <link> [nombre] [--perfil-vacio]
//   --perfil-vacio: usa un navegador sin sesión (para probar el aviso de inicio de sesión).
import { chromium } from 'playwright'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { leerEstructura } from '../lib/motor/google-forms/estructura.ts'

const args = process.argv.slice(2)
const perfilVacio = args.includes('--perfil-vacio')
const [url, nombreArg] = args.filter((a) => !a.startsWith('--'))
if (!url) {
  console.error('Uso: npm run leer-form -- <link del formulario> [nombre] [--perfil-vacio]')
  process.exit(1)
}
const nombre = nombreArg || 'form'
const perfil = perfilVacio ? mkdtempSync(path.join(tmpdir(), 'stageflow-sin-sesion-')) : path.resolve('.browser-user-data')

const context = await chromium.launchPersistentContext(perfil, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 800 },
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
})

try {
  const page = context.pages()[0] || (await context.newPage())
  await page.goto(url, { waitUntil: 'load' })
  const t0 = performance.now() // la página terminó de cargar

  const html = await page.content()
  const resultado = leerEstructura(html)
  const ms = Math.round(performance.now() - t0)

  if (!resultado.ok) {
    console.log(`AVISO: ${resultado.mensaje} (motivo: ${resultado.motivo})`)
    console.log(`Tiempo desde que cargó la página: ${ms} ms`)
    process.exitCode = 2
  } else {
    mkdirSync('fixtures', { recursive: true })
    const scriptDatos = await page.evaluate(
      () => [...document.scripts].find((s) => s.textContent?.includes('FB_PUBLIC_LOAD_DATA_'))?.textContent ?? '',
    )
    writeFileSync(path.join('fixtures', `${nombre}.script.txt`), scriptDatos, 'utf8')
    writeFileSync(path.join('fixtures', `${nombre}.estructura.json`), JSON.stringify(resultado, null, 2) + '\n', 'utf8')

    console.log(`${resultado.titulo}`)
    console.log(`Requiere iniciar sesión: ${resultado.requiereLogin ? 'sí' : 'no'}`)
    resultado.secciones.forEach((s, i) => {
      console.log(`\nSección ${i + 1}: ${s.titulo}`)
      for (const p of s.preguntas) {
        const extra = [
          p.obligatoria ? 'obligatoria' : 'opcional',
          p.entry ?? (p.filas ? `${p.filas.length} filas` : 'sin entry'),
          ...p.validaciones.map((v) => v.tipo + ('valor' in v ? ` ${v.valor}` : '')),
          p.opciones ? `opciones: ${p.opciones.join(' / ')}` : '',
        ].filter(Boolean)
        console.log(`  - [${p.tipo}] ${p.titulo.slice(0, 70)}${p.titulo.length > 70 ? '…' : ''}  (${extra.join(', ')})`)
      }
    })
    console.log(`\nTotal: ${resultado.totalPreguntas} preguntas en ${resultado.secciones.length} secciones. No soportadas: ${resultado.noSoportadas.length ? resultado.noSoportadas.join('; ') : 'ninguna'}`)
    console.log(`Guardado en fixtures/${nombre}.estructura.json`)
    console.log(`Tiempo desde que cargó la página: ${ms} ms`)
  }
} finally {
  await context.close()
}
