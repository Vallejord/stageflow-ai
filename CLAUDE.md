# StageFlow AI — contexto para Claude Code

Herramienta para que artistas (teatro, música, danza, escritura, artes visuales) completen postulaciones a festivales y subsidios con los datos que cargaron una vez. **Regla de oro: el sistema nunca envía el formulario. Completa, verifica, avisa qué falta y la persona aprieta "Enviar".**

Documentos de referencia: `stageflow_ai_contexto_para_claude_code.md` (en esta carpeta) y, en el Proyecto "agente de postulaciones" de claude.ai, `claude/evaluacion-funcional-2026-10-30.md` (evaluación, stack, negocio, etapas). Nota: el plan "Opción 1" de ese contexto ya está implementado; ver abajo por qué no alcanza.

## Regla de trabajo
Nada se da por funcionando sin una corrida que lo demuestre (log o prueba). No prometer en la UI cosas que el código no hace.

## Estado real del código (30/10/2026)
- Next.js 16 + React 19 + Tailwind 4 + shadcn. Playwright (Chrome real, `launchPersistentContext` en `.browser-user-data/`). Gemini `gemini-3.8-flash` vía `@google/genai`.
- `app/api/agent/run/route.ts`: bucle screenshot → Gemini → fill/click. Ya implementa el plan "Opción 1": borrar borrador, read-after-write (status "revisar"), archivos a `manual_actions_required`, corte ante "Enviar". Los campos se ubican por etiqueta de pregunta (`role=listitem`); el selector de Gemini es respaldo.
- Datos: siempre `data/obra-demo.json` (Monte Virgen, "Deseo, mantente firme"). El wizard no envía perfil ni honorarios.
- Wizard paso 2 (pre-evaluación) es fijo/simulado. `/api/ingest` no se usa y no descarga la convocatoria.
- Código muerto: `components/agent/*`, `lib/form-mapping.ts`.
- `next.config.mjs` tiene `typescript.ignoreBuildErrors: true`.

## Lo que se aprendió en las pruebas (logs/agent.log, FITCRUZ 2027)
- Texto y radio salen bien y verificados (secciones 1–3).
- **Archivos en Google Forms no se pueden subir con Playwright**: el botón abre el selector de Drive en un iframe; no hay `input[type=file]`. Los campos son obligatorios → "Siguiente" no avanza.
- **El agente no detecta el estancamiento**: la URL siempre es `/formResponse`; cuenta "página 4, 5, 6" siendo la misma sección y termina por timeout (300 s) como "ready_for_review". Métricas infladas por doble conteo.
- Cupo gratis de Gemini: 20 req/día; una corrida usa 15–20 (hasta 4 análisis por sección). Hay 429 y 503. Hace falta facturación con tope.
- El contexto persistente nunca se cierra: una segunda corrida con la ventana abierta probablemente choca con el bloqueo del perfil.
- "Borrar formulario" en cada corrida borra archivos que la persona haya subido a mano.

## Dirección acordada
- Producto comercial, calidad "impecable" = cero valores incorrectos sin aviso, ≥95% de campos correctos sobre un corpus de ~30 formularios reales.
- Leer la estructura del formulario desde el DOM (Google Forms: `FB_PUBLIC_LOAD_DATA_`), no desde capturas. LLM solo para mapear pregunta → respuesta y adaptar textos a límites/idioma (1 llamada de texto por formulario, salida estructurada).
- Archivos: pausa explícita para que la persona los suba y luego seguir.
- Arquitectura recomendada (decisión pendiente del usuario, que prefería "sin extensión"): app web como centro (ficha, materiales, historial, cobro) + extensión de Chrome que completa en el navegador del artista. No guardar sesiones de Google de usuarios en servidores.
- Playwright queda como banco de pruebas automáticas contra el corpus.

## Próximo paso
1. Crear un Google Form de prueba propio (copia del de FITCRUZ, armado a partir de capturas; script de Apps Script + campos de archivo agregados a mano). **No probar más contra convocatorias reales.**
2. Etapa 1 sobre ese formulario: detectar estancamiento por firma de sección, pausa para archivos, lectura por DOM, 1 llamada a Gemini, cerrar el contexto entre corridas, borrar borrador solo en la primera corrida.
Criterio: corrida completa hasta "Enviar" con solo los archivos como paso manual y < 5 llamadas a Gemini.

## Entorno
Windows, carpeta `C:\Users\USUARIO\Documents\DEV\stageflow-ai`, `pnpm dev`, clave en `.env.local` (`GEMINI_API_KEY`). Equipo: el dueño del producto + un BA senior.
