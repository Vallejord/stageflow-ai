# StageFlow AI — contexto para Claude Code

Herramienta para que artistas (teatro, música, danza, escritura, artes visuales) postulen a festivales, convocatorias y subsidios con el menor trabajo posible: su información sale de su Google Drive y StageFlow completa cada formulario. **Regla de oro: el sistema nunca envía. Completa, verifica, avisa qué falta y la persona aprieta "Enviar".**

## Leé antes de trabajar
1. `docs/plan-mvp.md` — **referencia única del plan.** Si algo no está ahí, no se hace.
2. `docs/tareas.md` — tablero de tareas con criterios de aceptación. Trabajá **solo la tarea que te asignen**, de a una.

Estos dos archivos son copia de los documentos del Proyecto "agente de postulaciones" en claude.ai, donde trabaja el chat "mission control" (planifica, decide y aprueba). Si cerrás una tarea, actualizá su sección "Cierre" en `docs/tareas.md` con la evidencia; mission control la verifica y sincroniza.

## Reglas de trabajo
- **Nada se da por funcionando sin una corrida que lo demuestre.** Al cerrar, mostrá la evidencia que piden los criterios.
- Antes de codear, explicá en pocas líneas el plan y cómo vas a probar cada paso.
- **No probar contra convocatorias reales.** Solo los formularios de prueba A y B (links en `docs/tareas.md`).
- Nunca hacer clic en "Enviar" de un formulario.
- No abrir frentes fuera de la tarea asignada. Si algo del plan parece mal, decilo en vez de cambiarlo por tu cuenta.
- Contar y reportar las llamadas a la IA y su costo.
- Un commit por paso significativo, con mensaje claro.

## Estado (30/10/2026)
- **T1 cerrada y aprobada:** lector de estructura de Google Forms en `lib/motor/google-forms/estructura.ts`; comando `npm run leer-form -- <link> <nombre>`; pruebas con `npm test`; fixtures en `fixtures/`.
- **T2 cerrada y aprobada:** respuestas para cada pregunta con una llamada a Gemini (`lib/motor/google-forms/respuestas.ts`, `lib/motor/ia/gemini.ts`, `npm run proponer`).
- **T3 cerrada y aprobada:** completado solo DOM en `lib/motor/google-forms/completar.ts`; recorrido `npm run completar`. **Paso 1 (Motor) cerrado.**
- **T4 asignada a Claude Code (vos):** extensión de Chrome con panel lateral. Ver `docs/tareas.md`.
- El agente viejo (`app/api/agent/run/route.ts`, captura → Gemini → Playwright) queda como referencia histórica; no se sigue extendiendo.

## Decisiones tomadas
- Arquitectura: **app web + extensión de Chrome** (completa en el navegador del artista). Sin sesiones de Google de usuarios en servidores ni navegadores en la nube.
- Stack: **Next.js** (app web) + **Firebase** (Auth, Firestore, Cloud Storage, App Hosting) + **Gemini** (siempre desde el servidor) + **Drive API**, todo en un proyecto de Google Cloud. Extensión: Chrome MV3 + React + TypeScript (WXT).
- La estructura del formulario se lee de la página (sin IA); la IA solo decide qué responder.
- El código del motor no usa nada exclusivo de Node, para poder correr dentro de la extensión.

## Lo aprendido (no repetir)
- Google Forms: los campos de archivo abren el selector de Drive en un iframe; no se pueden completar con Playwright. Son paso manual.
- Si una pregunta obligatoria queda vacía, "Siguiente" no avanza y la URL no cambia (`/formResponse`): detectar por contenido de la sección, no por URL.
- "Borrar formulario" borra también lo que la persona subió a mano.
- El borrador de Google conserva textos y confirmaciones, pero **no los archivos subidos**.
- Un desplegable con valor previo del borrador no cambia con eventos disparados desde la página (sí con un clic real).
- Detalles del DOM de Google Forms aprendidos en la T3: ver comentarios en `lib/motor/google-forms/completar.ts`.

## Entorno
Windows. Carpeta `C:\Users\USUARIO\Documents\DEV\stageflow-ai`. Usar `npm` (pnpm no está instalado). Clave en `.env.local` (`GEMINI_API_KEY`), facturación prepaga con tope mensual de USD 10. Perfil de navegador con sesión de Google en `.browser-user-data/` (no se sube a git).
