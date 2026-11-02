// Script de contenido: corre en cada página de Google Forms y usa el motor tal cual (lib/motor/google-forms/).
// Solo contesta pedidos del panel. Nunca hace clic en botones del formulario ("Siguiente", "Enviar", "Borrar").
import { leerEstructura, type EstructuraForm, type LecturaFallida } from '../../lib/motor/google-forms/estructura.ts'
import { completarSeccion, estadoPendientes, leerSeccion, vaciarCampo } from '../../lib/motor/google-forms/completar.ts'
import type { Pedido, RespuestaContenido } from '../lib/mensajes.ts'

export default defineContentScript({
  matches: ['https://docs.google.com/forms/*'],
  main() {
    // La estructura no cambia mientras la página está abierta: se lee una vez (cada "Siguiente" recarga la página).
    let estructura: EstructuraForm | LecturaFallida | null = null
    const formId = location.pathname.match(/\/forms\/(?:u\/\d+\/)?d\/e\/([^/]+)/)?.[1] ?? null

    async function atender(p: Pedido): Promise<RespuestaContenido> {
      switch (p.tipo) {
        case 'leer':
          estructura ??= leerEstructura(document.documentElement.outerHTML)
          return {
            ok: true,
            estado: { formId, estructura, seccion: leerSeccion(document), pendientes: p.propuestas ? estadoPendientes(p.propuestas, document) : [] },
          }
        case 'completar':
          return { ok: true, resultados: await completarSeccion(p.propuestas, document) }
        case 'vaciar':
          return { ok: true, vaciado: await vaciarCampo(p.entry, document) }
      }
    }

    browser.runtime.onMessage.addListener((pedido: Pedido, _remitente, responder) => {
      atender(pedido)
        .then(responder)
        .catch((e) => responder({ ok: false, error: String((e as Error)?.message ?? e) }))
      return true // la respuesta llega después (async)
    })
  },
})
