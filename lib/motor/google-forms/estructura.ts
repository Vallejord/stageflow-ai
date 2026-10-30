/**
 * Lector de estructura de Google Forms.
 *
 * Recibe el contenido de la página de un Google Form (el HTML completo o solo el
 * <script> con FB_PUBLIC_LOAD_DATA_) y devuelve sus secciones y preguntas.
 * Sin IA y sin nada exclusivo de Node: corre igual en el servidor, en Playwright
 * o dentro de una extensión de Chrome. No escribe ni hace clic en nada.
 *
 * FB_PUBLIC_LOAD_DATA_ no está documentado por Google. Los códigos de abajo se
 * confirman contra formularios reales capturados en fixtures/.
 */

export type TipoPregunta =
  | 'respuesta_corta'
  | 'parrafo'
  | 'opcion_multiple'
  | 'casillas'
  | 'desplegable'
  | 'escala'
  | 'cuadricula_opcion'
  | 'cuadricula_casillas'
  | 'fecha'
  | 'hora'
  | 'archivo'
  | 'calificacion'
  | 'no_soportado'

export type Validacion =
  | { tipo: 'email' }
  | { tipo: 'url' }
  | { tipo: 'numero_entero' }
  | { tipo: 'numero'; condicion: string; valores: number[] }
  | { tipo: 'max_caracteres'; valor: number }
  | { tipo: 'min_caracteres'; valor: number }
  | { tipo: 'texto'; condicion: string; valor: string }
  | { tipo: 'expresion_regular'; condicion: string; valor: string }
  | { tipo: 'casillas'; condicion: string; valor: number }
  | { tipo: 'desconocida'; crudo: unknown }

export interface Pregunta {
  /** Identificador del campo, p. ej. "entry.1188998454". En cuadrículas, uno por fila (ver filas). */
  entry: string | null
  titulo: string
  ayuda: string | null
  tipo: TipoPregunta
  /** Código interno de Google, útil para depurar tipos no soportados. */
  codigoTipo: number
  obligatoria: boolean
  opciones: string[] | null
  /** Solo cuadrículas: cada fila con su propio entry. */
  filas?: { entry: string; titulo: string; obligatoria: boolean }[]
  /** Solo escala: etiquetas de los extremos. */
  extremos?: { min: string | null; max: string | null }
  validaciones: Validacion[]
}

export interface Seccion {
  titulo: string
  descripcion: string | null
  preguntas: Pregunta[]
}

export interface EstructuraForm {
  ok: true
  titulo: string
  descripcion: string | null
  /** Inferido: Google exige iniciar sesión cuando hay preguntas de archivo. */
  requiereLogin: boolean
  secciones: Seccion[]
  totalPreguntas: number
  noSoportadas: string[]
}

export interface LecturaFallida {
  ok: false
  motivo: 'requiere_login' | 'no_es_google_form'
  mensaje: string
}

const TIPOS: Record<number, TipoPregunta> = {
  0: 'respuesta_corta',
  1: 'parrafo',
  2: 'opcion_multiple',
  3: 'desplegable',
  4: 'casillas',
  5: 'escala',
  9: 'fecha',
  10: 'hora',
  13: 'archivo',
  18: 'calificacion',
}
/** Elementos que no son preguntas: título/descripción, salto de sección, imagen, video. */
const NO_PREGUNTA = new Set([6, 8, 11, 12])
const SALTO_DE_SECCION = 8

const CONDICION_NUMERO: Record<number, string> = {
  1: 'mayor_que', 2: 'mayor_o_igual', 3: 'menor_que', 4: 'menor_o_igual',
  5: 'igual', 6: 'distinto', 7: 'entre', 8: 'no_entre', 9: 'es_numero', 10: 'numero_entero',
}
const CONDICION_TEXTO: Record<number, string> = { 100: 'contiene', 101: 'no_contiene', 102: 'email', 103: 'url' }
const CONDICION_REGEX: Record<number, string> = { 299: 'contiene', 300: 'no_contiene', 301: 'coincide', 302: 'no_coincide' }
const CONDICION_CASILLAS: Record<number, string> = { 200: 'al_menos', 201: 'como_maximo', 204: 'exactamente' }

/** Extrae el arreglo FB_PUBLIC_LOAD_DATA_ del texto, respetando strings al contar corchetes. */
export function extraerDatos(contenido: string): unknown[] | null {
  const marca = contenido.indexOf('FB_PUBLIC_LOAD_DATA_')
  if (marca === -1) return null
  const inicio = contenido.indexOf('[', marca)
  if (inicio === -1) return null
  let profundidad = 0
  let enString = false
  let escape = false
  for (let i = inicio; i < contenido.length; i++) {
    const c = contenido[i]
    if (enString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') enString = false
      continue
    }
    if (c === '"') enString = true
    else if (c === '[') profundidad++
    else if (c === ']') {
      profundidad--
      if (profundidad === 0) {
        try {
          return JSON.parse(contenido.slice(inicio, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function limpiar(texto: unknown): string | null {
  if (typeof texto !== 'string') return null
  const t = texto.trim()
  return t === '' ? null : t
}

function leerValidaciones(crudas: unknown): Validacion[] {
  if (!Array.isArray(crudas)) return []
  return crudas.map((v): Validacion => {
    const [grupo, codigo, args] = v as [number, number, string[] | null]
    const a = Array.isArray(args) ? args : []
    if (grupo === 2 && codigo === 102) return { tipo: 'email' }
    if (grupo === 2 && codigo === 103) return { tipo: 'url' }
    if (grupo === 2 && CONDICION_TEXTO[codigo]) return { tipo: 'texto', condicion: CONDICION_TEXTO[codigo], valor: a[0] ?? '' }
    if (grupo === 1 && codigo === 10) return { tipo: 'numero_entero' }
    if (grupo === 1 && CONDICION_NUMERO[codigo]) return { tipo: 'numero', condicion: CONDICION_NUMERO[codigo], valores: a.map(Number) }
    if (grupo === 6 && codigo === 202) return { tipo: 'max_caracteres', valor: Number(a[0]) }
    if (grupo === 6 && codigo === 203) return { tipo: 'min_caracteres', valor: Number(a[0]) }
    if (grupo === 4 && CONDICION_REGEX[codigo]) return { tipo: 'expresion_regular', condicion: CONDICION_REGEX[codigo], valor: a[0] ?? '' }
    if (grupo === 7 && CONDICION_CASILLAS[codigo]) return { tipo: 'casillas', condicion: CONDICION_CASILLAS[codigo], valor: Number(a[0]) }
    return { tipo: 'desconocida', crudo: v }
  })
}

function leerOpciones(crudas: unknown): string[] | null {
  if (!Array.isArray(crudas)) return null
  const ops = crudas.map((o) => (Array.isArray(o) ? String(o[0] ?? '') : '')).filter((o) => o !== '')
  return ops.length ? ops : null
}

function leerPregunta(item: unknown[]): Pregunta {
  const codigoTipo = item[3] as number
  const titulo = limpiar(item[1]) ?? '(sin título)'
  const ayuda = limpiar(item[2])
  const campos = (Array.isArray(item[4]) ? item[4] : []) as unknown[][]
  const primero = campos[0] ?? []
  const base = {
    titulo,
    ayuda,
    codigoTipo,
    entry: primero[0] != null ? `entry.${primero[0]}` : null,
    obligatoria: primero[2] === 1,
  }

  if (codigoTipo === 7) {
    const casillas = Array.isArray(primero[11]) && primero[11][0] === 1
    return {
      ...base,
      entry: null,
      tipo: casillas ? 'cuadricula_casillas' : 'cuadricula_opcion',
      obligatoria: campos.length > 0 && campos.every((f) => f[2] === 1),
      opciones: leerOpciones(primero[1]),
      filas: campos.map((f) => ({
        entry: `entry.${f[0]}`,
        titulo: limpiar(Array.isArray(f[3]) ? f[3][0] : null) ?? '',
        obligatoria: f[2] === 1,
      })),
      validaciones: [],
    }
  }

  const tipo = TIPOS[codigoTipo] ?? 'no_soportado'
  const pregunta: Pregunta = {
    ...base,
    tipo,
    opciones: ['opcion_multiple', 'casillas', 'desplegable', 'escala', 'calificacion'].includes(tipo)
      ? leerOpciones(primero[1])
      : null,
    validaciones: leerValidaciones(primero[4]),
  }
  if (tipo === 'escala') {
    const ext = Array.isArray(primero[3]) ? primero[3] : []
    pregunta.extremos = { min: limpiar(ext[0]), max: limpiar(ext[1]) }
  }
  return pregunta
}

export function leerEstructura(contenido: string): EstructuraForm | LecturaFallida {
  const datos = extraerDatos(contenido)
  if (!datos || !Array.isArray(datos[1])) {
    const esLogin = /accounts\.google\.com|ServiceLogin|identifier/i.test(contenido)
    return esLogin
      ? { ok: false, motivo: 'requiere_login', mensaje: 'Este formulario requiere iniciar sesión en Google.' }
      : { ok: false, motivo: 'no_es_google_form', mensaje: 'No se encontraron los datos de un Google Form en esta página.' }
  }

  const form = datos[1] as unknown[]
  const titulo = limpiar(form[8]) ?? limpiar(datos[3]) ?? '(sin título)'
  const descripcion = limpiar(form[0])
  const items = (Array.isArray(form[1]) ? form[1] : []) as unknown[][]

  const secciones: Seccion[] = [{ titulo, descripcion, preguntas: [] }]
  const noSoportadas: string[] = []

  for (const item of items) {
    const codigo = item[3] as number
    if (codigo === SALTO_DE_SECCION) {
      secciones.push({ titulo: limpiar(item[1]) ?? '(sección sin título)', descripcion: limpiar(item[2]), preguntas: [] })
      continue
    }
    if (NO_PREGUNTA.has(codigo)) continue
    const pregunta = leerPregunta(item)
    if (pregunta.tipo === 'no_soportado') noSoportadas.push(`${pregunta.titulo} (código ${codigo})`)
    secciones[secciones.length - 1].preguntas.push(pregunta)
  }

  const todas = secciones.flatMap((s) => s.preguntas)
  return {
    ok: true,
    titulo,
    descripcion,
    requiereLogin: todas.some((p) => p.tipo === 'archivo'),
    secciones,
    totalPreguntas: todas.length,
    noSoportadas,
  }
}
