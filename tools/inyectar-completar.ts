// Convierte lib/motor/google-forms/completar.ts en un script para inyectar en la página (Playwright addScriptTag).
// Le quita los tipos con Node (sin dependencias) y expone las funciones en window.__stageflowCompletar.
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

const FUNCIONES = ['leerSeccion', 'completarSeccion', 'estadoPendientes', 'vaciarCampo', 'esConfirmacionHumana', 'accionPara']

export function scriptCompletar(): string {
  const ts = readFileSync(new URL('../lib/motor/google-forms/completar.ts', import.meta.url), 'utf8')
  const js = stripTypeScriptTypes(ts).replace(/^export\s+/gm, '')
  return `window.__stageflowCompletar = (() => {\n${js}\nreturn { ${FUNCIONES.join(', ')} }\n})();`
}
