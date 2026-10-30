/**
 * Respuestas para cada pregunta (T2): arma el pedido a la IA y revisa por código lo que devuelve.
 * Sin nada exclusivo de Node ni de un proveedor de IA: la llamada vive aparte (lib/motor/ia/).
 * Regla: no se confía en la IA. "revisar" lo decide este código, no el modelo.
 */
import type { EstructuraForm, Pregunta } from './estructura.ts'

export type Origen = 'ficha' | 'adaptado' | 'propuesta_ia' | 'sin_dato' | 'archivo_manual'
export const ORIGENES: Origen[] = ['ficha', 'adaptado', 'propuesta_ia', 'sin_dato', 'archivo_manual']

/** Lo que devuelve la IA por pregunta (formato fijo del esquema). */
export interface RespuestaIA {
  id: string
  valores: { fila: string; valor: string }[]
  origen: string
  campo: string
  nota: string
}

export type ValorRespuesta = string | string[] | Record<string, string | string[]> | null

export interface Propuesta {
  entry: string | null
  filas?: { entry: string; titulo: string }[]
  pregunta: string
  tipo: Pregunta['tipo']
  obligatoria: boolean
  respuesta: ValorRespuesta
  origen: Origen
  campo: string | null
  nota: string | null
  revisar: boolean
  /** Errores: la respuesta de la IA no pasó la revisión por código. */
  motivos: string[]
  /** Avisos para la persona que no son errores (p. ej. obligatoria sin dato). */
  avisos: string[]
}

// ---------- Ficha ----------

/** Convierte la ficha anidada en pares "seccion.campo" → texto. */
export function aplanarFicha(ficha: unknown, prefijo = ''): Record<string, string> {
  const salida: Record<string, string> = {}
  if (ficha && typeof ficha === 'object' && !Array.isArray(ficha)) {
    for (const [k, v] of Object.entries(ficha as Record<string, unknown>)) {
      const clave = prefijo ? `${prefijo}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(salida, aplanarFicha(v, clave))
      else if (v != null && String(v).trim() !== '') salida[clave] = Array.isArray(v) ? v.join(', ') : String(v)
    }
  }
  return salida
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// ---------- Pedido a la IA ----------

const idDe = (i: number) => `p${i + 1}`

export function preguntasPlanas(estructura: EstructuraForm): Pregunta[] {
  return estructura.secciones.flatMap((s) => s.preguntas)
}

export function construirPedido(estructura: EstructuraForm, ficha: unknown) {
  const datos = aplanarFicha(ficha)
  const preguntas = preguntasPlanas(estructura).map((p, i) => ({
    id: idDe(i),
    pregunta: p.titulo,
    ...(p.ayuda ? { ayuda: p.ayuda } : {}),
    tipo: p.tipo,
    obligatoria: p.obligatoria,
    ...(p.opciones ? { opciones: p.opciones } : {}),
    ...(p.filas ? { filas: p.filas.map((f) => f.titulo) } : {}),
    ...(p.validaciones.length ? { validaciones: p.validaciones } : {}),
  }))

  const prompt = `Completás formularios de convocatorias artísticas usando SOLO los datos de la ficha de una obra.
Para cada pregunta devolvé un objeto con: id, valores, origen, campo y nota.

ORIGEN (elegí uno):
- "ficha": el valor es EXACTAMENTE el texto de un campo de la ficha, copiado sin ningún cambio. En "campo" poné la clave (p. ej. "general.email_contacto").
- "adaptado": el campo dice EXPLÍCITAMENTE lo que pide la pregunta, y vos lo recortaste, resumiste, tradujiste o cambiaste de formato, sin agregar nada que no esté en ese campo. En "campo" poné la clave.
- "propuesta_ia": la ficha no lo dice explícitamente pero se puede deducir de ella (por ejemplo, suponer un rol, una autoría o una categoría). Podés usar nombres que estén en la ficha, pero nunca inventes nombres, emails, teléfonos, links ni cifras.
- "sin_dato": la ficha no tiene información para responder. "valores" vacío.
- "archivo_manual": preguntas de tipo "archivo". "valores" vacío; en "nota" sugerí qué material de la ficha subir.

REGLAS DE FORMATO:
- Preguntas con "opciones": usá el texto exacto de una opción existente (casillas: una o más).
- Cuadrículas: un elemento por fila, con "fila" = texto exacto de la fila y "valor" = texto exacto de una opción.
- En el resto, "fila" va vacío ("") y hay un solo elemento en "valores".
- Respetá las validaciones: máximo de caracteres, email, url, número entero (solo dígitos).
- Fecha: AAAA-MM-DD. Hora: HH:MM (24 h).
- Si la ficha ya tiene el dato y cumple las validaciones, copialo tal cual (origen "ficha"); no lo reescribas.
- "campo" y "nota" van vacíos ("") cuando no correspondan.
- No inventes datos. Ante la duda, "sin_dato".

FICHA (clave: valor):
${JSON.stringify(datos, null, 2)}

PREGUNTAS:
${JSON.stringify(preguntas, null, 2)}`

  return { prompt, ids: preguntas.map((p) => p.id) }
}

/** Esquema JSON fijo de la respuesta (formato OpenAPI que acepta Gemini). */
export const ESQUEMA_RESPUESTA = {
  type: 'OBJECT',
  properties: {
    respuestas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          valores: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { fila: { type: 'STRING' }, valor: { type: 'STRING' } },
              required: ['fila', 'valor'],
            },
          },
          origen: { type: 'STRING', enum: ORIGENES },
          campo: { type: 'STRING' },
          nota: { type: 'STRING' },
        },
        required: ['id', 'valores', 'origen', 'campo', 'nota'],
      },
    },
  },
  required: ['respuestas'],
} as const

// ---------- Revisión por código ----------

const RE_EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g
const RE_URL = /https?:\/\/[^\s"'<>]+/g
const RE_DIGITOS = /\d[\d\s().-]*\d|\d/g
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'da', 'di', 'van', 'von'])

/** Candidatos a nombre propio: dos o más palabras seguidas con mayúscula (se permiten "de", "del", etc. en el medio). */
function nombresPropios(texto: string): string[] {
  const salida: string[] = []
  for (const linea of texto.split(/[.!?:;,\n()"'«»]+/)) {
    let actual: string[] = []
    const cerrar = () => {
      while (actual.length && PARTICULAS.has(actual[actual.length - 1])) actual.pop()
      if (actual.filter((w) => /^\p{Lu}/u.test(w)).length >= 2) salida.push(actual.join(' '))
      actual = []
    }
    for (const w of linea.trim().split(/\s+/)) {
      const limpia = w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      if (/^\p{Lu}\p{Ll}/u.test(limpia)) actual.push(limpia)
      else if (actual.length && PARTICULAS.has(limpia)) actual.push(limpia)
      else cerrar()
    }
    cerrar()
  }
  return salida
}

/** Datos sensibles del valor (emails, links, números, nombres) que no aparecen en la ficha. */
export function datosAjenosALaFicha(valor: string, textoFicha: string, incluirNombres = true): string[] {
  const ficha = normalizar(textoFicha)
  const fichaDigitos = textoFicha.replace(/\D/g, ' ').replace(/\s+/g, ' ')
  const ajenos: string[] = []
  for (const e of valor.match(RE_EMAIL) ?? []) if (!ficha.includes(normalizar(e))) ajenos.push(e)
  for (const u of valor.match(RE_URL) ?? []) if (!ficha.includes(normalizar(u))) ajenos.push(u)
  const sinLinksNiEmails = valor.replace(RE_URL, ' ').replace(RE_EMAIL, ' ')
  for (const d of sinLinksNiEmails.match(RE_DIGITOS) ?? []) {
    const solo = d.replace(/\D/g, '')
    if (solo && !fichaDigitos.split(' ').some((n) => n.includes(solo)) && !textoFicha.replace(/\D/g, '').includes(solo))
      ajenos.push(d.trim())
  }
  if (incluirNombres)
    for (const n of nombresPropios(sinLinksNiEmails)) if (!ficha.includes(normalizar(n))) ajenos.push(n)
  return [...new Set(ajenos)]
}

function revisarFormato(p: Pregunta, valores: { fila: string; valor: string }[], motivos: string[]) {
  const vals = valores.map((v) => v.valor.trim())
  const opciones = p.opciones ?? []
  switch (p.tipo) {
    case 'respuesta_corta':
    case 'parrafo': {
      if (vals.length > 1) motivos.push('Se esperaba un solo valor')
      const v = vals[0] ?? ''
      for (const val of p.validaciones) {
        if (val.tipo === 'email' && !/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v)) motivos.push('No es un email válido')
        if (val.tipo === 'url' && !/^https?:\/\/\S+\.\S+$/.test(v)) motivos.push('No es un link válido')
        if (val.tipo === 'numero_entero' && !/^-?\d+$/.test(v)) motivos.push('Debe ser un número entero')
        if (val.tipo === 'numero') {
          const n = Number(v)
          if (v === '' || Number.isNaN(n)) motivos.push('Debe ser un número')
          else if (val.condicion === 'entre' && (n < val.valores[0] || n > val.valores[1]))
            motivos.push(`Debe estar entre ${val.valores[0]} y ${val.valores[1]}`)
        }
        if (val.tipo === 'max_caracteres' && v.length > val.valor) motivos.push(`Tiene ${v.length} caracteres (máximo ${val.valor})`)
        if (val.tipo === 'min_caracteres' && v.length < val.valor) motivos.push(`Tiene ${v.length} caracteres (mínimo ${val.valor})`)
      }
      break
    }
    case 'opcion_multiple':
    case 'desplegable':
    case 'escala':
    case 'calificacion':
      if (vals.length !== 1) motivos.push('Se esperaba exactamente una opción')
      for (const v of vals) if (!opciones.includes(v)) motivos.push(`"${v}" no es una opción del formulario`)
      break
    case 'casillas': {
      for (const v of vals) if (!opciones.includes(v)) motivos.push(`"${v}" no es una opción del formulario`)
      if (new Set(vals).size !== vals.length) motivos.push('Opciones repetidas')
      for (const val of p.validaciones)
        if (val.tipo === 'casillas') {
          if (val.condicion === 'al_menos' && vals.length < val.valor) motivos.push(`Elegir al menos ${val.valor}`)
          if (val.condicion === 'como_maximo' && vals.length > val.valor) motivos.push(`Elegir como máximo ${val.valor}`)
          if (val.condicion === 'exactamente' && vals.length !== val.valor) motivos.push(`Elegir exactamente ${val.valor}`)
        }
      break
    }
    case 'cuadricula_opcion':
    case 'cuadricula_casillas': {
      const filas = (p.filas ?? []).map((f) => f.titulo)
      for (const v of valores) {
        if (!filas.includes(v.fila.trim())) motivos.push(`"${v.fila}" no es una fila del formulario`)
        if (!opciones.includes(v.valor.trim())) motivos.push(`"${v.valor}" no es una opción del formulario`)
      }
      if (p.tipo === 'cuadricula_opcion') {
        const usadas = valores.map((v) => v.fila.trim())
        if (new Set(usadas).size !== usadas.length) motivos.push('Más de una opción en la misma fila')
      }
      if (p.obligatoria && valores.length) {
        const faltan = filas.filter((f) => !valores.some((v) => v.fila.trim() === f))
        if (faltan.length) motivos.push(`Faltan filas obligatorias: ${faltan.join(', ')}`)
      }
      break
    }
    case 'fecha':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(vals[0] ?? '') || Number.isNaN(Date.parse(vals[0]))) motivos.push('Fecha con formato inválido (AAAA-MM-DD)')
      break
    case 'hora':
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(vals[0] ?? '')) motivos.push('Hora con formato inválido (HH:MM)')
      break
  }
}

function aRespuesta(p: Pregunta, valores: { fila: string; valor: string }[]): ValorRespuesta {
  if (!valores.length) return null
  if (p.tipo === 'casillas') return valores.map((v) => v.valor.trim())
  if (p.tipo === 'cuadricula_opcion' || p.tipo === 'cuadricula_casillas') {
    const r: Record<string, string | string[]> = {}
    for (const v of valores) {
      const f = v.fila.trim()
      if (p.tipo === 'cuadricula_casillas') r[f] = [...((r[f] as string[]) ?? []), v.valor.trim()]
      else r[f] = v.valor.trim()
    }
    return r
  }
  return valores[0].valor.trim()
}

export interface Revision {
  propuestas: Propuesta[]
  /** false si la IA omitió preguntas: el resultado no está completo. */
  completo: boolean
  faltantes: string[]
}

export function revisarRespuestas(estructura: EstructuraForm, ficha: unknown, crudas: RespuestaIA[]): Revision {
  const datos = aplanarFicha(ficha)
  const textoFicha = Object.values(datos).join('\n')
  const porId = new Map(crudas.map((r) => [r.id, r]))
  const faltantes: string[] = []

  const propuestas = preguntasPlanas(estructura).map((p, i): Propuesta => {
    const r = porId.get(idDe(i))
    const motivos: string[] = []
    const base = {
      entry: p.entry,
      ...(p.filas ? { filas: p.filas.map((f) => ({ entry: f.entry, titulo: f.titulo })) } : {}),
      pregunta: p.titulo,
      tipo: p.tipo,
      obligatoria: p.obligatoria,
    }
    if (!r) {
      faltantes.push(p.titulo)
      return { ...base, respuesta: null, origen: 'sin_dato', campo: null, nota: null, revisar: true, motivos: ['La IA no devolvió respuesta para esta pregunta'], avisos: [] }
    }

    let origen = (ORIGENES as string[]).includes(r.origen) ? (r.origen as Origen) : 'propuesta_ia'
    if (origen !== r.origen) motivos.push(`Origen desconocido "${r.origen}"`)
    let valores = (r.valores ?? []).filter((v) => v && typeof v.valor === 'string' && v.valor.trim() !== '')
    const campo = r.campo?.trim() || null
    const nota = r.nota?.trim() || null

    if (p.tipo === 'archivo') {
      if (origen !== 'archivo_manual') motivos.push(`Pregunta de archivo marcada como "${origen}"`)
      return { ...base, respuesta: null, origen: 'archivo_manual', campo, nota, revisar: true, motivos, avisos: ['Subir el archivo a mano'] }
    }
    if (p.tipo === 'no_soportado') {
      return { ...base, respuesta: null, origen: 'sin_dato', campo: null, nota, revisar: true, motivos: ['Tipo de pregunta no soportado'], avisos: [] }
    }
    if (origen === 'archivo_manual') {
      motivos.push('Marcada como archivo pero no es una pregunta de archivo')
      origen = 'sin_dato'
    }
    if (origen === 'sin_dato') valores = []
    else if (!valores.length) {
      motivos.push('Sin valor aunque el origen no es "sin_dato"')
      origen = 'sin_dato'
    }

    if (valores.length) revisarFormato(p, valores, motivos)

    // En preguntas con opciones, el texto viene del formulario: alcanza con validar que la opción exista.
    const conOpciones = !!p.opciones && p.tipo !== 'respuesta_corta' && p.tipo !== 'parrafo'
    const texto = conOpciones ? '' : valores.map((v) => v.valor).join('\n')
    if (origen === 'ficha' || origen === 'adaptado') {
      if (!campo || !(campo in datos)) motivos.push(`El campo "${campo ?? ''}" no existe en la ficha`)
      else if (origen === 'ficha' && valores.length === 1 && valores[0].valor.trim() !== datos[campo].trim())
        motivos.push(`Marcado como dato de la ficha pero no es igual a "${campo}"`)
      const ajenos = datosAjenosALaFicha(texto, textoFicha)
      if (ajenos.length) motivos.push(`Contiene datos que no están en la ficha: ${ajenos.join(', ')}`)
    } else if (origen === 'propuesta_ia' && texto) {
      const ajenos = datosAjenosALaFicha(texto, textoFicha)
      if (ajenos.length) motivos.push(`Propone datos que no están en la ficha: ${ajenos.join(', ')}`)
    }

    const avisos: string[] = []
    if (p.obligatoria && !valores.length) avisos.push('Obligatoria y sin dato: hay que completarla a mano')

    return {
      ...base,
      respuesta: aRespuesta(p, valores),
      origen,
      campo: origen === 'ficha' || origen === 'adaptado' ? campo : null,
      nota,
      revisar: origen !== 'ficha' || motivos.length > 0,
      motivos,
      avisos,
    }
  })

  return { propuestas, completo: faltantes.length === 0, faltantes }
}
