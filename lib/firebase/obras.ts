// Dónde viven las obras en Firestore (T5): usuarios/{uid}/obras/{obraId}.
// Las reglas (firestore.rules) dejan leer y escribir solo al dueño.
export const rutaObras = (uid: string) => `usuarios/${uid}/obras`

export interface Obra {
  titulo: string
  compania: string
  /** La ficha completa, tal como la usa el motor para proponer respuestas. */
  ficha: Record<string, unknown>
  actualizada: { toDate(): Date } | null
}

/** Arma el documento de una obra a partir de una ficha. */
export function obraDesdeFicha(ficha: Record<string, any>) {
  return {
    titulo: String(ficha?.espectaculo?.titulo ?? 'Obra sin título'),
    compania: String(ficha?.general?.nombre_artista_agrupacion ?? ''),
    ficha,
  }
}
