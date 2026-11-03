// Firebase en el servidor (T5). En App Hosting usa la cuenta de servicio del servidor, sin claves en archivos.
// firebase-admin no pasa por las reglas de Firestore: por eso el servidor solo lee la ficha del uid
// que sale de verificar la sesión, nunca un uid que mande el pedido.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { firebaseConfig } from '../firebase/config-publica.ts'

const app = getApps()[0] ?? initializeApp({ projectId: firebaseConfig.projectId })

export async function verificarSesion(token: string): Promise<string | null> {
  try {
    return (await getAuth(app).verifyIdToken(token)).uid
  } catch {
    return null
  }
}

/** La ficha de la primera obra del usuario (por ahora cada cuenta tiene una sola). */
export async function leerFicha(uid: string): Promise<unknown | null> {
  const snap = await getFirestore(app).collection(`usuarios/${uid}/obras`).limit(1).get()
  return snap.empty ? null : (snap.docs[0].get('ficha') ?? null)
}
