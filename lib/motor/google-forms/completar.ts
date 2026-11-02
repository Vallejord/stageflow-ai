/**
 * Completado de la sección visible de un Google Form (T3).
 * Corre DENTRO de la página: solo DOM, sin Node ni Playwright, para reutilizarlo en la extensión.
 * Sin imports de valores (solo tipos): el recorrido lo inyecta en la página quitándole los tipos.
 *
 * DOM de Google Forms (visto en fixtures/html/):
 * - pregunta: [role=listitem] con [data-params] = "%.@.[id, título, ayuda, tipo, [[entry, opciones, obligatoria, ...], ...]], ...]"
 * - casillas: [role=checkbox][data-answer-value]; opción y escala: [role=radio][data-value]
 * - desplegable: [role=listbox] con [role=option][data-value]
 * - texto: input / textarea; error de la pregunta: [role=alert]
 * Regla: nunca se hace clic en botones del formulario ("Siguiente", "Enviar", "Borrar"); eso lo decide el recorrido.
 */
import type { Propuesta } from './respuestas.ts'

export type EstadoCampo = 'ok' | 'distinto' | 'no_encontrado'
export type Accion = 'completar' | 'sin_dato' | 'archivo_manual' | 'confirmacion_humana'

export interface ResultadoCampo {
  entry: string
  pregunta: string
  tipo: Propuesta['tipo']
  accion: Accion
  esperado: string
  leido: string
  /** null si no se completa (sin dato, archivo, confirmación). */
  estado: EstadoCampo | null
}

export interface CampoVisible {
  /** entry de la pregunta (en cuadrículas, el de la primera fila). */
  entry: string
  entries: string[]
  titulo: string
  codigoTipo: number
  obligatoria: boolean
  valor: string
  error: string
}

export interface LecturaSeccion {
  titulo: string
  /** Firma para saber si se avanzó de página: título + entries visibles. */
  firma: string
  campos: CampoVisible[]
  haySiguiente: boolean
  hayEnviar: boolean
}

export interface Pendiente {
  entry: string
  pregunta: string
  tipo: 'archivo' | 'confirmacion'
  hecho: boolean
}

// Aceptación de bases, términos o declaraciones juradas: son del artista, nunca las tilda el sistema.
const CONFIRMACION =
  /\b(he le[ií]do|acepto|aceptar|declaro|declaraci[oó]n jurada|t[eé]rminos y condiciones|conformidad|i have read|i agree|i accept|i declare|terms and conditions)\b/i

export function esConfirmacionHumana(titulo: string): boolean {
  return CONFIRMACION.test(titulo)
}

export function accionPara(p: Pick<Propuesta, 'tipo' | 'origen' | 'pregunta'>): Accion {
  if (p.tipo === 'archivo' || p.origen === 'archivo_manual') return 'archivo_manual'
  if (esConfirmacionHumana(p.pregunta)) return 'confirmacion_humana'
  if (p.origen === 'sin_dato') return 'sin_dato'
  return 'completar'
}

// ---------- Lectura ----------

const espacios = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').trim()

function datosDe(item: Element): unknown[] | null {
  const raw = item.querySelector('[data-params]')?.getAttribute('data-params')
  if (!raw || !raw.startsWith('%.@.')) return null
  try {
    const d = JSON.parse('[' + raw.slice(4))
    return Array.isArray(d[0]) ? d[0] : null
  } catch {
    return null
  }
}

interface Item {
  el: Element
  entries: string[]
  titulo: string
  codigoTipo: number
  obligatoria: boolean
}

function itemsVisibles(doc: Document): Item[] {
  const items: Item[] = []
  for (const el of doc.querySelectorAll('[role="listitem"]')) {
    const d = datosDe(el)
    if (!d) continue
    const campos = (Array.isArray(d[4]) ? d[4] : []) as unknown[][]
    const entries = campos.map((c) => `entry.${c[0]}`)
    if (!entries.length) continue
    items.push({
      el,
      entries,
      titulo: String(d[1] ?? ''),
      codigoTipo: Number(d[3]),
      obligatoria: campos.length > 0 && campos.every((c) => c[2] === true || c[2] === 1),
    })
  }
  return items
}

const textos = (item: Element) => [...item.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input:not([type="hidden"])')]
const marcados = (els: Element[], attr: string) =>
  els.filter((e) => e.getAttribute('aria-checked') === 'true').map((e) => e.getAttribute(attr) ?? '')

/** Filas de una cuadrícula, en orden: cada una con sus radios o casillas. */
function filasCuadricula(item: Element): Element[][] {
  const grupos = [...item.querySelectorAll('[role="radiogroup"], [role="group"]')].filter(
    (g) => g.querySelector('[role="radio"], [role="checkbox"]') && !g.querySelector('[role="radiogroup"], [role="group"]'),
  )
  return grupos.map((g) => [...g.querySelectorAll('[role="radio"], [role="checkbox"]')])
}

const valorOpcion = (e: Element) => e.getAttribute('data-value') ?? e.getAttribute('data-answer-value') ?? ''

/** Valor que se ve hoy en la pregunta, como texto comparable. */
function leerValor(item: Item): string {
  const el = item.el
  const radios = [...el.querySelectorAll('[role="radio"]')]
  const casillas = [...el.querySelectorAll('[role="checkbox"]')]
  switch (item.codigoTipo) {
    case 7: // cuadrícula
      return filasCuadricula(el)
        .map((fila) => fila.filter((e) => e.getAttribute('aria-checked') === 'true').map(valorOpcion).join(' + '))
        .join(' | ')
    case 3: { // desplegable
      const sel = el.querySelector('[role="listbox"] [role="option"][aria-selected="true"]')
      return sel?.getAttribute('data-value') ?? ''
    }
    case 4: // casillas
      return marcados(casillas, 'data-answer-value').join(' + ')
    case 2: // opción múltiple
    case 5: // escala
      return marcados(radios, 'data-value').join(' + ')
    case 10: // hora: horas y minutos en campos separados
      return textos(el).map((i) => i.value).filter(Boolean).join(':')
    default:
      return textos(el).map((i) => espacios(i.value)).join(' ')
  }
}

function hayBoton(doc: Document, nombres: RegExp): boolean {
  return [...doc.querySelectorAll('[role="button"]')].some((b) => nombres.test(espacios(b.textContent ?? '')))
}

export function leerSeccion(doc: Document = document): LecturaSeccion {
  const items = itemsVisibles(doc)
  const encabezados = [...doc.querySelectorAll('[role="heading"]')]
  const enLista = (h: Element) => h.closest('[role="listitem"]') && datosDe(h.closest('[role="listitem"]')!)
  const secciones = encabezados.filter((h) => !enLista(h)).map((h) => espacios(h.textContent ?? '')).filter(Boolean)
  const titulo = secciones.join(' / ')
  return {
    titulo,
    firma: [titulo, ...items.map((i) => i.entries[0])].join('|'),
    campos: items.map((i) => ({
      entry: i.entries[0],
      entries: i.entries,
      titulo: i.titulo,
      codigoTipo: i.codigoTipo,
      obligatoria: i.obligatoria,
      valor: leerValor(i),
      error: espacios(i.el.querySelector('[role="alert"]')?.textContent ?? ''),
    })),
    haySiguiente: hayBoton(doc, /^(siguiente|next)$/i),
    hayEnviar: hayBoton(doc, /^(enviar|submit)$/i),
  }
}

// ---------- Escritura ----------

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

function escribirTexto(campo: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  campo.focus()
  setter.call(campo, valor)
  campo.dispatchEvent(new Event('input', { bubbles: true }))
  campo.dispatchEvent(new Event('change', { bubbles: true }))
  campo.blur()
}

/** Deja marcadas exactamente las opciones pedidas (desmarca lo que traiga el borrador). */
async function marcarExactas(opciones: Element[], quiero: string[]) {
  for (const o of opciones) {
    const debe = quiero.includes(valorOpcion(o))
    const esta = o.getAttribute('aria-checked') === 'true'
    if (debe !== esta) {
      ;(o as HTMLElement).click()
      await espera(60)
    }
  }
}

async function elegirEnDesplegable(item: Element, valor: string) {
  const lista = item.querySelector<HTMLElement>('[role="listbox"]')
  if (!lista) return
  lista.click()
  await espera(400)
  // Al abrirse, Google muestra una copia de las opciones; se elige la visible.
  const opciones = [...item.ownerDocument.querySelectorAll<HTMLElement>(`[role="option"]`)].filter(
    (o) => o.getAttribute('data-value') === valor && o.getClientRects().length > 0,
  )
  ;(opciones.at(-1) ?? lista.querySelector<HTMLElement>(`[role="option"][data-value="${CSS.escape(valor)}"]`))?.click()
  await espera(400)
}

const comoLista = (v: unknown): string[] => (v == null ? [] : Array.isArray(v) ? v.map(String) : [String(v)])

/** Cómo se ve el valor esperado con el mismo formato que leerValor. */
function textoEsperado(p: Propuesta): string {
  const r = p.respuesta
  if (p.tipo === 'cuadricula_opcion' || p.tipo === 'cuadricula_casillas') {
    const porFila = (r ?? {}) as Record<string, string | string[]>
    return (p.filas ?? []).map((f) => comoLista(porFila[f.titulo]).join(' + ')).join(' | ')
  }
  if (p.tipo === 'casillas') return comoLista(r).join(' + ')
  return espacios(comoLista(r).join(' '))
}

async function escribir(item: Item, p: Propuesta) {
  const el = item.el
  const r = p.respuesta
  switch (p.tipo) {
    case 'respuesta_corta':
    case 'parrafo': {
      const campo = textos(el)[0]
      if (campo) escribirTexto(campo, String(r ?? ''))
      return
    }
    case 'fecha': {
      const [a, m, d] = String(r ?? '').split('-')
      const campos = textos(el)
      const fecha = campos.find((c) => c.type === 'date')
      if (fecha) escribirTexto(fecha, String(r ?? ''))
      else if (campos.length >= 3) [d, m, a].forEach((v, i) => escribirTexto(campos[i], v ?? ''))
      return
    }
    case 'hora': {
      const [h, m] = String(r ?? '').split(':')
      const campos = textos(el)
      if (campos.length >= 2) {
        escribirTexto(campos[0], h ?? '')
        escribirTexto(campos[1], m ?? '')
      }
      return
    }
    case 'opcion_multiple':
    case 'escala':
      return marcarExactas([...el.querySelectorAll('[role="radio"]')], comoLista(r))
    case 'casillas':
      return marcarExactas([...el.querySelectorAll('[role="checkbox"]')], comoLista(r))
    case 'desplegable':
      return elegirEnDesplegable(el, String(r ?? ''))
    case 'cuadricula_opcion':
    case 'cuadricula_casillas': {
      const porFila = (r ?? {}) as Record<string, string | string[]>
      const filas = filasCuadricula(el)
      for (const [i, f] of (p.filas ?? []).entries()) if (filas[i]) await marcarExactas(filas[i], comoLista(porFila[f.titulo]))
      return
    }
  }
}

/** Vacía la pregunta (para la prueba de bloqueo: también borra lo que traiga el borrador). */
export async function vaciarCampo(entry: string, doc: Document = document): Promise<boolean> {
  const item = itemsVisibles(doc).find((i) => i.entries.includes(entry))
  if (!item) return false
  for (const c of textos(item.el)) escribirTexto(c, '')
  await marcarExactas([...item.el.querySelectorAll('[role="radio"], [role="checkbox"]')], [])
  return true
}

/**
 * Completa las preguntas de la sección visible que tienen respuesta y las vuelve a leer.
 * Devuelve un resultado por cada propuesta cuya pregunta está en esta sección.
 */
export async function completarSeccion(propuestas: Propuesta[], doc: Document = document): Promise<ResultadoCampo[]> {
  const items = itemsVisibles(doc)
  const delItem = (p: Propuesta) => {
    const entry = p.entry ?? p.filas?.[0]?.entry
    return entry ? items.find((i) => i.entries.includes(entry)) : undefined
  }
  const enSeccion = propuestas.filter((p) => delItem(p))
  const resultados: ResultadoCampo[] = []

  for (const p of enSeccion) {
    const accion = accionPara(p)
    if (accion === 'completar') await escribir(delItem(p)!, p)
  }
  await espera(150)

  for (const p of enSeccion) {
    const accion = accionPara(p)
    const item = delItem(p)
    const leido = item ? leerValor(item) : ''
    const esperado = accion === 'completar' ? textoEsperado(p) : ''
    resultados.push({
      entry: p.entry ?? p.filas![0].entry,
      pregunta: p.pregunta,
      tipo: p.tipo,
      accion,
      esperado,
      leido,
      estado: accion !== 'completar' ? null : !item ? 'no_encontrado' : leido === esperado ? 'ok' : 'distinto',
    })
  }
  // Propuestas para completar que deberían estar en esta sección pero no aparecen: las informa el recorrido.
  return resultados
}

// ---------- Lo que tiene que hacer la persona ----------

/** Archivo ya subido: Google agrega un input hidden "entry.N" con el id del archivo (sin "_sentinel"). */
function archivoSubido(item: Item): boolean {
  return item.entries.some((e) =>
    [...item.el.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${e}"]`)].some((i) => i.value.trim() !== ''),
  )
}

export function estadoPendientes(propuestas: Propuesta[], doc: Document = document): Pendiente[] {
  const items = itemsVisibles(doc)
  const pendientes: Pendiente[] = []
  for (const p of propuestas) {
    const accion = accionPara(p)
    if (accion !== 'archivo_manual' && accion !== 'confirmacion_humana') continue
    const item = items.find((i) => p.entry && i.entries.includes(p.entry))
    if (!item) continue
    if (accion === 'archivo_manual') {
      if (!p.obligatoria) continue
      pendientes.push({ entry: p.entry!, pregunta: p.pregunta, tipo: 'archivo', hecho: archivoSubido(item) })
    } else {
      pendientes.push({ entry: p.entry!, pregunta: p.pregunta, tipo: 'confirmacion', hecho: leerValor(item) !== '' })
    }
  }
  return pendientes
}
