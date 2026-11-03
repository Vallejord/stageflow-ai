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

## Estado (03/11/2026)
- **Pasos 1 (Motor) y 2 (Extensión) cerrados:** T1–T4 aprobadas.
- **T5 y T5a aprobadas:** app web con "Entrar con Google" y "Mis obras" (Firestore `usuarios/{uid}/obras`); servidor publicado en Firebase App Hosting (`https://stageflow-ai--gen-lang-client-0273571986.us-east4.hosted.app`); `/api/respuestas` exige la sesión de Firebase (sin token de desarrollo); la extensión entra con Google y habla con el servidor publicado. La app web es una sola página honesta; no existe `public/`. Next 16.4.4.
- **T6 asignada a Claude Code (vos), en la rama `t6-drive`:** la ficha sale sola del Drive. Ver `docs/tareas.md`.
- Configuración en la raíz: `firestore.rules`, `firebase.json`, `.firebaserc`, `apphosting.yaml`. Pruebas: `npm test`, `npm run test:reglas` (emulador, Java 21).

## Flujo de ramas
- **Cada push a `main` publica el servidor.** Cada tarea se trabaja en su rama (`t6-drive`, …) y se fusiona a `main` solo cuando mission control la aprueba.
- Nunca compartir capturas de la terminal o de `.env.local` con claves a la vista.

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
- El desplegable con valor previo del borrador **sí** se completa: hay que buscar la opción **después** de abrir la lista, porque Google vuelve a dibujar las opciones (ver `docs/investigacion-desplegable.md`).
- Detalles del DOM de Google Forms aprendidos en la T3: ver comentarios en `lib/motor/google-forms/completar.ts`.

## Entorno
Windows. Carpeta `C:\Users\USUARIO\Documents\DEV\stageflow-ai`. Usar `npm` (pnpm no está instalado). Clave en `.env.local` (`GEMINI_API_KEY`), facturación prepaga con tope mensual de USD 10. Perfil de navegador con sesión de Google en `.browser-user-data/` (no se sube a git).
