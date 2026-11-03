// Reglas de Firestore (T5, criterio 4): un usuario no puede leer ni escribir datos de otro.
// Corre contra el emulador local: npm run test:reglas (necesita Java 21 y la herramienta de Firebase).
import { after, before, beforeEach, test } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'

let entorno: RulesTestEnvironment
const OBRA = { titulo: 'Deseo, mantente firme', ficha: { general: { email_contacto: 'x@y.z' } } }

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-stageflow',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
after(async () => entorno?.cleanup())
beforeEach(async () => {
  await entorno.clearFirestore()
  // Datos de Ezequiel cargados sin pasar por las reglas (como hace el servidor).
  await entorno.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'usuarios/ezequiel/obras/deseo'), OBRA))
})

const como = (uid: string) => entorno.authenticatedContext(uid).firestore()

test('El dueño lee y escribe sus obras', async () => {
  const db = como('ezequiel')
  await assertSucceeds(getDoc(doc(db, 'usuarios/ezequiel/obras/deseo')))
  await assertSucceeds(getDocs(collection(db, 'usuarios/ezequiel/obras')))
  await assertSucceeds(setDoc(doc(db, 'usuarios/ezequiel/obras/otra'), { titulo: 'Otra' }))
})

test('Otro usuario no puede leer las obras de Ezequiel', async () => {
  const db = como('intruso')
  await assertFails(getDoc(doc(db, 'usuarios/ezequiel/obras/deseo')))
  await assertFails(getDocs(collection(db, 'usuarios/ezequiel/obras')))
})

test('Otro usuario no puede escribir ni borrar las obras de Ezequiel', async () => {
  const db = como('intruso')
  await assertFails(setDoc(doc(db, 'usuarios/ezequiel/obras/deseo'), { titulo: 'pisada' }))
  await assertFails(setDoc(doc(db, 'usuarios/ezequiel/obras/nueva'), { titulo: 'metida' }))
  await assertFails(deleteDoc(doc(db, 'usuarios/ezequiel/obras/deseo')))
})

test('Sin sesión no se puede leer ni escribir nada', async () => {
  const db = entorno.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'usuarios/ezequiel/obras/deseo')))
  await assertFails(setDoc(doc(db, 'usuarios/ezequiel/obras/x'), { titulo: 'x' }))
})

test('Fuera de usuarios/ todo está cerrado, incluso con sesión', async () => {
  const db = como('ezequiel')
  await assertFails(getDoc(doc(db, 'configuracion/general')))
  await assertFails(setDoc(doc(db, 'obras/deseo'), { titulo: 'x' }))
})
