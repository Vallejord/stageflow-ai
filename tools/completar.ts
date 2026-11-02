// Recorrido de punta a punta (T3): abre el formulario con la sesión guardada, propone respuestas (1 llamada a la IA)
// o usa un archivo guardado, completa y verifica sección por sección, pausa para la persona y frena en "Enviar".
// NUNCA hace clic en "Enviar" ni en "Borrar formulario": el único clic sobre botones es clicSiguiente().
// Uso: npm run completar -- <link> <nombre> [--respuestas <archivo>] [--vaciar <entry>] [--cerrar]
//   --respuestas: usa ese archivo en lugar de llamar a la IA.
//   --vaciar: deja vacía a propósito esa pregunta (prueba de bloqueo).
//   --cerrar: cierra el navegador al terminar (si no, queda abierto en la última página).
import { chromium, type Page } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { leerEstructura } from '../lib/motor/google-forms/estructura.ts'
import type { Propuesta } from '../lib/motor/google-forms/respuestas.ts'
import type { LecturaSeccion, Pendiente, ResultadoCampo } from '../lib/motor/google-forms/completar.ts'
import { proponerRespuestas } from '../lib/motor/proponer.ts'
import { ErrorIA } from '../lib/motor/ia/gemini.ts'
import { scriptCompletar } from './inyectar-completar.ts'

const args = process.argv.slice(2)
const opcion = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined)
const rutaRespuestas = opcion('--respuestas')
const vaciar = opcion('--vaciar')
const cerrar = args.includes('--cerrar')
const [url, nombre] = args.filter((a, i) => !a.startsWith('--') && !['--respuestas', '--vaciar'].includes(args[i - 1]))
if (!url || !nombre) {
  console.error('Uso: npm run completar -- <link> <nombre> [--respuestas <archivo>] [--vaciar <entry>] [--cerrar]')
  process.exit(1)
}

const ESPERA_PERSONA_MS = 10 * 60_000
const REVISAR_CADA_MS = 3_000
const ESPERA_AVANCE_MS = 6_000
const DIR = path.join('fixtures', 't3')
mkdirSync(DIR, { recursive: true })
const DIR_HTML = path.join(DIR, 'html') // HTML de cada sección de la corrida (evidencia; las pruebas usan copias fijas en fixtures/html/)
mkdirSync(DIR_HTML, { recursive: true })

const t0 = performance.now()
let msEsperandoPersona = 0
const registro: { ms: number; evento: string }[] = []
const anotar = (evento: string) => {
  registro.push({ ms: Math.round(performance.now() - t0), evento })
  console.log(`[${(registro.at(-1)!.ms / 1000).toFixed(1)} s] ${evento}`)
}

const api = <T>(page: Page, fn: string, arg?: unknown): Promise<T> =>
  page.evaluate(([f, a]) => (window as any).__stageflowCompletar[f as string](a), [fn, arg] as const) as Promise<T>

/**
 * Espera a que el JS de Google habilite los campos (en la página recién cargada vienen deshabilitados).
 * Se ignoran las copias de las cuadrículas, que quedan deshabilitadas y sin valor para siempre.
 */
const DESHABILITADOS = ['input[disabled]', 'textarea[disabled]', '[role="listbox"][aria-disabled="true"]', '[aria-disabled="true"][data-value]:not([data-value=""])', '[aria-disabled="true"][data-answer-value]']
  .map((s) => `[role="listitem"] ${s}`)
  .join(', ')
const esperarListo = (page: Page) =>
  page
    .waitForFunction((sel) => !!(window as any).__stageflowCompletar && !document.querySelector(sel), DESHABILITADOS, { timeout: 10_000 })
    .catch(() => anotar('aviso: algunos campos siguen deshabilitados después de 10 s'))

/** Único clic sobre un botón del formulario. Solo "Siguiente"/"Next"; cualquier otro texto es un error. */
async function clicSiguiente(page: Page) {
  const boton = page.locator('[role="button"]').filter({ hasText: /^\s*(Siguiente|Next)\s*$/ })
  if ((await boton.count()) !== 1) throw new Error(`Se esperaba un único botón "Siguiente" y hay ${await boton.count()}`)
  const texto = ((await boton.textContent()) ?? '').trim()
  if (/enviar|submit|borrar|clear/i.test(texto) || !/^(Siguiente|Next)$/.test(texto)) throw new Error(`Clic bloqueado: el botón dice "${texto}"`)
  anotar(`clic en "${texto}"`)
  await boton.click()
}

const leerSeguro = async (page: Page): Promise<LecturaSeccion | null> => {
  try {
    return await api<LecturaSeccion>(page, 'leerSeccion')
  } catch {
    return null // la página está navegando
  }
}

/** Lo que tiene que hacer la persona: lo del módulo más los desplegables que no se dejaron cambiar. */
type PendienteRecorrido = Omit<Pendiente, 'tipo'> & { tipo: Pendiente['tipo'] | 'desplegable'; valor?: string }

function instruccion(p: PendienteRecorrido, propuestas: Propuesta[]): string {
  const prop = propuestas.find((x) => x.entry === p.entry)
  // Con un valor previo del borrador, el desplegable de Google no responde a eventos desde la página (ver T3).
  if (p.tipo === 'desplegable') return `Elegí "${p.valor}" en el desplegable "${p.pregunta.slice(0, 90)}" (no se pudo cambiar solo)`
  if (p.tipo === 'confirmacion') return `Leé las bases y respondé vos: "${p.pregunta.slice(0, 90)}"`
  return `Subí el archivo en "${p.pregunta.slice(0, 90)}"${prop?.nota ? ` — sugerido: ${prop.nota}` : ''}`
}

const context = await chromium.launchPersistentContext(path.resolve('.browser-user-data'), {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 900 },
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
})
await context.addInitScript({ content: scriptCompletar() })

let codigoSalida = 0
/** Corte controlado (sin process.exit, que en Windows falla con libuv). */
class Corte extends Error {
  codigo: number
  constructor(mensaje: string, codigo: number) {
    super(mensaje)
    this.codigo = codigo
  }
}
try {
  const page = context.pages()[0] || (await context.newPage())
  await page.goto(url, { waitUntil: 'load' })
  anotar('formulario abierto')

  const estructura = leerEstructura(await page.content())
  if (!estructura.ok) {
    throw new Corte(`AVISO: ${estructura.mensaje}`, 2)
  }

  // Respuestas: archivo guardado o una llamada a la IA.
  let propuestas: Propuesta[]
  let ia = { llamadas: 0, tokens: { entrada: 0, salida: 0, pensamiento: 0 }, costoUSD: 0, ms: 0 }
  if (rutaRespuestas) {
    propuestas = JSON.parse(readFileSync(rutaRespuestas, 'utf8')).respuestas
    anotar(`respuestas leídas de ${rutaRespuestas} (sin IA)`)
  } else {
    const ficha = JSON.parse(readFileSync('data/obra-demo.json', 'utf8'))
    try {
      const r = await proponerRespuestas(estructura, ficha)
      ia = { llamadas: r.llamadasIA, tokens: r.tokens, costoUSD: r.costoUSD, ms: r.msIA }
      if (!r.completo) throw new ErrorIA('respuesta_invalida', `La IA omitió preguntas: ${r.faltantes.join('; ')}`)
      propuestas = r.respuestas
      writeFileSync(path.join(DIR, `${nombre}.respuestas.json`), JSON.stringify(r, null, 2) + '\n', 'utf8')
      anotar(`respuestas propuestas por la IA (1 llamada, ${(r.msIA / 1000).toFixed(1)} s, USD ${r.costoUSD.toFixed(4)})`)
    } catch (e) {
      if (e instanceof ErrorIA) {
        throw new Corte(`ERROR: no se pudieron obtener las respuestas. ${e.message}. No se completó nada.`, 2)
      }
      throw e
    }
  }
  if (vaciar) {
    propuestas = propuestas.map((p) => (p.entry === vaciar ? { ...p, respuesta: null, origen: 'sin_dato' as const } : p))
    anotar(`prueba de bloqueo: ${vaciar} queda vacía a propósito`)
  }

  const filas: (ResultadoCampo & { pagina: number })[] = []
  const pendientesPersona: (PendienteRecorrido & { pagina: number })[] = []
  let pausas = 0
  let bloqueo: { pregunta: string; error: string; msDetectado: number }[] | null = null
  let llegoAEnviar = false

  for (let pagina = 1; pagina <= 50; pagina++) {
    await esperarListo(page)
    const lectura = (await leerSeguro(page))!
    anotar(`página ${pagina}: ${lectura.titulo || '(sin título)'} — ${lectura.campos.length} preguntas`)
    writeFileSync(path.join(DIR_HTML, `${nombre}-p${pagina}.html`), await page.content(), 'utf8')

    if (vaciar && lectura.campos.some((c) => c.entries.includes(vaciar))) await api(page, 'vaciarCampo', vaciar)
    let resultados = await api<ResultadoCampo[]>(page, 'completarSeccion', propuestas)
    const trabados = resultados.filter((r) => r.tipo === 'desplegable' && r.estado === 'distinto')
    const revisarPendientes = async (): Promise<PendienteRecorrido[]> => {
      const delModulo = await api<Pendiente[]>(page, 'estadoPendientes', propuestas)
      if (!trabados.length) return delModulo
      const s = await leerSeguro(page)
      const valor = (entry: string) => s?.campos.find((c) => c.entry === entry)?.valor
      return [...delModulo, ...trabados.map((r) => ({ entry: r.entry, pregunta: r.pregunta, tipo: 'desplegable' as const, valor: r.esperado, hecho: valor(r.entry) === r.esperado }))]
    }

    // Pausa para la persona: archivos obligatorios sin subir, confirmaciones sin responder o desplegables trabados.
    let pendientes = await revisarPendientes()
    if (pendientes.some((p) => !p.hecho)) {
      pausas++
      const tPausa = performance.now()
      anotar(`PAUSA — falta que hagas esto en la ventana del navegador:`)
      for (const p of pendientes.filter((x) => !x.hecho)) console.log(`   → ${instruccion(p, propuestas)}`)
      while (pendientes.some((p) => !p.hecho) && performance.now() - tPausa < ESPERA_PERSONA_MS) {
        await page.waitForTimeout(REVISAR_CADA_MS)
        pendientes = await revisarPendientes()
      }
      msEsperandoPersona += performance.now() - tPausa
      if (pendientes.some((p) => !p.hecho)) {
        anotar('pasaron 10 minutos sin que se completara lo pendiente: se corta el recorrido')
        codigoSalida = 4
        pendientesPersona.push(...pendientes.map((p) => ({ ...p, pagina })))
        filas.push(...resultados.map((r) => ({ ...r, pagina })))
        break
      }
      anotar('listo lo de la persona, sigo')
      resultados = await api<ResultadoCampo[]>(page, 'completarSeccion', propuestas) // volver a verificar
    }
    pendientesPersona.push(...pendientes.map((p) => ({ ...p, pagina })))
    filas.push(...resultados.map((r) => ({ ...r, pagina })))
    writeFileSync(path.join(DIR_HTML, `${nombre}-p${pagina}-completa.html`), await page.content(), 'utf8')

    if (lectura.hayEnviar && !lectura.haySiguiente) {
      llegoAEnviar = true
      anotar('última página: "Enviar" visible. No se aprieta.')
      await page.locator('[role="button"]').filter({ hasText: /^\s*(Enviar|Submit)\s*$/ }).scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(DIR, `${nombre}-final.png`), fullPage: true })
      break
    }

    // Avanzar y comprobar por la firma de la sección (no por la URL).
    const tClic = performance.now()
    await clicSiguiente(page)
    let nueva: LecturaSeccion | null = null
    while (performance.now() - tClic < ESPERA_AVANCE_MS) {
      await page.waitForTimeout(250)
      nueva = await leerSeguro(page)
      if (nueva && nueva.firma !== lectura.firma) break
      // Misma sección con mensaje de error de Google: no avanzó, no hace falta esperar más.
      if (nueva && nueva.campos.some((c) => c.error) && performance.now() - tClic > 750) break
    }
    if (!nueva || nueva.firma === lectura.firma) {
      const ms = Math.round(performance.now() - tClic)
      const conError = (nueva ?? lectura).campos.filter((c) => c.error)
      bloqueo = conError.map((c) => ({ pregunta: c.titulo, error: c.error, msDetectado: ms }))
      anotar(`"Siguiente" no avanzó (detectado en ${(ms / 1000).toFixed(1)} s). Bloquea: ${conError.map((c) => `"${c.titulo}" (${c.error})`).join('; ') || 'sin mensaje de error de Google'}`)
      codigoSalida = 3
      break
    }
  }

  // ---------- Informe ----------
  const msTotal = performance.now() - t0
  const msSinPersona = Math.round(msTotal - msEsperandoPersona)
  const completados = filas.filter((f) => f.accion === 'completar')
  const ok = completados.filter((f) => f.estado === 'ok')
  const malos = completados.filter((f) => f.estado !== 'ok')
  const aRevisar = propuestas.filter((p) => p.revisar && p.origen !== 'archivo_manual').length
  const resumen = {
    formulario: estructura.titulo,
    llegoAEnviar,
    bloqueo,
    completadosYVerificados: ok.length,
    completados: completados.length,
    distintosONoEncontrados: malos.map((f) => ({ pagina: f.pagina, pregunta: f.pregunta, esperado: f.esperado, leido: f.leido, estado: f.estado })),
    aRevisar,
    sinDato: filas.filter((f) => f.accion === 'sin_dato').map((f) => f.pregunta),
    pendientesPersona: pendientesPersona.map((p) => ({ pagina: p.pagina, pregunta: p.pregunta, tipo: p.tipo, hecho: p.hecho })),
    pausas,
    llamadasIA: ia.llamadas,
    tokens: ia.tokens,
    costoUSD: ia.costoUSD,
    msIA: ia.ms,
    msTotal: Math.round(msTotal),
    msEsperandoPersona: Math.round(msEsperandoPersona),
    msSinPersona,
    clicsEnBotones: registro.filter((r) => r.evento.startsWith('clic')).map((r) => r.evento),
  }

  const celda = (s: string) => (s.length > 60 ? s.slice(0, 57) + '…' : s).replace(/\|/g, '/').replace(/\n/g, ' ')
  const md = [
    `# Informe T3 — ${nombre}`,
    '',
    `Formulario: ${estructura.titulo}`,
    '',
    '| Pág. | Pregunta | Acción | Esperado | Leído | Estado |',
    '|---|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.pagina} | ${celda(f.pregunta)} | ${f.accion} | ${celda(f.esperado)} | ${celda(f.leido)} | ${f.estado ? (f.estado === 'ok' ? '✅ ok' : `❌ ${f.estado}`) : '—'} |`),
    '',
    '## Resumen',
    `- Llegó a "Enviar" (sin apretarlo): ${llegoAEnviar ? 'sí' : 'no'}`,
    ...(bloqueo ? [`- Bloqueo en "Siguiente": ${bloqueo.map((b) => `"${b.pregunta}" — ${b.error}`).join('; ') || 'sin mensaje'} (detectado en ${((bloqueo[0]?.msDetectado ?? 0) / 1000).toFixed(1)} s)`] : []),
    `- Completados y verificados: ${ok.length} de ${completados.length}${malos.length ? ` — ${malos.length} con problemas` : ''}`,
    `- A revisar por la persona (propuestas, adaptados o sin dato): ${aRevisar}`,
    `- Pendientes de la persona: ${pendientesPersona.length} (${pendientesPersona.filter((p) => p.hecho).length} hechos) · pausas: ${pausas}`,
    `- Llamadas a la IA: ${ia.llamadas} · tokens entrada ${ia.tokens.entrada}, salida ${ia.tokens.salida} · costo ≈ USD ${ia.costoUSD.toFixed(5)}`,
    `- Tiempo: total ${(msTotal / 1000).toFixed(1)} s · esperando a la persona ${(msEsperandoPersona / 1000).toFixed(1)} s · sin contar la espera ${(msSinPersona / 1000).toFixed(1)} s`,
    `- Clics en botones: ${resumen.clicsEnBotones.length} (${[...new Set(resumen.clicsEnBotones)].join(', ') || 'ninguno'})`,
    '',
    '## Registro',
    ...registro.map((r) => `- ${(r.ms / 1000).toFixed(1)} s — ${r.evento}`),
    '',
  ].join('\n')
  writeFileSync(path.join(DIR, `${nombre}.informe.md`), md, 'utf8')
  writeFileSync(path.join(DIR, `${nombre}.informe.json`), JSON.stringify({ resumen, filas, registro }, null, 2) + '\n', 'utf8')
  console.log('\n' + md)
  console.log(`Guardado en ${path.join(DIR, `${nombre}.informe.md`)}`)
  if (!codigoSalida && malos.length) codigoSalida = 5

  if (!cerrar) {
    console.log('El navegador queda abierto. Revisá y, si querés, apretá "Enviar" vos. Cerrá la ventana para terminar.')
    await context.waitForEvent('close', { timeout: 0 })
  }
} catch (e) {
  if (!(e instanceof Corte)) throw e
  console.log(e.message)
  codigoSalida = e.codigo
} finally {
  await context.close().catch(() => {})
  process.exitCode = codigoSalida
}
