import { defineConfig } from 'wxt'

// Extensión de StageFlow (T4): panel lateral que completa Google Forms con el motor de lib/motor/.
// Permisos mínimos: solo páginas de Google Forms (por el script de contenido), panel lateral y almacenamiento.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'StageFlow',
    description: 'Completa formularios de convocatorias con los datos de tu obra. Nunca envía: vos revisás y apretás "Enviar".',
    permissions: ['sidePanel', 'storage'],
    action: { default_title: 'Abrir StageFlow' },
  },
  // El motor vive fuera de extension/ (lib/motor/): se importa tal cual, sin copiarlo.
  vite: () => ({ server: { fs: { allow: ['..'] } } }),
})
