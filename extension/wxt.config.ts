import { readFileSync } from 'node:fs'
import { defineConfig } from 'wxt'
import { OAUTH_CLIENT_ID } from './lib/config-publica.ts'

// Clave pública que fija el identificador de la extensión (ibepmlkkjffdhonobnhhklckchmdbgjo). La privada no está en git.
const KEY = readFileSync(new URL('./.clave/key-publica.txt', import.meta.url), 'utf8').trim()

// Extensión de StageFlow (T4): panel lateral que completa Google Forms con el motor de lib/motor/.
// Permisos mínimos: solo páginas de Google Forms (por el script de contenido), panel lateral, almacenamiento
// e identity (para "Entrar con Google" con el cliente OAuth de la extensión, T5).
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'StageFlow',
    description: 'Completa formularios de convocatorias con los datos de tu obra. Nunca envía: vos revisás y apretás "Enviar".',
    key: KEY,
    permissions: ['sidePanel', 'storage', 'identity'],
    oauth2: { client_id: OAUTH_CLIENT_ID, scopes: ['openid', 'email', 'profile'] },
    action: { default_title: 'Abrir StageFlow' },
  },
  // El motor vive fuera de extension/ (lib/motor/): se importa tal cual, sin copiarlo.
  vite: () => ({ server: { fs: { allow: ['..'] } } }),
})
