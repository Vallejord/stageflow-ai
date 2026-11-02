// Script de contenido: corre en cada página de Google Forms y usa el motor tal cual (lib/motor/google-forms/).
// Nunca hace clic en botones del formulario ("Siguiente", "Enviar", "Borrar").
import { leerEstructura } from '../../lib/motor/google-forms/estructura.ts'
import { leerSeccion } from '../../lib/motor/google-forms/completar.ts'

export default defineContentScript({
  matches: ['https://docs.google.com/forms/*'],
  main() {
    const estructura = leerEstructura(document.documentElement.outerHTML)
    const seccion = leerSeccion(document)
    console.log(
      `[StageFlow] ${estructura.ok ? `${estructura.titulo}: ${estructura.totalPreguntas} preguntas` : estructura.mensaje} · sección visible: ${seccion.campos.length} preguntas`,
    )
  },
})
