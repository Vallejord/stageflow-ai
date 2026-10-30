// Propone respuestas para un formulario ya leído (T1) usando la ficha de la obra.
// Uso: npm run proponer -- <estructura.json> <ficha.json> [nombre]
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { proponerRespuestas } from '../lib/motor/proponer.ts'
import { ErrorIA } from '../lib/motor/ia/gemini.ts'

const [rutaEstructura, rutaFicha, nombreArg] = process.argv.slice(2)
if (!rutaEstructura || !rutaFicha) {
  console.error('Uso: npm run proponer -- <fixtures/x.estructura.json> <data/ficha.json> [nombre]')
  process.exit(1)
}
const estructura = JSON.parse(readFileSync(rutaEstructura, 'utf8'))
const ficha = JSON.parse(readFileSync(rutaFicha, 'utf8'))
const nombre = nombreArg || path.basename(rutaEstructura).replace(/\.estructura\.json$/, '')

const t0 = performance.now()
try {
  const r = await proponerRespuestas(estructura, ficha)
  const msTotal = Math.round(performance.now() - t0)
  const destino = path.join('fixtures', `${nombre}.respuestas.json`)
  writeFileSync(destino, JSON.stringify({ ...r, msTotal }, null, 2) + '\n', 'utf8')

  console.log(r.formulario + '\n')
  r.respuestas.forEach((p, i) => {
    const valor = p.respuesta == null ? '—' : typeof p.respuesta === 'string' ? p.respuesta : JSON.stringify(p.respuesta)
    const corto = valor.length > 70 ? valor.slice(0, 67) + '…' : valor
    console.log(`${String(i + 1).padStart(2)}. ${p.pregunta.slice(0, 45).padEnd(45)} │ ${corto}`)
    console.log(`    origen: ${p.origen}${p.campo ? ` (${p.campo})` : ''} │ revisar: ${p.revisar ? 'SÍ' : 'no'}${p.nota ? ` │ nota: ${p.nota.slice(0, 80)}` : ''}`)
    for (const m of p.motivos) console.log(`    ✖ ${m}`)
    for (const a of p.avisos) console.log(`    · ${a}`)
  })
  const n = (o: string) => r.respuestas.filter((p) => p.origen === o).length
  console.log(`\nResumen: ficha ${n('ficha')} · adaptado ${n('adaptado')} · propuesta IA ${n('propuesta_ia')} · sin dato ${n('sin_dato')} · archivo ${n('archivo_manual')} · a revisar ${r.respuestas.filter((p) => p.revisar).length}`)
  console.log(`Completo: ${r.completo ? 'sí' : `NO (faltan: ${r.faltantes.join('; ')})`}`)
  console.log(`Llamadas a la IA: ${r.llamadasIA} · tokens entrada ${r.tokens.entrada}, salida ${r.tokens.salida}, pensamiento ${r.tokens.pensamiento} · costo ≈ USD ${r.costoUSD.toFixed(5)}`)
  console.log(`Tiempo: IA ${r.msIA} ms · total ${msTotal} ms`)
  console.log(`Guardado en ${destino}`)
} catch (e) {
  if (e instanceof ErrorIA) {
    console.log(`ERROR: no se pudieron obtener las respuestas. ${e.message} (motivo: ${e.motivo})`)
    console.log('No se guardó ningún resultado.')
    process.exitCode = 2
  } else throw e
}
