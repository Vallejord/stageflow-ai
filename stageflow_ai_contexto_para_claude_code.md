# CONTEXTO DEL PROYECTO: STAGEFLOW AI
**Para:** Claude Code (Asistente de Desarrollo Local)
**Objetivo Inmediato:** Estabilizar el MVP del script de automatización (`/api/agent/run/route.ts`) eliminando la impredecibilidad del modelo de visión.

## 1. Visión General
StageFlow AI es un SaaS diseñado para artistas teatrales independientes. Su función principal es automatizar el llenado de formularios de convocatorias (Google Forms, Microsoft Forms) utilizando un perfil de datos único de la obra de teatro, ahorrando tiempo al usuario.

**Regla de Oro del Producto:** El sistema NUNCA envía el formulario automáticamente. Completa los datos, pausa la ejecución y el humano (artista) revisa y presiona el botón "Enviar" manualmente (Human-in-the-Loop).

## 2. Stack Tecnológico Actual
*   **Framework:** Next.js 16 (App Router), React 19.
*   **Estilos y UI:** Tailwind CSS 4, shadcn/ui.
*   **Automatización:** Playwright (`chromium`).
*   **IA (Actualmente en uso):** Google Gemini (`gemini-3.8-flash` vía `@google/genai`) usando prompts multimodales (visión).

## 3. Estado Actual de la Base de Código
El desarrollo se encuentra atascado en la estabilización del motor del agente. 
*   **Frontend:** Interfaz en `localhost:3000` con un "Modal Wizard" que toma una URL de un formulario y lanza un POST a `/api/agent/run`.
*   **Datos:** Actualmente hardcodeados en `src/data/obra-demo.json` (Obra: "Deseo, mantente firme", Compañía: "Monte Virgen"). La interfaz "Añadir obra" aún no es funcional.
*   **Motor (El problema):** El endpoint `/api/agent/run/route.ts` orquesta un bucle `WHILE`. Toma un screenshot, se lo pasa a Gemini Vision, Gemini devuelve XPath/Selectores CSS intentando adivinar los inputs, y Playwright ejecuta `.fill()` o `.click()`.

## 4. Problemas Críticos Encontrados (Por qué falló el enfoque anterior)
El intento de crear un agente 100% autónomo basado en visión fracasó en la práctica por las siguientes razones:

1.  **Bloqueo de Login:** Los formularios reales (ej. Google Forms de festivales) exigen cuenta de Google. Un Playwright efímero era bloqueado. 
    *   *Workaround actual:* Se implementó `chromium.launchPersistentContext('./.browser-user-data')` para guardar las cookies y la sesión del usuario tras un primer login manual.
2.  **Borradores Malditos (Google Forms):** Si el agente falla a mitad del formulario, Google guarda un borrador. En la siguiente ejecución, el agente inserta datos en los inputs equivocados porque la página ya estaba parcialmente llena.
3.  **Inestabilidad de Selectores:** Gemini inventa selectores CSS/XPath mirando una imagen. Frecuentemente se equivoca, causando que Playwright escriba en el input erróneo o se quede sin cuota de API reintentando.
4.  **Carga de Archivos Imposible:** Google Forms usa un iframe conectado a Google Drive para el botón "Añadir archivo". `page.setInputFiles()` de Playwright falla por CORS y seguridad.

## 5. El Nuevo Plan (MVP Estricto - "Opción 1")
**Directivas para Claude Code:** Abandona el enfoque de "laboratorio de IA". Tu tarea es modificar `/api/agent/run/route.ts` para implementar este flujo a prueba de fallos:

1.  **Limpiar la mesa primero:** Apenas Playwright abre la URL del Google Forms, debe buscar un botón de "Borrar formulario" o "Clear form" al pie de la página y hacerle clic (aceptando el diálogo de confirmación). Si no existe, ignora el paso.
2.  **Validación "Read-after-Write":** Modifica la función que ejecuta la acción `fill`. El flujo debe ser:
    *   Playwright escribe el dato en el selector indicado por la IA.
    *   Inmediatamente después, extrae el valor actual usando `page.inputValue(selector)`.
    *   Si el valor leído NO coincide con el escrito, marca la acción como fallida (`status: "revisar"`) en los logs y la respuesta.
3.  **Rendición ante los Archivos (Manual Override):** No intentes automatizar el botón de subir archivos (`type: "file"` o "Añadir archivo"). Si el prompt de análisis detecta que se piden archivos (ej. fotos a 300 DPI, dossier en PDF), el agente debe omitir esa acción y agregarla a un array en la respuesta final: `manual_actions_required: [...]`.
4.  **Parada Segura:** Si se detecta un botón "Enviar" o "Submit", el bucle `WHILE` debe romperse inmediatamente, devolviendo el estado `ready_for_review` y manteniendo el navegador abierto.

## 6. Tu Misión Inmediata (Claude Code)
1.  Lee el archivo `/api/agent/run/route.ts`.
2.  Refactoriza el bucle y la ejecución de acciones para cumplir los 4 puntos de la Sección 5.
3.  Prueba el script contra un formulario local o público básico y asegura que los logs muestren claramente el proceso *Read-after-Write*.