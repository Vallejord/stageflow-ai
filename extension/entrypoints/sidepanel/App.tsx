// Panel lateral de StageFlow (T4). Pregunta a la página cada 1,5 s cómo está y completa cuando la persona lo pide.
// Nunca aprieta botones del formulario: "Siguiente" y "Enviar" los aprieta la persona.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Pendiente, ResultadoCampo } from '../../../lib/motor/google-forms/completar.ts'
import type { Propuesta } from '../../../lib/motor/google-forms/respuestas.ts'
import type { EstadoPagina, Pedido, RespuestaContenido } from '../../lib/mensajes.ts'
import { respuestasDelFormulario, type Guardadas } from '../../lib/servidor.ts'

const REVISAR_CADA_MS = 1500

/** En el panel real, la pestaña activa de esta ventana; en las pruebas, la que viene en ?tab=. */
async function pestanaActual(): Promise<number | null> {
  const deLaUrl = new URLSearchParams(location.search).get('tab')
  if (deLaUrl) return Number(deLaUrl)
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

const pedir = (tabId: number, p: Pedido) => browser.tabs.sendMessage(tabId, p) as Promise<RespuestaContenido>

const ORIGEN: Record<Propuesta['origen'], string> = {
  ficha: 'De tu ficha',
  adaptado: 'De tu ficha, adaptado: revisalo',
  propuesta_ia: 'Propuesta, revisala',
  sin_dato: 'Sin dato',
  archivo_manual: 'Lo subís vos',
}

function textoRespuesta(p: Propuesta): string {
  const r = p.respuesta
  if (r == null) return '—'
  if (typeof r === 'string') return r
  if (Array.isArray(r)) return r.join(', ')
  return Object.entries(r).map(([fila, v]) => `${fila}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')
}

const entryDe = (p: Propuesta) => p.entry ?? p.filas?.[0]?.entry ?? null

interface Tarea {
  clave: string
  texto: string
  hecho: boolean
}

function tareasDe(pendientes: Pendiente[], propuestas: Propuesta[], resultados: ResultadoCampo[], estado: EstadoPagina): Tarea[] {
  const corto = (s: string) => (s.length > 80 ? s.slice(0, 77) + '…' : s)
  const tareas: Tarea[] = pendientes.map((p) => {
    const nota = propuestas.find((x) => x.entry === p.entry)?.nota
    return {
      clave: p.entry,
      hecho: p.hecho,
      texto: p.tipo === 'confirmacion' ? `Leé las bases y respondé vos: «${corto(p.pregunta)}»` : `Subí el archivo en «${corto(p.pregunta)}»${nota ? `. Sugerido: ${nota}` : ''}`,
    }
  })
  // Desplegables que no se dejaron cambiar: los elige la persona.
  for (const r of resultados.filter((x) => x.tipo === 'desplegable' && x.estado === 'distinto')) {
    const ahora = estado.seccion.campos.find((c) => c.entry === r.entry)?.valor
    tareas.push({ clave: `desplegable:${r.entry}`, hecho: ahora === r.esperado, texto: `Elegí «${r.esperado}» en «${corto(r.pregunta)}» (no se pudo cambiar solo)` })
  }
  return tareas
}

export function App() {
  const abierto = useRef(performance.now())
  const [tabId, setTabId] = useState<number | null>(null)
  const [estado, setEstado] = useState<EstadoPagina | null>(null)
  const [sinFormulario, setSinFormulario] = useState(false)
  const [respuestas, setRespuestas] = useState<{ guardadas: Guardadas; deLaMemoria: boolean; segundos: number } | null>(null)
  const [errorRespuestas, setErrorRespuestas] = useState<string | null>(null)
  const [pidiendo, setPidiendo] = useState(false)
  const [completando, setCompletando] = useState(false)
  const [resultados, setResultados] = useState<{ firma: string; lista: ResultadoCampo[] } | null>(null)
  const fallos = useRef(0)

  useEffect(() => {
    pestanaActual().then(setTabId)
    const cambio = () => pestanaActual().then((id) => (setTabId(id), setEstado(null)))
    browser.tabs.onActivated.addListener(cambio)
    return () => browser.tabs.onActivated.removeListener(cambio)
  }, [])

  // Preguntarle a la página cómo está.
  const propuestas = respuestas?.guardadas.propuestas
  const revisar = useCallback(async () => {
    if (tabId == null) return
    try {
      const r = await pedir(tabId, { tipo: 'leer', propuestas })
      if (!r?.ok || !('estado' in r)) throw new Error('sin respuesta')
      fallos.current = 0
      setSinFormulario(false)
      setEstado(r.estado)
    } catch {
      // Mientras la página navega (después de "Siguiente") no contesta: recién después de 2 fallos seguidos se avisa.
      if (++fallos.current >= 2) (setSinFormulario(true), setEstado(null))
    }
  }, [tabId, propuestas])

  useEffect(() => {
    revisar()
    const t = setInterval(revisar, REVISAR_CADA_MS)
    return () => clearInterval(t)
  }, [revisar])

  // Página nueva: el panel vuelve arriba (para que se vean el título y, si es la última, el cartel de "Enviar").
  const firma = estado?.seccion.firma
  useEffect(() => {
    window.scrollTo(0, 0) // sin devolver nada: React tomaría lo que devuelve como función de limpieza
  }, [firma])

  // Pedir las respuestas una sola vez por formulario (después quedan guardadas).
  const pedirRespuestas = useCallback(async () => {
    if (!estado?.formId || !estado.estructura.ok) return
    setPidiendo(true)
    setErrorRespuestas(null)
    const r = await respuestasDelFormulario(estado.formId, estado.estructura)
    setPidiendo(false)
    if (r.ok) setRespuestas({ guardadas: r.guardadas, deLaMemoria: r.deLaMemoria, segundos: (performance.now() - abierto.current) / 1000 })
    else setErrorRespuestas(r.mensaje)
  }, [estado?.formId, estado?.estructura])

  useEffect(() => {
    if (estado?.estructura.ok && !respuestas && !pidiendo && !errorRespuestas) pedirRespuestas()
  }, [estado, respuestas, pidiendo, errorRespuestas, pedirRespuestas])

  async function completar() {
    if (tabId == null || !propuestas || !estado) return
    setCompletando(true)
    try {
      const r = await pedir(tabId, { tipo: 'completar', propuestas })
      if (r?.ok && 'resultados' in r) setResultados({ firma: estado.seccion.firma, lista: r.resultados })
    } finally {
      setCompletando(false)
      revisar()
    }
  }

  // ---------- Pantallas ----------
  const aviso = <p className="aviso">Si cerrás el formulario, Google no guarda los archivos: vas a tener que subirlos de nuevo.</p>

  if (sinFormulario || tabId == null)
    return (
      <main>
        <h1>StageFlow</h1>
        <p className="vacio">No vemos un formulario de Google Forms en esta pestaña.</p>
        <p className="nota">
          Abrí el link de la convocatoria. <strong>Si Google te pide iniciar sesión</strong>, iniciá sesión con tu cuenta: el formulario se abre solo y
          StageFlow sigue desde ahí.
        </p>
      </main>
    )
  if (!estado) return <main><h1>StageFlow</h1><p className="nota">Mirando la página…</p></main>
  if (!estado.estructura.ok)
    return (
      <main>
        <h1>StageFlow</h1>
        <p className="error">{estado.estructura.motivo === 'requiere_login' ? 'Este formulario pide que inicies sesión en Google. Iniciá sesión y volvé a abrirlo.' : 'Esta página no es un formulario que StageFlow pueda completar.'}</p>
      </main>
    )

  const s = estado.seccion
  const enPagina = (propuestas ?? []).filter((p) => s.campos.some((c) => c.entries.includes(entryDe(p) ?? '')))
  const deEstaPagina = resultados?.firma === s.firma ? resultados.lista : []
  const resultadoDe = (p: Propuesta) => deEstaPagina.find((r) => r.entry === entryDe(p))
  const tareas = propuestas ? tareasDe(estado.pendientes, propuestas, deEstaPagina, estado) : []
  const completables = deEstaPagina.filter((r) => r.estado)
  const bien = completables.filter((r) => r.estado === 'ok').length
  const ultima = s.hayEnviar && !s.haySiguiente
  const tituloSeccion = s.titulo.split(' / ').slice(1).join(' / ') || 'Primera página'

  return (
    <main>
      <h1>StageFlow</h1>
      <p className="formulario">{estado.estructura.titulo}</p>
      {aviso}

      {pidiendo && <p className="nota">Preparando las respuestas con los datos de tu obra… (puede tardar unos 15 segundos)</p>}
      {errorRespuestas && (
        <div className="error">
          <p>{errorRespuestas}</p>
          <button onClick={() => setErrorRespuestas(null)}>Probar de nuevo</button>
        </div>
      )}

      {propuestas && (
        <>
          <h2>{tituloSeccion}</h2>
          {ultima && <p className="final">Última página. Revisá todo y apretá «Enviar» vos.</p>}

          {tareas.length > 0 && (
            <section className="tareas">
              <h3>Lo que tenés que hacer vos</h3>
              <ul>
                {tareas.map((t) => (
                  <li key={t.clave} className={t.hecho ? 'hecho' : ''}>{t.hecho ? '✓ ' : '○ '}{t.texto}</li>
                ))}
              </ul>
            </section>
          )}

          <button className="principal" onClick={completar} disabled={completando}>
            {completando ? 'Completando…' : 'Completar esta página'}
          </button>
          {resultados?.firma === s.firma && completables.length === 0 && (
            <p className="nota">En esta página no había nada para completar con los datos de tu ficha.</p>
          )}
          {completables.length > 0 && (
            <p className={bien === completables.length ? 'ok' : 'error'}>
              {bien === completables.length ? `Listo: las ${bien} respuestas quedaron bien.` : `${completables.length - bien} de ${completables.length} respuestas hay que mirarlas.`}
              {!ultima && tareas.every((t) => t.hecho) && ' Cuando quieras, apretá «Siguiente» en el formulario.'}
            </p>
          )}

          <ul className="preguntas">
            {enPagina.map((p) => {
              const r = resultadoDe(p)
              return (
                <li key={entryDe(p)}>
                  <p className="pregunta">{p.pregunta}</p>
                  {p.origen !== 'archivo_manual' && <p className="respuesta">{textoRespuesta(p)}</p>}
                  <p className="origen">
                    {ORIGEN[p.origen]}
                    {r?.estado === 'ok' && <span className="ok"> · Quedó bien</span>}
                    {r?.estado && r.estado !== 'ok' && <span className="error"> · Miralo: quedó distinto</span>}
                  </p>
                </li>
              )
            })}
          </ul>

          <p className="pie">
            {respuestas!.deLaMemoria ? 'Respuestas guardadas de antes (sin volver a preguntar).' : `Respuestas listas en ${respuestas!.segundos.toFixed(1)} s.`}
          </p>
        </>
      )}
    </main>
  )
}
