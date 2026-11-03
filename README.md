# StageFlow

StageFlow ayuda a artistas a completar formularios de convocatorias con los datos de su obra.
Hoy funciona con **Google Forms**, desde una **extensión de Chrome** con un panel al costado del formulario.
**Nunca envía:** completa, verifica cada campo, avisa qué falta (archivos, aceptación de bases) y la persona aprieta «Enviar».

Está en desarrollo y lo usa solo el equipo. El plan y las tareas están en `docs/plan-mvp.md` y `docs/tareas.md`.

## Qué hay en este repo

| Carpeta | Qué es |
|---|---|
| `lib/motor/` | El motor: lee la estructura del formulario (sin IA), propone respuestas con una sola llamada a Gemini y completa y verifica cada campo dentro de la página. |
| `app/` | La app web (Next.js): entrar con Google y «Mis obras». La única ruta de API es `POST /api/respuestas`, que usa la extensión con la sesión de la persona. |
| `extension/` | La extensión de Chrome (WXT + React). Usa el mismo motor, sin copiarlo. |
| `tools/` | Herramientas de desarrollo: leer un formulario, proponer respuestas, completar un formulario con Playwright. |
| `tests/`, `fixtures/` | Pruebas automáticas y los datos guardados con los que corren. |
| `data/obra-demo.json` | La ficha de demo (Monte Virgen, «Deseo, mantente firme»), para pruebas. |

## Cómo correrlo (Windows, con npm)

Requisitos: Node 24 y un archivo `.env.local` en la raíz con `GEMINI_API_KEY` (no se sube a git). El servidor publicado (Firebase App Hosting, se publica solo desde `main`) toma la clave de Secret Manager.

```
npm install
npm run dev        # servidor en http://localhost:3000
npm test           # pruebas
npm run build      # compilación de producción
```

Extensión:

```
cd extension
npm install
npm run build      # se carga en Chrome desde extension/.output/chrome-mv3 («Cargar descomprimida»)
```

La extensión habla con el servidor publicado y entra con la cuenta de Google de la persona. Para probarla contra un servidor local: `WXT_STAGEFLOW_SERVIDOR=http://localhost:3000` en `extension/.env.local`. Las reglas de la base de datos se prueban con `npm run test:reglas` (necesita Java 21).

Herramientas (usan la sesión de Google guardada en `.browser-user-data/`):

```
npm run leer-form -- <link del formulario> <nombre>
npm run proponer -- fixtures/<nombre>.estructura.json data/obra-demo.json <nombre>
npm run completar -- <link del formulario> <nombre>
```

Las pruebas se hacen solo contra formularios propios (los scripts que los crean están en `tools/*.gs`), nunca contra convocatorias reales.
