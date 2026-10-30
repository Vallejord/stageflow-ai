# Plan del MVP — StageFlow AI (referencia única)

Última actualización: 30/10/2026 (stack: Firebase). **Este documento es la referencia única del plan.** Cualquier tarea, idea o cambio se contrasta contra él. Si algo no está acá, no es parte del MVP. Si el plan cambia, se cambia este documento.

## Qué es el producto
StageFlow ayuda a artistas (teatro, música, danza, escritura, artes visuales) a postular a convocatorias. El artista hace el menor trabajo posible: su información sale de su Google Drive, y StageFlow completa cada formulario por él. **Nunca envía: el artista revisa y aprieta "Enviar".**

## El flujo, desde el artista
**Una sola vez**
1. Crea su cuenta e inicia sesión con Google.
2. Conecta la carpeta de Drive de su obra.
3. StageFlow arma la ficha sola, indicando de dónde salió cada dato. El artista solo revisa lo marcado como dudoso o faltante.

**Cada vez que postula**
4. Pega el link de la convocatoria en StageFlow (o abre el link en Chrome).
5. Se abre el formulario con el panel de StageFlow al costado. En segundos, StageFlow lee las preguntas de ese formulario —que nunca vio antes— y la IA decide qué responder en cada una con los datos de la ficha.
6. El artista toca "Completar": se llenan los campos y se verifica cada uno. Donde hay que subir un archivo, el panel indica cuál elegir de su Drive.
7. El artista revisa y aprieta "Enviar".
8. Si el formulario preguntó algo que la ficha no tenía, la respuesta se guarda en la ficha para la próxima.

**No hay que analizar ningún formulario de antemano.** Todo lo dinámico ocurre en el paso 5, en vivo, con cualquier formulario.

## Cómo se usa la IA
| Tarea | Cómo se hace |
|---|---|
| Dónde está cada campo | Se lee directo de la página. Exacto, sin IA. |
| Qué responder | IA: entiende cada pregunta (aunque esté redactada distinto o en otro idioma), elige el dato, lo adapta al límite de caracteres y lo traduce si hace falta. |
| Armar la ficha desde Drive | IA: lee documentos, PDFs y fotos, y extrae los datos con su fuente. |

## Funciones del MVP
1. Cuenta con login de Google.
2. Conexión de la carpeta de Drive (en la beta, hasta 100 usuarios de prueba sin auditoría de Google).
3. Ficha automática con fuente de cada dato y revisión de lo dudoso.
4. Textos listos: sinopsis en varios largos, en castellano e inglés; avisos sobre materiales (resolución de fotos, peso de PDFs, links no públicos).
5. Extensión de Chrome con panel lateral para Google Forms: preguntas y respuestas, "Completar", verificación, guía para archivos, nunca envía.
6. La ficha aprende de cada postulación.
7. Cobro simple, antes del lanzamiento (no en la beta).

**Fuera del MVP:** Microsoft Forms (va justo después), portales de subsidios (al principio, modo copiloto con respuestas para copiar), pre-evaluación de bases, historial avanzado, celular.

## Arquitectura
App web (cuenta, ficha, materiales, cobro) + extensión de Chrome (completa el formulario en el navegador del artista, con su sesión ya iniciada). No se guardan sesiones de Google de usuarios en servidores ni se corren navegadores en la nube.

**Todo en un solo proyecto de Google Cloud:** Firebase (cuentas, datos, archivos, hosting), Gemini (IA) y Drive API. Una sola factura y un solo set de permisos. Decidido el 30/10/2026: Firebase en lugar de Supabase, por aprovechar la experiencia en GCP del equipo y concentrar todo en Google.

## Orden de trabajo
Cada paso termina cuando funciona y se puede mostrar, no cuando está escrito.

| Paso | Qué | Terminado cuando |
|---|---|---|
| 1. Motor | Dado un link de Google Forms cualquiera: leer las preguntas, responderlas con IA, completar y verificar. Se prueba con el formulario de prueba propio. | Llega hasta "Enviar" (sin apretarlo) con todos los campos de texto y opción correctos y verificados, solo los archivos como paso manual. Dos veces seguidas. |
| 2. Extensión | Panel al costado del formulario que usa el motor, con la ficha de demo. | Un formulario se completa desde el panel, sin terminal. |
| 3. Drive | Conectar la carpeta y armar la ficha sola, con pantalla de revisión. | La carpeta de Monte Virgen produce una ficha correcta revisando solo lo dudoso. |
| 4. Beta | Monte Virgen postula a una convocatoria real con StageFlow. | Ella misma completa, revisa y envía, sin ayuda técnica. |

Después: Microsoft Forms, cobro y lanzamiento.

## Cómo trabajamos
- **Mission control** (chat general): visión del proyecto, decisiones, plan y asignación de tareas con criterios de aceptación.
- **Chat desarrollo**: ejecuta una tarea por vez y la cierra con evidencia.

## Reglas
- Nada se da por funcionando sin una prueba que lo demuestre.
- No se prueba contra convocatorias reales hasta la beta. El formulario de prueba es solo para desarrollo; el artista nunca lo ve.
- No se abren frentes fuera de este plan sin cambiar primero este documento.

## Stack y costos (estimados al 30/10/2026; precios de terceros, verificar al contratar)
| Pieza | Tecnología | Costo MVP / beta | Costo producto |
|---|---|---|---|
| App web | Next.js + TypeScript + Tailwind + shadcn (lo actual) en Firebase App Hosting | USD 0 dentro de las cuotas gratis (requiere plan Blaze con tarjeta) | Pago por uso, ~USD 20–60/mes junto con datos y archivos |
| Cuentas | Firebase Auth (login con Google) | USD 0 | USD 0 para el volumen previsto |
| Datos | Firestore (la ficha como documento) | USD 0 dentro de las cuotas gratis | Incluido arriba |
| Archivos | Cloud Storage para Firebase | USD 0 dentro de las cuotas gratis | Incluido arriba |
| Extensión | Chrome MV3 + React + TypeScript (WXT), panel lateral | USD 5 único (cuenta de desarrollador) | — |
| IA | Gemini por API, siempre desde el servidor, con salida estructurada | ~USD 0,015 por postulación; ~USD 0,05 por obra al leer el Drive | El precio de gemini-3.8-flash se duplica el 1/1/2027 → ~USD 0,03 por postulación |
| Drive | Google Drive API + Google Picker | USD 0 (beta: hasta 100 usuarios sin verificación) | USD 0 si se usa el selector de archivos; leer todo el Drive exige auditoría de Google (costo alto, a cotizar) |
| Pruebas | Playwright contra el formulario de prueba y el corpus | USD 0 | USD 0 |
| Errores | Sentry (plan gratis) | USD 0 | USD 0 a 26/mes |
| Cobro | Mercado Pago (Latam) + Stripe o Lemon Squeezy (internacional) | — | Comisión por venta, sin costo fijo |
| Dominio | — | ~USD 15/año | ~USD 15/año |

Estimación: MVP ≈ USD 5 únicos + ~USD 0/mes (más la IA, de centavos). Producto con ~2.000 postulaciones/mes ≈ USD 100–150/mes más comisiones de cobro. Poner alertas de presupuesto en Google Cloud desde el primer día. Para reportes del negocio más adelante: exportar Firestore a BigQuery. El costo principal no es la infraestructura: es el tiempo de desarrollo.

## Recursos
- Formulario de prueba (solo desarrollo): https://docs.google.com/forms/d/e/1FAIpQLScGyoVrpvBNlHo-zruCVa8G07vl6mhcddmr2Uyt8Kbv8LsJKg/viewform
- Prompt para el chat desarrollo: `prompt-maestro-desarrollo.md`
- Tareas asignadas y su estado: `claude/tareas.md`
- Evaluación del código actual y análisis de negocio: `claude/evaluacion-funcional-2026-10-30.md`
