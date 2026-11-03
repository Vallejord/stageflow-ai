// Puerta de entrada del panel (T5): sin sesión, solo se ofrece entrar con Google.
import { useEffect, useState, type ReactNode } from 'react'
import { alCambiarCuenta, entrarConGoogle, salir, type User } from '../../lib/cuenta.ts'

function mensajeDeError(e: unknown): string | null {
  const texto = e instanceof Error ? e.message : String(e)
  if (/did not approve|canceled|cancelled|closed/i.test(texto)) return null // la persona cerró la ventana
  if (/network|Failed to fetch/i.test(texto)) return 'No hay conexión. Revisá internet y probá de nuevo.'
  return 'No se pudo entrar con tu cuenta de Google. Probá de nuevo.'
}

export function ConCuenta({ children }: { children: (usuario: User) => ReactNode }) {
  const [usuario, setUsuario] = useState<User | null | undefined>(undefined)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => alCambiarCuenta(setUsuario), [])

  async function entrar() {
    setOcupado(true)
    setError(null)
    try {
      await entrarConGoogle()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  if (usuario === undefined) return <main><h1>StageFlow</h1><p className="nota">Mirando tu cuenta…</p></main>

  if (!usuario)
    return (
      <main>
        <h1>StageFlow</h1>
        <p className="vacio">Entrá con tu cuenta de Google para que StageFlow use los datos de tu obra.</p>
        <button type="button" className="principal" onClick={entrar} disabled={ocupado}>
          {ocupado ? 'Entrando…' : 'Entrar con Google'}
        </button>
        {error && <p className="error">{error}</p>}
      </main>
    )

  return (
    <>
      <div className="cuenta">
        <span>{usuario.email}</span>
        <button type="button" onClick={() => salir()}>Salir</button>
      </div>
      {children(usuario)}
    </>
  )
}
