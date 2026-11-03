// Firebase en el navegador (app web). Solo datos públicos: lo que protege los datos son las reglas de Firestore.
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './config-publica'

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export function entrarConGoogle() {
  const proveedor = new GoogleAuthProvider()
  proveedor.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(auth, proveedor)
}

export function salir() {
  return signOut(auth)
}
