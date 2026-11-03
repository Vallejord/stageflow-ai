'use client'
// Mis obras (T5): lee de Firestore las obras de la cuenta con la que entraste.
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase/cliente'
import { obraDesdeFicha, rutaObras, type Obra } from '@/lib/firebase/obras'

type Estado =
  | { tipo: 'sin_sesion' }
  | { tipo: 'cargando' }
  | { tipo: 'listo'; obras: (Obra & { id: string })[] }
  | { tipo: 'error'; mensaje: string }

const ES_DESARROLLO = process.env.NODE_ENV === 'development'

export function MisObras() {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [estado, setEstado] = useState<Estado>({ tipo: 'sin_sesion' })

  useEffect(() => onAuthStateChanged(auth, setUsuario), [])

  useEffect(() => {
    if (!usuario) {
      setEstado({ tipo: 'sin_sesion' })
      return
    }
    setEstado({ tipo: 'cargando' })
    return onSnapshot(
      collection(db, rutaObras(usuario.uid)),
      (snap) => setEstado({ tipo: 'listo', obras: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Obra) })) }),
      () => setEstado({ tipo: 'error', mensaje: 'No se pudieron leer tus obras. Revisá la conexión y recargá la página.' }),
    )
  }, [usuario])

  if (estado.tipo === 'sin_sesion') return null

  return (
    <section aria-labelledby="mis-obras" className="flex flex-col gap-4">
      <h2 id="mis-obras" className="text-xl font-semibold">
        Mis obras
      </h2>
      {estado.tipo === 'cargando' && <p className="text-muted-foreground">Cargando…</p>}
      {estado.tipo === 'error' && (
        <p role="alert" className="text-destructive">
          {estado.mensaje}
        </p>
      )}
      {estado.tipo === 'listo' && estado.obras.length === 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
          <p className="text-muted-foreground">Todavía no tenés obras cargadas.</p>
          {ES_DESARROLLO && usuario && <CargarFichaDemo uid={usuario.uid} />}
        </div>
      )}
      {estado.tipo === 'listo' && estado.obras.length > 0 && (
        <ul className="flex flex-col gap-3">
          {estado.obras.map((o) => (
            <li key={o.id} className="rounded-lg border bg-card p-4">
              <p className="font-semibold">{o.titulo}</p>
              {o.compania && <p className="text-sm text-muted-foreground">{o.compania}</p>}
              {o.actualizada && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Actualizada el {o.actualizada.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Solo en `npm run dev` (no existe en la versión publicada): carga la ficha de demo a tu cuenta, una vez. */
function CargarFichaDemo({ uid }: { uid: string }) {
  const [estado, setEstado] = useState<'listo' | 'cargando' | 'error'>('listo')
  async function cargar() {
    setEstado('cargando')
    try {
      const ficha = (await import('@/data/obra-demo.json')).default
      await setDoc(doc(db, rutaObras(uid), 'deseo-mantente-firme'), { ...obraDesdeFicha(ficha), actualizada: serverTimestamp() })
    } catch {
      setEstado('error')
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={cargar}
        disabled={estado === 'cargando'}
        className="inline-flex h-9 w-fit items-center rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {estado === 'cargando' ? 'Cargando…' : 'Cargar la ficha de demo (solo en desarrollo)'}
      </button>
      {estado === 'error' && <p className="text-sm text-destructive">No se pudo cargar. Probá de nuevo.</p>}
    </div>
  )
}
