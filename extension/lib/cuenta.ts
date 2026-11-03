// Cuenta de StageFlow en la extensión (T5): entrar con Google desde el panel, con la misma cuenta que la app web.
// Chrome da el token de Google (permiso "identity" + cliente OAuth de tipo extensión) y Firebase abre la sesión.
// La sesión queda guardada por Firebase en la extensión: sobrevive a cerrar y abrir Chrome.
import { initializeApp } from 'firebase/app'
// La versión "web-extension" de Firebase Auth no carga código remoto (requisito de las extensiones MV3)
// y guarda la sesión en IndexedDB.
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithCredential, signOut, type User } from 'firebase/auth/web-extension'
import { firebaseConfig } from '../../lib/firebase/config-publica.ts'

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export type { User }
export const alCambiarCuenta = (fn: (u: User | null) => void) => onAuthStateChanged(auth, fn)

export async function entrarConGoogle(): Promise<void> {
  const { token } = await browser.identity.getAuthToken({ interactive: true })
  if (!token) throw new Error('sin_token')
  try {
    await signInWithCredential(auth, GoogleAuthProvider.credential(null, token))
  } catch (e) {
    // Un token de Google viejo en la memoria de Chrome: se descarta y se pide uno nuevo una vez.
    await browser.identity.removeCachedAuthToken({ token })
    const nuevo = (await browser.identity.getAuthToken({ interactive: true })).token
    if (!nuevo) throw e
    await signInWithCredential(auth, GoogleAuthProvider.credential(null, nuevo))
  }
}

export async function salir(): Promise<void> {
  await signOut(auth)
  await browser.identity.clearAllCachedAuthTokens()
}

/** Token de sesión para el servidor. null si no hay sesión. */
export async function tokenDeSesion(): Promise<string | null> {
  return auth.currentUser ? auth.currentUser.getIdToken() : null
}
