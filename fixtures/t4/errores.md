# T4 — Estados de error del panel (criterio 7)

Probados el 02/11/2026 en el Chromium de Playwright con la extensión compilada (`node tools/probar-extension.ts panel-en <url> <nombre>`).
Las fallas de la IA se forzaron con `STAGEFLOW_SIMULAR_FALLA_IA` (solo en desarrollo, sin llamar a la IA).

| Estado | Cómo se provocó | Lo que muestra el panel | Captura |
|---|---|---|---|
| No es un Google Form | Panel sobre https://example.com | "No vemos un formulario de Google Forms en esta pestaña. Abrí el link de la convocatoria. **Si Google te pide iniciar sesión**, iniciá sesión con tu cuenta: el formulario se abre solo y StageFlow sigue desde ahí." | `capturas/error-no-es-formulario.png` |
| Falta iniciar sesión | Formulario A en un perfil sin sesión: Google manda la pestaña a `accounts.google.com/v3/signin/…` | El mismo mensaje (ver nota) | `capturas/error-sin-sesion.png` |
| Servidor apagado | Extensión compilada apuntando a un puerto sin servidor (`localhost:3999`) | "No pudimos conectarnos con StageFlow. Revisá tu conexión a internet y probá de nuevo." + botón "Probar de nuevo" | `capturas/error-servidor-apagado.png` |
| IA sin cupo | `STAGEFLOW_SIMULAR_FALLA_IA=sin_cupo` (el servidor responde 503) | "El asistente llegó a su límite de uso por ahora. Probá de nuevo en unos minutos." + "Probar de nuevo" | `capturas/error-ia-sin_cupo.png` |
| IA con falla | `STAGEFLOW_SIMULAR_FALLA_IA=otro` (502) | "El asistente tuvo un problema. Probá de nuevo en unos minutos." + "Probar de nuevo" | `capturas/error-ia-otro.png` |

**"Probar de nuevo" funciona:** con la IA sin cupo el panel muestra el error; al quitar la falla y tocar el botón aparecen las respuestas ("Respuestas listas en 8,6 s").

**Nota sobre "falta iniciar sesión":** cuando el formulario exige sesión, Google redirige la pestaña a `accounts.google.com`, donde la extensión no tiene acceso (sus permisos son solo `docs.google.com/forms/*`). Por eso el panel no puede distinguir "falta sesión" de "otra página" y muestra un mensaje único que cubre los dos casos. Distinguirlo exigiría darle a la extensión acceso a la página de inicio de sesión de Google; no se hizo (decisión para mission control). Cuando la persona inicia sesión, Google vuelve al formulario y el panel sigue solo.
