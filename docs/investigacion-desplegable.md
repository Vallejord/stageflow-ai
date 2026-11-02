# Investigación: desplegable que ya trae un valor del borrador (T4, punto 5)

Fecha: 02/11/2026 · Autor: Claude Code · Sin llamadas a la IA.

## Pregunta
En la T3 quedó registrado como límite de Google Forms: *"un desplegable que ya trae un valor del borrador no se puede cambiar con eventos disparados desde la página (sí con un clic real)"*. ¿Es así dentro de la extensión? ¿Qué se recomienda?

## Conclusión
**No es un límite de Google: era un error del módulo, corregido en la T4 (commit `4b4e892`).** Con el módulo corregido, el desplegable se cambia y se vacía tanto con un borrador real de Google como desde la extensión, con eventos disparados desde la página. No hace falta `chrome.debugger` ni ningún permiso nuevo.

## Causa
El módulo ubicaba la opción buscada (por ejemplo, "Santa Cruz") **antes** de abrir la lista. Al abrirse, Google vuelve a dibujar las opciones, y el módulo presionaba la opción vieja, que había quedado invisible (alto 0): no se elegía nada. En la T3, el registro de esa prueba mostraba justamente la opción con alto 0 durante 2 segundos, y se interpretó como que Google no dibujaba la lista. Ahora la opción se busca después de abrir la lista, entre las visibles (`elegirEnDesplegable` en `lib/motor/google-forms/completar.ts`).

## Qué se probó
Script reproducible: `node tools/investigar-desplegable.ts` (Formulario B, pregunta "Provincia").

- **A · Borrador real:** Chrome con la sesión de Google (`.browser-user-data`), el módulo corriendo en la página. Primero se deja "Córdoba" en el borrador y se recarga, para que el valor lo ponga Google al abrir.
- **B · Extensión:** la extensión compilada en el Chromium de Playwright; el pedido va al script de contenido (contexto aislado), como lo hace el panel.

| Caso | Acción | Antes | Después | |
|---|---|---|---|---|
| A · borrador real | cambiar a Santa Cruz | Córdoba | Santa Cruz | ✅ |
| A · borrador real | recargar: ¿Google guardó el cambio? | Santa Cruz | Santa Cruz | ✅ |
| A · borrador real | vaciar (opción "Elige") | Santa Cruz | (vacío) | ✅ |
| A · borrador real | recargar: ¿Google guardó el vacío? | (vacío) | (vacío) | ✅ |
| B · extensión | elegir Córdoba (resultado del módulo: ok) | (vacío) | Córdoba | ✅ |
| B · extensión | cambiar a Santa Cruz (resultado del módulo: ok) | Córdoba | Santa Cruz | ✅ |
| B · extensión | vaciar (opción "Elige") | Santa Cruz | (vacío) | ✅ |

También se confirmó en el Chrome de Ezequiel (prueba del Formulario B, paso 4): el panel eligió "Córdoba" en el desplegable y verificó `ok`.

## Otras vías que se habían considerado (no hicieron falta)
- `chrome.debugger` (clics reales del navegador): pide un permiso delicado y muestra un cartel en Chrome. **No se agregó.**
- Script en el contexto principal de la página: en una prueba aparte, el procedimiento corregido funciona igual en el contexto aislado del script de contenido y en el principal; no hace falta.
- Escribir directo el campo oculto `entry.N`: no hace falta, y la pantalla quedaría distinta de lo que se envía.

## Recomendación
1. Dejar el desplegable como un tipo más que la extensión completa y verifica.
2. Mantener la red de seguridad que ya existe: si un desplegable queda `distinto` (por cualquier motivo), el panel lo muestra como tarea de la persona ("Elegí «X» en «pregunta»") y se tacha cuando lo hace.
3. **Corregir el aprendizaje registrado** (lo decide mission control, que mantiene esos documentos): en `CLAUDE.md` ("Lo aprendido") y en `docs/plan-mvp.md` ("Límites conocidos de Google Forms"), la frase sobre el desplegable con borrador ya no es cierta.

## Aprendido de paso (para las pruebas)
- En una pestaña oculta Chrome frena las animaciones y el desplegable de Google no llega a abrirse. Con el panel lateral real el formulario está siempre a la vista; las pruebas automáticas traen el formulario al frente.
