'use client'
// Entrar con Google / Salir (T5). Muestra con qué cuenta estás.
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, entrarConGoogle, salir } from '@/lib/firebase/cliente'

type Estado = { tipo: 'cargando' } | { tipo: 'fuera' } | { tipo: 'dentro'; usuario: User }

function mensajeDeError(e: unknown): string | null {
  const codigo = (e as { code?: string })?.code ?? ''
  if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return null
  if (codigo === 'auth/popup-blocked') return 'El navegador bloqueó la ventana para entrar. Permití ventanas emergentes para este sitio y probá de nuevo.'
  if (codigo === 'auth/network-request-failed') return 'No hay conexión. Revisá internet y probá de nuevo.'
  if (codigo === 'auth/unauthorized-domain') return 'Esta dirección todavía no está habilitada para entrar.'
  return 'No se pudo entrar. Probá de nuevo.'
}

export function Cuenta() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(
    () => onAuthStateChanged(auth, (u) => setEstado(u ? { tipo: 'dentro', usuario: u } : { tipo: 'fuera' })),
    [],
  )

  async function entrar() {
    setError(null)
    setOcupado(true)
    try {
      await entrarConGoogle()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  const boton =
    'inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50'

  if (estado.tipo === 'cargando') return <div className="h-9" aria-hidden="true" />

  if (estado.tipo === 'fuera')
    return (
      <div className="flex flex-col items-end gap-2">
        <button type="button" onClick={entrar} disabled={ocupado} className={`${boton} bg-primary text-primary-foreground hover:bg-primary/90`}>
          {ocupado ? 'Entrando…' : 'Entrar con Google'}
        </button>
        {error && (
          <p role="alert" className="max-w-xs text-right text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )

  const { usuario } = estado
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{usuario.email}</span>
      <button type="button" onClick={() => salir()} className={`${boton} border hover:bg-muted`}>
        Salir
      </button>
    </div>
  )
}
