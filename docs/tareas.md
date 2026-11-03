# Tareas — StageFlow AI

Tablero de tareas que mission control (chat general) asigna al **chat desarrollo** o a **Claude Code en Cursor** (según se indique en cada tarea). Copia en el repo: `docs/tareas.md`. Cada tarea se cierra solo con la evidencia que piden sus criterios de aceptación. Referencia del plan: `claude/plan-mvp.md`.

| ID | Paso del plan | Tarea | Estado |
|---|---|---|---|
| T1 | 1. Motor | Lector de estructura de Google Forms | **Cerrada y aprobada (30/10/2026)** — ver "Cierre" y "Verificación" abajo |
| T2 | 1. Motor | Respuestas para cada pregunta (mapeo con IA) | **Cerrada y aprobada (31/10/2026)** |
| T3 | 1. Motor | Completar y verificar el formulario de punta a punta (Claude Code en Cursor) | **Cerrada y aprobada (02/11/2026)** — criterio 2 reformulado |
| T4 | 2. Extensión | Extensión de Chrome: completar desde el panel lateral (Claude Code en Cursor) | **Cerrada y aprobada (02/11/2026)** |
| T5 | 3. Drive + Firebase | Servidor publicado y cuentas reales (chat desarrollo) | **Cerrada y aprobada (03/11/2026)** |
| T5a | 3. Drive + Firebase | Limpieza: la app muestra solo lo que funciona (chat desarrollo, dentro de la T5) | **Cerrada y aprobada (03/11/2026)** |
| T6 | 3. Drive + Firebase | La ficha sale sola del Drive, partiendo de cero (Claude Code en Cursor, rama `t6-drive`) | Asignada (03/11/2026) |

---

## T1 — Lector de estructura de Google Forms

**Objetivo:** dado el link de un Google Form cualquiera, obtener en segundos y sin IA la lista exacta de sus secciones y preguntas. Es la base de todo el motor: si esto no es exacto, nada de lo que sigue lo es.

**Contexto:** hoy el agente "mira" capturas con Gemini para adivinar dónde están los campos, y falla. Google Forms trae la estructura completa dentro de la página (variable `FB_PUBLIC_LOAD_DATA_`) y cada campo tiene un identificador fijo (`entry.<número>`). El lector usa eso.

**Qué hay que construir**
1. Una función que reciba el contenido de la página de un Google Form y devuelva su estructura en JSON:
   - Título del formulario y si requiere iniciar sesión.
   - Secciones (páginas) en orden, con su título.
   - Por cada pregunta: identificador (`entry.<número>`), título completo, texto de ayuda, tipo (respuesta corta, párrafo, opción múltiple, casillas, desplegable, archivo, fecha, hora, escala, cuadrícula), obligatoria sí/no, opciones si las tiene, y validaciones (email, URL, número, máximo/mínimo de caracteres).
   - Tipos que no reconozca: se marcan como `no_soportado` con su título, sin romper la lectura.
2. La función no puede usar nada exclusivo de Node, para que después funcione igual dentro de la extensión de Chrome.
3. Un comando para probarla: ~~`pnpm leer-form <link>`~~ `npm run leer-form -- <link> <nombre>` (pnpm no está instalado). Abre el formulario en el navegador con la sesión guardada, extrae la estructura, la imprime y la guarda en `fixtures/`.
4. Pruebas automáticas que corran sobre los JSON guardados, sin abrir el navegador.

**Formularios de prueba**
- **Formulario A:** el clon de FITCRUZ ya creado. https://docs.google.com/forms/d/e/1FAIpQLScGyoVrpvBNlHo-zruCVa8G07vl6mhcddmr2Uyt8Kbv8LsJKg/viewform
- **Formulario B:** creado el 30/10/2026 con `tools/crear-form-b.gs`. Público: https://docs.google.com/forms/d/e/1FAIpQLSdB-Spfi_-8eemcSWvTf_1lakNyaaDpQuhY7V5EkIOWay6S0Q/viewform — Edición: https://docs.google.com/forms/d/1-469xlMKgRKAQjL4UKgix0EbKr-fcwlLChMLHnlXyLI/edit

**Criterios de aceptación**
1. Con el Formulario A, el lector devuelve exactamente:
   - 5 secciones, con los títulos de cada página.
   - ~~24 preguntas: 19 de texto u opción y 5 de archivo~~ **23 preguntas: 19 de texto u opción y 4 de archivo** (corregido: el script solo define 4 bloques de archivo).
   - Obligatoriedad correcta en cada pregunta (todas las de texto u opción son obligatorias salvo "Autor(a) de la obra"). Nota: el archivo de permiso de derechos de autor quedó obligatorio en el formulario real (el script lo indicaba opcional); se aceptó así.
   - Las 4 validaciones: email, URL, máximo 500 caracteres en la reseña y número entero en cantidad de personas.
   - Un identificador `entry.<número>` en cada pregunta que no sea de archivo.
2. Con el Formulario B, reconoce cada tipo de pregunta con sus opciones. Si alguno queda como `no_soportado`, se informa y no rompe nada.
3. La comparación con la estructura real se hace pregunta por pregunta y se entrega como tabla: lo esperado, lo leído y si coincide. Cero diferencias.
4. **Cero llamadas a Gemini** u otra IA.
5. Tarda menos de 3 segundos desde que la página terminó de cargar.
6. Si el navegador no tiene la sesión iniciada y el formulario la exige, devuelve un aviso claro ("este formulario requiere iniciar sesión en Google") en lugar de fallar.
7. Corre dos veces seguidas con el mismo resultado.
8. No escribe nada en el formulario ni toca "Siguiente", "Borrar formulario" ni "Enviar".

**Fuera de esta tarea:** completar campos, IA, interfaz, extensión, Firebase.

### Cierre (30/10/2026)
Código: `lib/motor/google-forms/estructura.ts` (lector), `tools/leer-form.ts` (comando), `tests/` (pruebas). Último commit: `34db038`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| 1. Formulario A | ✅ 5 secciones, 23 preguntas, obligatoriedad, 4 validaciones, `entry` en todas | `fixtures/form-a.estructura.json` |
| 2. Formulario B | ✅ casillas, desplegable, número entre valores, fecha, hora, escala, cuadrícula de opción y de casillas; ninguno `no_soportado`; detecta que no requiere login | `fixtures/form-b.estructura.json` |
| 3. Comparación | ✅ 0 diferencias (A: 126 comprobaciones; B: 56) | `fixtures/comparacion-form-a.md`, `fixtures/comparacion-form-b.md` |
| 4. Sin IA | ✅ el lector no importa ningún cliente de IA | revisión de código |
| 5. Tiempo | ✅ 23–28 ms desde que cargó la página | salida real de `leer-form` |
| 6. Sin sesión | ✅ "Este formulario requiere iniciar sesión en Google." sin error (76 ms) | `leer-form ... --perfil-vacio` |
| 7. Repetible | ✅ dos corridas reales del B idénticas byte a byte | `fixtures/form-b.corrida2.estructura.json` |
| 8. No toca el formulario | ✅ solo `goto` y lectura del HTML | revisión de código |

Pruebas automáticas (`npm test`) en la máquina del usuario: 6 de 6 pasan. Se verificó además que la comparación detecta errores (con 3 datos alterados a propósito, marcó las 3 diferencias).

Hallazgo durante la tarea: Google guarda los límites numéricos como "1950.0"; el lector los devuelve como números. El formato `FB_PUBLIC_LOAD_DATA_` no está documentado: cada tipo nuevo que aparezca en el corpus debe sumarse con su fixture y su prueba.

### Verificación de mission control
**Verificación de mission control (30/10/2026):** revisado de forma independiente. Las 6 pruebas pasan en una copia limpia (6/6). El JSON del Formulario A tiene 5 secciones, 23 preguntas (16 respuesta corta, 2 párrafo, 1 opción múltiple, 4 archivo), `entry` en todas, las 4 validaciones y "Autor(a)" como única no obligatoria. Las dos corridas del B son idénticas. El lector no importa nada de Node ni de IA. El archivo de lo esperado se escribió antes que la lectura. Error de mission control en la consigna original: el script define 4 bloques de archivo, no 5. **T1 aprobada.**

---

## T2 — Respuestas para cada pregunta (mapeo con IA)

**Objetivo:** dada la estructura que devuelve el lector (T1) y la ficha de la obra, obtener con **una sola llamada** a la IA la respuesta propuesta para cada pregunta, diciendo de dónde sale. Todavía no se escribe nada en el formulario.

**Qué hay que construir**
1. Una función `proponerRespuestas(estructura, ficha)` que llame a Gemini una vez, con salida estructurada (esquema JSON fijo), y devuelva por cada pregunta:
   - `entry`, título de la pregunta.
   - `respuesta` (texto, opción u opciones según el tipo).
   - `origen`: `ficha` (dato tal cual, con el nombre del campo de la ficha), `adaptado` (dato de la ficha recortado, traducido o reformateado: indicar el campo), `propuesta_ia` (no está en la ficha pero se puede inferir; siempre a revisar), `sin_dato` (no hay información: se deja vacío) o `archivo_manual` (pregunta de archivo: indicar qué material sugerir).
   - `revisar`: sí/no.
2. Validación del lado del código (no confiar en la IA): la respuesta respeta el tipo (en opción múltiple, desplegable y casillas, solo opciones que existen), las validaciones del formulario (email, URL, número entero, máximo de caracteres) y no inventa datos de contacto ni nombres. Lo que no pase la validación queda en `revisar` con el motivo.
3. Un comando `npm run proponer -- <fixture> <ficha>` que muestre una tabla legible y guarde el resultado en `fixtures/`.
4. La ficha de esta tarea es `data/obra-demo.json` sin modificar.

**Criterios de aceptación**
1. **Antes de la primera corrida**, el chat desarrollo escribe `tests/respuestas-esperadas-form-a.json`: la respuesta correcta y el origen esperado de cada una de las 23 preguntas del Formulario A, y lo revisa Ezequiel. Ejemplos: el email es el de la ficha; la reseña tiene ≤ 500 caracteres; "Número de personas" es `2`; "Género", "Autor(a)" y la ficha artística completa no están en la ficha → `sin_dato` o `propuesta_ia` con `revisar`, nunca como dato seguro.
2. Con el Formulario A, cada respuesta coincide con lo esperado (comparación en tabla, igual que en T1). Para textos adaptados (la reseña), se acepta cualquier versión que respete el límite y no agregue información que no esté en la sinopsis original.
3. **Cero inventos:** ninguna respuesta con origen `ficha` o `adaptado` contiene un dato que no esté en la ficha. Se verifica por código para nombres, emails, teléfonos, números y links.
4. Con el Formulario B, las respuestas de opción usan solo opciones existentes, y las de fecha, hora y número tienen el formato que el formulario acepta.
5. **Una sola llamada** a Gemini por formulario. Se informan tokens de entrada y salida y el costo estimado en USD.
6. Tarda menos de 20 segundos por formulario.
7. Tres corridas seguidas sobre el A dan los mismos valores en todas las respuestas con origen `ficha` (las adaptadas pueden variar en redacción y siguen cumpliendo el criterio 2).
8. Si Gemini falla o no tiene cupo, se informa con un mensaje claro y no se devuelve una respuesta a medias como si estuviera completa.

**Requisito previo:** ✅ confirmado el 30/10/2026. Proyecto "Default Gemini Project" (gen-lang-client-0273571986), facturación Personal - GCP, Nivel 1, prepago (el crédito cargado funciona como tope). Gasto del mes al 30/10: USD 0,36. Límite de inversión mensual: USD 10 (se reinicia el día 1; puede excederse levemente por ~10 min de demora).

**Evidencia para cerrar:** el archivo de lo esperado, las tablas de comparación del A y del B, la salida de las tres corridas, tokens y costo, y la prueba del criterio 8.

**Fuera de esta tarea:** escribir en el formulario, navegación entre páginas, extensión, Firebase, Drive.

### Cierre (30/10/2026)
Código: `lib/motor/google-forms/respuestas.ts` (pedido + revisión por código, sin Node ni proveedor de IA), `lib/motor/ia/gemini.ts` (llamada, solo servidor), `lib/motor/proponer.ts`, `tools/proponer.ts`, `tests/respuestas.test.ts`. Último commit: `52e5458`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| 1. Esperado antes de correr | ✅ escrito y commiteado antes de la primera llamada (`8a46e56`); revisado por Ezequiel | `tests/respuestas-esperadas-form-a.json` |
| 2. Formulario A | ✅ 23/23 en las tres corridas finales | `fixtures/comparacion-respuestas-form-a.md`, `-form-a-2.md`, `-form-a-3.md` |
| 3. Cero inventos | ✅ 0 errores de revisión en las tres corridas; la revisión detecta emails, links, teléfonos, números y nombres (2+ palabras) ajenos a la ficha (probado con IA simulada) | `tests/respuestas.test.ts` |
| 4. Formulario B | ✅ 0 errores de opciones o formatos; lo que no está en la ficha queda `sin_dato` | `fixtures/form-b.respuestas.json` |
| 5. Una llamada | ✅ 1 por formulario, sin reintentos. A: ~2.750 tokens de entrada / ~1.930 de salida ≈ USD 0,0093. B: ≈ USD 0,0031 | salida de `proponer` |
| 6. < 20 s | ✅ A: 12,9–13,6 s; B: 4,5 s (con razonamiento "LOW") | salida de `proponer` |
| 7. Repetible | ✅ las tres corridas dan los mismos valores en las 9 respuestas con origen `ficha` | `npm test` |
| 8. Fallo de la IA | ✅ clave inválida → mensaje claro, nada guardado; tiempo agotado → corta el pedido y avisa; respuesta ilegible → error | corrida con clave falsa + `npm test` |

`npm test` en la máquina del usuario: 14 de 14.

Hallazgos durante la tarea:
- Con el razonamiento por defecto, gemini-3.8-flash a veces "piensa" 2.000+ tokens y tarda 24–30+ s (5 de 7 llamadas pasaron 30 s). Se fijó `thinkingLevel: LOW` (MINIMAL no está soportado en este modelo). Las llamadas cortadas por tiempo probablemente se cobraron. Gasto total de la tarea: menos de USD 0,20.
- La IA etiquetó como "adaptado" una autoría deducida. Se corrigió la consigna: "adaptado" solo si el campo lo dice explícitamente; las deducciones van como `propuesta_ia` (puede usar nombres de la ficha, nunca inventarlos).
- "revisar" lo decide el código, no la IA. Se separaron `motivos` (errores de la IA) y `avisos` (p. ej. "obligatoria y sin dato").
- Variación aceptable entre corridas en las propuestas: Género salió una vez como "Drama" (propuesta, a revisar) y dos veces vacío.

Pendientes para después de la T2 (datos confirmados por Ezequiel el 30/10; no se cargaron para no alterar la prueba):
- Teléfono correcto: +5491137581011 (la ficha tiene +549111537581011).
- Género: Biodrama ficcional. Autora: Melisa Schneider.

### Verificación de mission control (31/10/2026)
Revisado de forma independiente:
- **Pruebas:** 14/14 en una copia limpia del último commit (`git archive HEAD`).
- **Lo esperado se escribió antes:** `8a46e56` (22:57) es anterior al primer código que llama a la IA (`635f248`, 23:06). Entre esas versiones el archivo solo cambió de formato y sumó una regla verificable para "Ciudad" (`contiene_alguno`); ningún valor esperado se modificó para acomodarse a la IA. Sin cambios posteriores.
- **Respuestas reales del A, revisadas una por una:** 9 de la ficha tal cual, 6 adaptadas, 4 propuestas de la IA a revisar, 1 sin dato (Género), 4 archivos manuales. Las propuestas usan solo nombres que están en la ficha ("Autor(a): Melisa Schneider"; ficha artística "Dirección: Malena Vieytes / Actriz: Melisa Schneider", deducido de la trayectoria). Ningún dato inventado.
- **B:** 1 llamada, USD 0,003, opciones válidas; casi todo `sin_dato`, como corresponde a una ficha sin esos datos.
- **Observaciones para la T3:** (1) la aceptación de bases no debe tildarla el sistema: es una declaración del artista; (2) 10 de 19 respuestas quedan "a revisar": aceptable ahora, pero la ficha real desde Drive debe bajar ese número; (3) 13,6 s está cerca del límite de 20 s.

**T2 aprobada.**

---

## T3 — Completar y verificar el formulario de punta a punta (con Claude Code en Cursor)

**Objetivo:** cerrar el paso 1 del plan (Motor). Con las respuestas de la T2, completar el Formulario A en el navegador página por página, verificar cada campo, pausar donde hace falta una persona y frenar en "Enviar" sin apretarlo.

**Herramienta:** Claude Code en la terminal de Cursor, en la carpeta del repo. Empezar en modo plan.

**Paso 0 — Ficha:** cargar en `data/obra-demo.json` los datos confirmados por Ezequiel: teléfono `+5491137581011`, género "Biodrama ficcional", autora "Melisa Schneider". Commit propio. Las pruebas de la T2 deben seguir pasando (usan corridas guardadas).

**Qué hay que construir**
1. **Módulo de completado** (`lib/motor/google-forms/completar.ts`) que corra **dentro de la página** (solo DOM, sin Node ni Playwright, para reutilizarlo en la extensión). Dada la lista de respuestas y la página abierta:
   - Ubica cada campo de la sección visible por su `entry` (no por selectores inventados).
   - Completa según el tipo: respuesta corta, párrafo, opción múltiple, casillas, desplegable, fecha, hora, escala y cuadrículas.
   - Vuelve a leer cada campo después de escribirlo y devuelve, por campo: esperado, leído y estado (`ok`, `distinto`, `no_encontrado`).
   - Respeta la marca de la T2: completa `ficha`, `adaptado` y `propuesta_ia`; deja vacío `sin_dato`; no toca `archivo_manual`.
2. **Confirmaciones del artista:** preguntas de aceptación de bases, términos o declaraciones juradas (por ejemplo "He leído…", "Acepto…", "Declaro…") **no se completan**: quedan como `confirmacion_humana`, igual que los archivos.
3. **Recorrido** (`tools/completar.ts`, con Playwright y la sesión guardada): abre el link, propone respuestas (1 llamada a la IA, o reutiliza un archivo de respuestas guardado con `--respuestas`), completa sección por sección y avanza con "Siguiente".
   - **Detecta si avanzó** comparando la firma de la sección (título + entries visibles), no la URL. Si no avanzó, lee los mensajes de error de Google y dice qué pregunta bloquea.
   - **Pausa para la persona** cuando la sección tiene archivos obligatorios sin subir o una confirmación pendiente: muestra qué hacer ("Subí el dossier en PDF en la pregunta X"), espera hasta 10 minutos revisando cada pocos segundos, y sigue sola cuando la persona lo hizo.
   - **Nunca** hace clic en "Enviar" ni en "Borrar formulario". Si encuentra datos de una corrida anterior (borrador), los sobrescribe y verifica.
   - Al llegar a la última página, frena con "Enviar" visible y deja el navegador abierto.
4. **Informe** al final: tabla por campo (página, pregunta, esperado, leído, estado) y resumen (completados y verificados, a revisar, pendientes de la persona, llamadas a la IA, costo, tiempo).
5. **Formulario B:** como la ficha no tiene esos datos, usar un archivo de respuestas de prueba escrito a mano (`tests/respuestas-prueba-form-b.json`) con un valor para cada tipo de pregunta, para demostrar que el completado funciona con todos los tipos.

**Criterios de aceptación**
1. **Formulario A, primera corrida:** llega a la página 5 con "Enviar" visible. Las únicas pausas son las 4 preguntas de archivo y la aceptación de bases; tras hacerlas la persona, el recorrido sigue solo.
2. **Formulario A, segunda corrida seguida** (sin tocar nada entre medio): llega a la página 5 sin pausas, porque el borrador conserva archivos y confirmación, y vuelve a verificar todos los campos.
3. En ambas corridas, **todos los campos completados quedan `ok`** (lo leído coincide con lo esperado). Cero `distinto` o `no_encontrado`.
4. **Formulario B:** cada tipo de pregunta se completa y verifica `ok` con el archivo de respuestas de prueba.
5. **Detección de bloqueo probada:** con una respuesta obligatoria vacía a propósito, el recorrido no gira en falso: informa en menos de 10 segundos qué pregunta bloquea "Siguiente".
6. Nunca se hace clic en "Enviar" ni en "Borrar formulario" (verificable en el código y en el registro de la corrida).
7. Como mucho **1 llamada a la IA** por corrida. Tiempo total sin contar la espera de la persona: **menos de 90 segundos**.
8. El módulo de completado no importa nada de Node ni de Playwright, y tiene pruebas automáticas sobre HTML guardado de secciones reales.
9. `npm test` pasa completo (las pruebas de T1 y T2 siguen pasando).
10. No se modifica el agente viejo (`app/api/agent/run/route.ts`).

**Evidencia para cerrar:** informes de las dos corridas del A y la del B, la prueba del criterio 5, captura de la página 5 completa con "Enviar" visible, salida de `npm test` y commits. Actualizar "Cierre" en `docs/tareas.md`.

**Fuera de esta tarea:** extensión, interfaz, Firebase, Drive, Microsoft Forms.

**Con esto se cierra el paso 1 (Motor)** del plan.

### Cierre (02/11/2026) — Claude Code
Código: `lib/motor/google-forms/completar.ts` (completado, solo DOM), `tools/completar.ts` (recorrido, `npm run completar`), `tools/inyectar-completar.ts` (carga el módulo en la página quitándole los tipos con `node:module`, sin dependencias nuevas), `tools/capturar-seccion.ts`, `tests/completar.test.ts`, `tests/respuestas-prueba-form-b.json`. Commits `20848e7` a `24bb253` y el de este cierre.

| Criterio | Resultado | Evidencia |
|---|---|---|
| 1. A, primera corrida | ✅ con borrador vacío (Borrar formulario, hecho por Ezequiel): pausas solo en la bases (pág. 1) y los 4 archivos (págs. 3, 4, 5); llega a la pág. 5 con "Enviar" visible. En las págs. 3, 4 y 5 siguió sola tras cada archivo. En la pág. 1 la página cambió durante la pausa (la persona apretó "Siguiente"); que sigue sola tras la bases quedó probado en el primer intento (`form-a-1`) | `fixtures/t3/form-a-corrida1.informe.md`, `form-a-corrida1-final.png` |
| 2. A, segunda corrida sin pausas | ❌ **no se cumple: el borrador de Google no conserva los archivos subidos.** Sí conserva la bases y los textos (retomó directo en "Datos generales"). Hubo 3 pausas (los 4 archivos); tras subirlos, verificó de nuevo todos los campos: 18/18 ok | `fixtures/t3/form-a-corrida2.informe.md`, `form-a-corrida2-final.png` |
| 3. Todo `ok` | ✅ corrida 1: todos ok; corrida 2: 18/18 ok. Cero `distinto` / `no_encontrado` | informes de las dos corridas |
| 4. Formulario B | ✅ 8/8 ok (casillas, desplegable, respuesta corta, fecha, hora, escala, cuadrícula de opción y de casillas), llega a "Enviar", 0 llamadas a la IA, 5 s | `fixtures/t3/form-b.informe.md`, `form-b-final.png` |
| 5. Bloqueo | ✅ con la pregunta obligatoria de casillas vacía a propósito, informa en **0,8 s**: "¿En qué disciplinas trabaja la compañía?" — Esta pregunta es obligatoria. (Con "Fecha de estreno" no sirve: está en la última página, sin "Siguiente") | `fixtures/t3/form-b-bloqueo.informe.md` |
| 6. Nunca "Enviar" ni "Borrar" | ✅ único clic sobre botones: `clicSiguiente()` (`tools/completar.ts`), que lanza error si el texto no es "Siguiente"/"Next". Registro: solo clics en "Siguiente" | código + "Clics en botones" de cada informe |
| 7. ≤ 1 llamada, < 90 s | ✅ 1 llamada por corrida; sin contar la espera de la persona: 25,1 s (corrida 1) y 20,1 s (corrida 2) | informes |
| 8. Módulo sin Node/Playwright, con pruebas sobre HTML real | ✅ solo `import type`; 10 pruebas en Chromium de Playwright, sin red, sobre HTML guardado de secciones reales de A y B (vacías, completadas, con borrador, con archivo subido, con el selector de archivos abierto) | `tests/completar.test.ts`, `fixtures/html/` |
| 9. `npm test` | ✅ 26/26 (6 de T1, 8 de T2, 12 de T3); `npm test` ya no reescribe archivos commiteados (comparaciones a `salidas/`, ignorada) | salida de `npm test` |
| 10. Agente viejo | ✅ `app/api/agent/run/route.ts` sin cambios desde `ebd7a5e` | `git diff` |

**IA:** 4 llamadas en toda la tarea (primer intento, una corrida cortada por error, corrida 1 y corrida 2), ≈ USD 0,0375. El B y el bloqueo no usan IA.

**Hallazgos (para mission control):**
1. **El borrador de Google no conserva los archivos subidos** entre sesiones (sí la bases y los textos). Es lo que impide el criterio 2. Para la extensión: si la persona cierra y vuelve, tiene que subir los archivos de nuevo. Decidir si se reformula el criterio o si se acepta así.
2. **Desplegable con un valor previo del borrador:** los eventos disparados desde la página no lo cambian (la lista figura abierta pero las opciones no se dibujan). Con un clic real de Playwright sí funciona. Afecta a la extensión (no puede generar clics reales). Hoy: el módulo lo informa como `distinto` y el recorrido le pide a la persona que lo elija. El A no tiene desplegables. Decidir si se investiga más adelante.
3. DOM de Google Forms aprendido (documentado en `completar.ts`): el desplegable responde a mousedown + mouseup, no a click(); las cuadrículas se dibujan dos veces (la copia deshabilitada no tiene `data-field-index`); un archivo subido se marca con `[data-id][data-mime-type]` dentro de la pregunta y un input hidden `entry.N` **fuera** de la pregunta; el selector de archivos abre un `[role=dialog]` fuera del `<form>` con su propio título; los campos llegan deshabilitados hasta que corre el JS de Google; la página exige Trusted Types (`addScriptTag` no funciona; se inyecta con `addInitScript`).
4. La prueba de la T2 "IA simulada correcta" leía la ficha viva; ahora usa `tests/ficha-t2.json` (la ficha con la que se escribió lo esperado). Lo esperado de la T2 no se tocó.
5. Durante la tarea se corrigieron: ventana con tamaño fijo (la persona no podía scrollear), detección de archivos, pausa que se caía si la página se recargaba, y el selector de archivos que contaba como cambio de página. Los informes de la corrida 1 tienen filas repetidas por ese último error (ya corregido; la corrida 2 sale limpia).

### Verificación de mission control (02/11/2026)
Revisado de forma independiente:
- **Pruebas:** las 12 de la T3 pasan en una copia aparte con el Chromium de Playwright (sin el Chrome del usuario). Las de T1 y T2 siguen pasando.
- **Módulo de completado:** solo `import type`; listo para la extensión.
- **Corrida 2 del A (informe y captura):** 18 de 18 campos `ok`, llega a la página 5 con "Enviar" visible y sin apretar; los únicos clics en botones fueron 3 en "Siguiente"; 1 llamada a la IA (USD 0,0093); 20,1 s sin contar la espera de la persona.
- **Agente viejo:** sin cambios.

**Decisión 1 — Criterio 2 reformulado:** Google no conserva los archivos subidos en el borrador, así que el criterio queda: *"la segunda corrida retoma desde el borrador sin pedir de nuevo la aceptación de bases y solo pausa para los archivos"*. Se cumple. Consecuencia de producto: subir los archivos es siempre un paso de la persona en cada sesión; la extensión debe guiarlo bien (qué archivo de su Drive y en qué pregunta) y avisar que, si cierra el formulario, tendrá que subirlos de nuevo.

**Decisión 2 — Desplegable con valor previo del borrador:** no bloquea el paso 1 (queda informado como `distinto` y pasa a la persona, nunca silencioso). Pero los desplegables son comunes en convocatorias reales (país, provincia, disciplina), así que **se investiga en la T4**, dentro de la extensión, que es donde importa.

**T3 aprobada. Paso 1 (Motor) cerrado.**

---

## T4 — Extensión de Chrome: completar desde el panel lateral (paso 2 del plan)

**Herramienta:** Claude Code en Cursor. Empezar en modo plan.

**Objetivo:** que una persona, en su Chrome de siempre y con su sesión de Google, abra un formulario y lo complete desde el panel de StageFlow, sin terminal. Usa el motor de los pasos anteriores y la ficha de demo. Todavía sin Firebase, sin cuentas y sin Drive.

**Qué hay que construir**
1. **Extensión** (Chrome MV3, WXT + React + TypeScript) en la carpeta `extension/` del mismo repo, instalable con "Cargar descomprimida".
   - Permisos mínimos: solo páginas de Google Forms (`https://docs.google.com/forms/*`), panel lateral y almacenamiento. Nada de código remoto.
   - El script de contenido **importa directamente** `lib/motor/google-forms/estructura.ts` y `completar.ts` (los mismos archivos, sin copiarlos).
2. **Servidor:** una ruta `POST /api/respuestas` en la app Next.js que recibe la estructura, llama a `proponerRespuestas` con `data/obra-demo.json` y devuelve las propuestas. La clave de Gemini queda solo en el servidor.
   - Acceso temporal de desarrollo: un token de desarrollo configurado en la extensión y en `.env.local`, y la ruta solo acepta pedidos con ese token. (Las cuentas reales llegan en el paso 3.)
   - Corre local con `npm run dev`.
3. **Panel lateral**, en castellano simple y sin jerga técnica:
   - Al abrir un formulario: título y lista de preguntas de la sección visible con la respuesta propuesta y su origen ("de tu ficha", "propuesta, revisala", "sin dato").
   - Botón **"Completar esta página"**: escribe, verifica y muestra por campo si quedó bien o hay que mirarlo.
   - **Tareas de la persona** bien visibles: qué archivo subir en qué pregunta, y la aceptación de bases. Se tachan solas cuando la persona las hace.
   - La persona aprieta "Siguiente" en el formulario; el panel detecta la nueva página y ofrece completarla.
   - En la última página: "Revisá todo y apretá Enviar vos". Aviso fijo: "Si cerrás el formulario, Google no guarda los archivos: vas a tener que subirlos de nuevo".
   - Estados de error claros: servidor apagado, IA sin cupo o con falla, no es un Google Form, falta iniciar sesión.
4. **Una sola llamada a la IA por formulario:** las respuestas se piden una vez y se guardan para todas las páginas y si la persona recarga.
5. **Investigación del desplegable:** probar, dentro de la extensión, si se puede cambiar un desplegable que ya trae un valor del borrador. Documentar qué se probó, qué funciona y qué se recomienda (por ejemplo, dejarlo como tarea de la persona o usar otra vía), sin agregar permisos peligrosos sin consultarlo.

**Criterios de aceptación**
1. Con el Formulario A, en el Chrome normal de Ezequiel: el panel completa las 5 páginas y los 18 campos de texto y opción quedan verificados `ok`; las tareas de la persona (bases y 4 archivos) aparecen y se tachan solas al hacerlas; llega a la última página sin apretar "Enviar".
2. Con el Formulario B: todos los tipos quedan `ok`, salvo el caso documentado del desplegable con borrador, que aparece como tarea de la persona.
3. **1 llamada a la IA por formulario**, aunque se recargue la página o se cambie de sección.
4. Desde que se abre el panel hasta ver las respuestas: menos de 20 segundos.
5. **La clave de Gemini no aparece en ningún archivo de la extensión compilada** (verificado buscándola en la carpeta de salida).
6. La extensión nunca hace clic en "Enviar" ni en "Borrar formulario" (verificable en el código).
7. Cada estado de error del punto 3 se probó y muestra un mensaje que una persona no técnica entiende.
8. `npm test` sigue pasando y la extensión compila sin errores de TypeScript.
9. Informe de la investigación del desplegable con su recomendación.

**Evidencia para cerrar:** capturas del panel en cada momento (respuestas, completado, tareas de la persona, última página, un error), resultado de la búsqueda de la clave en la extensión compilada, salida de `npm test` y de la compilación, informe del desplegable, commits. Actualizar el estado en la tabla y el "Cierre" en `docs/tareas.md`.

**Fuera de esta tarea:** Firebase, cuentas, Drive, publicar en la Chrome Web Store, Microsoft Forms, que la extensión apriete "Siguiente".

### Cierre (02/11/2026) — Claude Code
Código: `extension/` (WXT + React + TypeScript, MV3: `entrypoints/content.ts`, `entrypoints/sidepanel/`, `lib/`), `app/api/respuestas/route.ts` + `lib/servidor/respuestas.ts`, `tests/api-respuestas.test.ts`, `tools/probar-extension.ts`, `tools/investigar-desplegable.ts`. Commits `4a25d6d` a `87809c7` y el de este cierre. La extensión se carga desde `extension/.output/chrome-mv3` (`cd extension && npm install && npm run build`); el servidor con `npm run dev`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| 1. A en el Chrome de Ezequiel | ✅ 5 páginas; 18/18 campos de texto y opción "quedaron bien" (5 + 7 + 4 + 2); tareas de la persona (bases y 4 archivos) aparecen y se tachan solas al hacerlas; última página con el cartel "Revisá todo y apretá «Enviar» vos", sin apretar "Enviar" | `fixtures/t4/capturas/chrome-a-*.png` |
| 2. B, todos los tipos | ✅ 8/8 ok desde el panel (casillas, desplegable, respuesta corta, fecha, hora, escala, cuadrícula de opción y de casillas), con las respuestas de prueba cargadas en la memoria de la extensión. En el Chrome de Ezequiel, con la ficha de demo: 2/2 ok (casillas y desplegable). El desplegable con borrador ya no es un caso aparte (ver hallazgo 1) | `fixtures/t4/verificaciones.md`, `capturas/b-todos-los-tipos-*.png`, `capturas/chrome-b-*.png` |
| 3. 1 llamada por formulario | ✅ B: recargar, cerrar y reabrir el panel, pasar de página → 1 llamada (contada en el registro del servidor). A en el Chrome de Ezequiel: 1 llamada en toda la corrida | `fixtures/t4/una-llamada-b.txt` |
| 4. < 20 s hasta ver las respuestas | ✅ B: 6,5 s; A: 12,8 s (Chrome de Ezequiel) | `capturas/chrome-b-1-respuestas.png`, `chrome-a-1-bases.png` |
| 5. Clave fuera de la extensión | ✅ 0 apariciones de la clave completa, de un tramo de 20 caracteres, de patrones de clave de Google y del texto `GEMINI_API_KEY` en `extension/.output/chrome-mv3` | `fixtures/t4/verificaciones.md` |
| 6. Nunca "Enviar" ni "Borrar" | ✅ la extensión no hace clic en botones del formulario; los únicos eventos son del motor, dentro de las preguntas. Con el panel cerrado no toca nada (probado en el Chrome de Ezequiel) | `fixtures/t4/verificaciones.md` |
| 7. Errores entendibles | ✅ no es un formulario / falta iniciar sesión (un mensaje para los dos; ver hallazgo 2), servidor apagado, IA sin cupo, IA con falla; "Probar de nuevo" probado | `fixtures/t4/errores.md`, `capturas/error-*.png` |
| 8. `npm test` y compilación | ✅ `npm test` 32/32; extensión: `tsc` y `wxt build` sin errores | `fixtures/t4/verificaciones.md` |
| 9. Informe del desplegable | ✅ | `docs/investigacion-desplegable.md` |

**IA en la tarea:** ~15 llamadas, ≈ USD 0,05 (estimado: el contador del servidor se reinicia con cada arranque). Incluye 4 llamadas desperdiciadas por errores de las pruebas, ya corregidos.

**Hallazgos y decisiones para mission control:**
1. **El desplegable con borrador sí se puede cambiar.** Lo de la T3 era un error del motor (la opción se buscaba antes de abrir la lista y Google la vuelve a dibujar), corregido en `4b4e892`. Probado con un borrador real de Google y desde la extensión. Hay que corregir el aprendizaje en `CLAUDE.md` ("Lo aprendido") y en `docs/plan-mvp.md` ("Límites conocidos"). La tarea de la persona para un desplegable `distinto` queda como red de seguridad.
2. **"Falta iniciar sesión" comparte mensaje con "no es un formulario":** sin sesión, Google manda la pestaña a `accounts.google.com`, donde la extensión no tiene acceso. Distinguirlo exigiría pedir acceso a la página de inicio de sesión de Google; no se hizo. Decidir si queda así.
3. El token de desarrollo va dentro de la extensión compilada (es lo previsto hasta las cuentas del paso 3). La clave de Gemini, no.
4. `next dev` se corta una vez por arranque mostrando un aviso que pide correr `next upgrade --agent=security`; no se ejecutó (fuera de la tarea). Al relanzarlo sigue funcionando. Conviene revisar las actualizaciones de seguridad de Next aparte.
5. Después de la corrida del A se hicieron tres retoques del panel, sin volver a probarlos en el Chrome de Ezequiel (sí compilación y el B automático): la tarjeta de la bases dice "La respondés vos", lo sugerido no muestra nombres internos de la ficha (como `tecnica_y_links.link_carpeta_drive`) y el texto de las tareas es más grande.
6. Para las pruebas: en una pestaña oculta Chrome frena las animaciones y el desplegable de Google no se abre; con el panel lateral real el formulario está siempre a la vista.

### Verificación de mission control (02/11/2026)
Revisado de forma independiente:
- **Commits y push:** `4a25d6d` a `01bb7d1`, ya en GitHub (`origin/main`).
- **Permisos de la extensión compilada:** solo `sidePanel` y `storage`, y el script de contenido solo en `https://docs.google.com/forms/*`. Sin código remoto.
- **Clave de Gemini:** buscada en `extension/.output` (tramo de 20 caracteres y patrón `AIza`): 0 apariciones.
- **El motor se reutiliza tal cual:** el script de contenido importa `estructura.ts` y `completar.ts` directamente, sin copias.
- **Servidor:** `/api/respuestas` rechaza pedidos sin el token (401) y responde CORS solo al origen que lo pide.
- **Pruebas:** las 20 que no usan navegador pasan en una copia limpia del último commit; las de navegador ya se verificaron en la T3.
- **Desplegable:** el informe (`docs/investigacion-desplegable.md`) es convincente: el problema era del módulo (buscaba la opción antes de abrir la lista), está corregido y probado con borrador real y desde la extensión, sin permisos nuevos.

**Decisiones:**
1. **Desplegable:** se corrige lo aprendido en `CLAUDE.md` y en el plan. La tarea de la persona para un desplegable `distinto` queda como red de seguridad.
2. **"Falta iniciar sesión":** queda compartido con "no es un formulario". No se pide acceso a la página de inicio de sesión de Google (sumaría un permiso sensible y alargaría la revisión de la Chrome Web Store). El mensaje debe mencionar las dos posibilidades.
3. **Actualización de seguridad de Next:** obligatoria antes de publicar el servidor; va como paso 0 de la T5.
4. **Token de desarrollo dentro de la extensión:** aceptable solo en local. Se elimina en la T5, al llegar las cuentas reales; la extensión no se distribuye antes.
5. **Retoques del panel sin probar en el Chrome de Ezequiel:** se verifican en la primera corrida de la T5.

**T4 aprobada. Paso 2 (Extensión) cerrado.**

---

## T5 — Servidor publicado y cuentas reales (paso 3 del plan, parte 1 de 3)

**Herramienta:** chat desarrollo (claude.ai, trabajando sobre la carpeta del repo en la computadora de Ezequiel). Antes de tocar código, presentar el plan. Varios pasos los hace Ezequiel en las consolas de Google: el chat desarrollo le indica cuáles y en qué orden. **Mientras tanto, Claude Code en Cursor no trabaja sobre el repo** (nunca dos herramientas a la vez).

**Objetivo:** que StageFlow deje de depender de la computadora de Ezequiel. El servidor queda publicado en Firebase, el artista entra con su cuenta de Google en la app web y en la extensión, y la ficha se guarda en Firestore. Todavía sin Drive: la ficha es la de demo, cargada a la cuenta de Ezequiel.

El paso 3 se divide en tres tareas: **T5** (servidor y cuentas), **T6** (ficha desde Drive) y **T7** (pantalla de revisión y la ficha que aprende).

**Paso 0 — Seguridad:** aplicar la actualización de seguridad que pide Next, en un commit propio. `npm test` y la compilación siguen pasando.

**Qué hay que construir**
1. **Firebase en el proyecto de Google Cloud existente** (`gen-lang-client-0273571986`, el de Gemini), con plan Blaze. **Alertas de presupuesto** de USD 10 y USD 25.
2. **App Hosting:** la app Next.js publicada desde la rama `main` de GitHub, con HTTPS. La dirección por defecto de Firebase alcanza; dominio propio más adelante.
3. **Secretos:** la clave de Gemini en Secret Manager, nunca en el repo ni en archivos que se suban.
4. **Cuentas:** "Entrar con Google" con Firebase Auth en la app web (con "Salir"). Pantalla de consentimiento de Google en modo prueba, con Ezequiel y el BA como usuarios de prueba.
5. **Firestore:** las obras de cada usuario guardadas a su nombre. La ficha de demo cargada a la cuenta de Ezequiel. La app web muestra "Mis obras" leyendo de Firestore (la ficha completa se edita en la T7).
6. **Reglas de seguridad:** cada usuario lee y escribe solo lo suyo. Probado con el emulador de Firestore: otro usuario no puede leer ni escribir datos ajenos.
7. **`/api/respuestas` con cuentas reales:** exige la sesión de Firebase del usuario (verificada en el servidor), usa la ficha de ese usuario desde Firestore y deja de aceptar el token de desarrollo.
8. **Extensión:** "Entrar con Google" en el panel con la misma cuenta; la sesión sobrevive a cerrar y abrir Chrome; habla con el servidor publicado. El token de desarrollo se elimina de la extensión. La extensión tiene un identificador fijo (necesario para el inicio de sesión y para que el servidor la reconozca).

**Criterios de aceptación**
1. La actualización de seguridad de Next está aplicada.
2. La app web publicada abre por HTTPS; Ezequiel entra con Google, ve su obra y sale.
3. La clave de Gemini no está en el repo ni en la extensión, y el servidor publicado la lee de Secret Manager.
4. Las pruebas de las reglas con el emulador pasan: un usuario no puede leer ni escribir obras de otro.
5. `/api/respuestas` publicado: sin sesión → 401; con sesión de otro usuario → no ve la ficha de Ezequiel; con la sesión de Ezequiel → responde con su ficha.
6. **De punta a punta, con el servidor publicado y la computadora sin `npm run dev`:** Ezequiel, en su Chrome, entra en el panel con su cuenta y completa el Formulario A con 18 de 18 campos verificados, las tareas de la persona tachándose solas y frenando en la última página. Se verifican también los retoques del panel de la T4.
7. Cerrar y abrir Chrome no pide entrar de nuevo.
8. No queda ningún token de desarrollo en la extensión compilada ni en el servidor publicado.
9. Costo: se informa lo usado de Firebase y Gemini durante la tarea; las alertas de presupuesto están activas (captura).
10. `npm test` pasa, más las pruebas nuevas de reglas y de la ruta con cuentas.

**Evidencia para cerrar:** dirección publicada, capturas (entrada, "Mis obras", panel con sesión, formulario completado, alertas de presupuesto), salida de las pruebas de reglas, pruebas de los 401, búsqueda de secretos en la extensión compilada, commits. Actualizar la tabla y el "Cierre" en `docs/tareas.md`.

**Fuera de esta tarea:** Drive, extraer la ficha de documentos, la pantalla de revisión, "la ficha aprende", publicar en la Chrome Web Store, dominio propio, cobro.

### Cierre (03/11/2026) — chat desarrollo
Commits `ab18637` a `751ab8f` (más la limpieza T5a, ya aprobada) y el de este cierre. Servidor publicado: **https://stageflow-ai--gen-lang-client-0273571986.us-east4.hosted.app** (App Hosting, backend `stageflow-ai`, se publica desde `main`). Evidencia en `fixtures/t5/`.

| Criterio | Resultado | Evidencia |
|---|---|---|
| 1. Seguridad de Next | ✅ 16.4.0 → 16.4.4 (tres fallas críticas, dos de ejecución remota de código sin sesión) | `37a97ef` |
| 2. App publicada: HTTPS, entrar, ver la obra, salir | ✅ abre por HTTPS; entra con Google y ve «Deseo, mantente firme» leída de Firestore. «Salir» se probó en local (misma app); en la publicada se ve el estado sin sesión antes de entrar | `c2-publicada-sin-sesion.png`, `c2-publicada-mis-obras.png`, `b3-despues-de-salir.png` |
| 3. Clave de Gemini solo en Secret Manager | ✅ `apphosting.yaml` la toma de Secret Manager (secreto `GEMINI_API_KEY`, versión 2); la primera publicación falló hasta darle acceso al backend, lo que confirma que la lee de ahí. 0 apariciones en el repo (`git grep`) y en la extensión compilada | `c1-app-hosting-publicado.png` |
| 4. Reglas probadas con el emulador | ✅ 5/5: el dueño lee y escribe; otro usuario no lee, no escribe ni borra; sin sesión nada; fuera de `usuarios/` todo cerrado. Reglas desplegadas | `reglas-emulador.txt` |
| 5. `/api/respuestas` publicado | ✅ sin sesión → 401; sesión falsa → 401; rutas viejas → 404; con la sesión de Ezequiel responde con su ficha (el panel recibió las respuestas). ⚠️ «Sesión de otro usuario» probado con pruebas automáticas (responde 404 `sin_obra` sin datos ajenos; el uid sale siempre de la sesión), no con una segunda cuenta real contra el servidor publicado | `c2-servidor-publicado-401.txt`, `c3-panel-servidor-publicado.png`, `tests/api-respuestas.test.ts` |
| 6. De punta a punta, sin `npm run dev` | ✅ Formulario A completado desde el panel con el servidor publicado: pág. 2 «5 respuestas quedaron bien», pág. 4 «4», pág. 5 «2»; tareas de archivo y bases tachándose solas; última página con «Revisá todo y apretá «Enviar» vos». ⚠️ En las capturas de la pág. 3 no se ve la línea del conteo (7 campos; el formulario muestra los valores escritos): 11 de 18 con conteo visible. Retoques de la T4 verificados: «La respondés vos», sugerencias sin nombres internos de la ficha, texto de tareas legible | `c4-a-01.png` a `c4-a-10.png` |
| 7. Cerrar y abrir Chrome no pide entrar | ✅ | `b5-panel-tras-reabrir-chrome.png` |
| 8. Sin token de desarrollo | ✅ 0 apariciones de `X-StageFlow`, `STAGEFLOW_TOKEN`/`STAGEFLOW_DEV` en la extensión compilada; el servidor ya no tiene código que lo lea; quitado de los dos `.env.local` y del README | búsqueda en `extension/.output` |
| 9. Costo y alertas | ✅ noviembre en Google Cloud: USD 0,09 (pronóstico del mes: USD 1,17). Gemini (prepago de AI Studio): ~3 llamadas en la tarea, ≈ USD 0,015. Alerta de **USD 10** activa. La de USD 25 no se creó, por decisión de Ezequiel | `c5-presupuesto-y-costo-noviembre.png`, `c5-prepago-ai-studio.png` |
| 10. Pruebas | ✅ `npm test` 35/35 (9 nuevas de la ruta con cuentas); `npm run test:reglas` 5/5 | salidas del 03/11 |

**Cómo quedó:**
- **App web:** «Entrar con Google» / «Salir» (Firebase Auth) y «Mis obras» desde Firestore (`usuarios/{uid}/obras`). La carga de la ficha de demo es un botón que solo existe en `npm run dev`.
- **Servidor:** `/api/respuestas` exige `Authorization: Bearer <sesión de Firebase>`, la verifica con `firebase-admin` y usa la ficha de ese uid (nunca un uid del pedido). CORS solo para la extensión de StageFlow.
- **Extensión:** identificador fijo `ibepmlkkjffdhonobnhhklckchmdbgjo` (clave pública en el manifiesto; la privada fuera de git), permiso nuevo `identity`, cliente OAuth de tipo extensión, Firebase Auth `web-extension`. Respuestas guardadas por cuenta. Habla con el servidor publicado (`WXT_STAGEFLOW_SERVIDOR` solo para probar en local).
- **Firebase:** proyecto `gen-lang-client-0273571986`, Firestore en `southamerica-east1`, pantalla de consentimiento en modo prueba con Ezequiel como único usuario de prueba (el BA todavía no participa).

**Hallazgos y decisiones para mission control:**
1. **Clave de Gemini rotada:** la original quedó a la vista en una captura de la terminal compartida en el chat. Se rotó, se guardó como versión 2 del secreto y se probó (`.env.local` actualizado).
2. **Clave pública de Firebase:** estaba restringida a 25 APIs de Firebase (sin Gemini). Se le quitó también «Firebase AI Logic API» (otra vía hacia Gemini desde el navegador, que no usamos).
3. **La pantalla de consentimiento estaba «En producción»** (cualquiera podía entrar). Se pasó a modo prueba. El único cliente OAuth previo era el que creó Firebase.
4. **Regiones:** App Hosting no ofrece Sudamérica; el servidor quedó en `us-east4` y Firestore en `southamerica-east1`. Hay una ida y vuelta entre regiones por pedido; no se notó en la prueba.
5. **Tiempo hasta ver las respuestas:** 21,5 s la primera vez (servidor que arranca de cero + IA). El criterio de 20 s era de la T4; conviene medirlo de nuevo con el servidor ya despierto antes de la beta.
6. **Error del panel encontrado y corregido:** en la confirmación de Google («Se ha registrado tu respuesta») el panel decía «Primera página» y ofrecía «Completar esta página». Ahora dice «Este formulario ya se envió. No hay nada para completar en esta página.» (`751ab8f`, probado con el Formulario B).
7. **Desarrollo local de aquí en adelante:** el servidor local verifica sesiones pero no puede leer Firestore sin credenciales. Para la T6/T7 hará falta `gcloud auth application-default login` o el emulador de Firestore. Java 21 quedó instalado en la máquina de Ezequiel (lo usa el emulador).
8. **Avisos de `npm audit` aceptados:** `@grpc/grpc-js` 1.9 dentro de la librería de Firebase para el navegador (solo se usa en Node; la extensión y la app web no lo incluyen y el servidor usa `firebase-admin`, con 1.14.7); avisos moderados de `glob`, `minimatch` y `rimraf` dentro de `firebase-admin` (herramientas internas, no atienden pedidos).
9. **Marca en la ventana de Google:** al entrar se lee «gen-lang-client-0273571986.firebaseapp.com». Se corrige en «Información de la marca» de la pantalla de consentimiento (nombre «StageFlow»); no bloquea.
10. **El identificador de la extensión cambia al publicarla en la Chrome Web Store** (paso 4): habrá que actualizarlo en el cliente OAuth, en `ORIGEN_EXTENSION` del servidor y en `extension/lib/config-publica.ts`.

**Para que mission control actualice en `CLAUDE.md`:** la app web tiene cuentas y «Mis obras»; el servidor está publicado en App Hosting y se publica solo desde `main` (cada push a `main` es una publicación); `/api/respuestas` usa la sesión de Firebase y ya no hay token de desarrollo; la extensión entra con Google y habla con el servidor publicado; `npm run test:reglas` (Java 21); `firestore.rules`, `firebase.json`, `.firebaserc` y `apphosting.yaml` en la raíz.


### Verificación de mission control de la T5 (03/11/2026)
Revisado de forma independiente:
- **Commits:** `f13d197` a `36c7d11`, en GitHub.
- **Reglas de Firestore:** cada usuario solo lee y escribe bajo `usuarios/{su uid}`; todo lo demás cerrado.
- **App Hosting:** la clave de Gemini se toma de Secret Manager; 0 a 2 instancias (sin costo en reposo y con tope).
- **La clave de Gemini (rotada)** no aparece en el repo ni en la extensión compilada.
- **Servidor publicado:** evidencia de 401 sin sesión y con sesión falsa, y 404 en las rutas viejas (no pude repetir la prueba desde acá: la red de esta sesión no llega a ese dominio).
- **Pruebas:** las 23 sin navegador pasan en una copia limpia del último commit.

**Decisiones:**
1. **Rotar la clave** fue lo correcto. Regla para adelante: no compartir capturas de la terminal o de `.env.local` con claves a la vista.
2. **Consentimiento en modo prueba, Firebase AI Logic desactivada y regiones:** aprobados.
3. **"Sesión de otro usuario" probada con pruebas automáticas y no con una segunda cuenta real:** aceptado por ahora. Antes de la beta se prueba con la cuenta del BA, que se suma como usuario de prueba.
4. **Los 21,5 s de la primera respuesta** (servidor que arranca de cero): se vuelven a medir con el servidor despierto antes de la beta. Si molesta, se evalúa `minInstances: 1` (tiene costo fijo).
5. **Nuevo flujo de trabajo, porque cada push a `main` publica el servidor:** desde la T6 se trabaja en una rama por tarea (`t6-drive`, etc.), y se fusiona a `main` solo cuando mission control aprueba la tarea. Queda en `CLAUDE.md`.
6. **Marca "StageFlow" en la pantalla de consentimiento:** se hace en la T7 o antes de la beta.
7. **Identificador de la extensión al publicarla:** queda anotado para el paso 4.
8. **Revisión de tipos de `tools/` y `tests/`** (observación de la T5a): se suma en la T6.

**T5 aprobada.**

---

## T5a — Limpieza: la app muestra solo lo que funciona

**Origen:** propuesta del chat desarrollo (02/11/2026), pedida por Ezequiel. Texto completo en el Proyecto: `claude/T5a-limpieza.md`. **Aprobada por mission control (02/11/2026) con los ajustes de abajo.**

**Herramienta:** chat desarrollo, en la misma sesión que la T5.
**Cuándo:** dentro de la T5, después del paso 0 (seguridad de Next) y antes de las cuentas en la app web.

**Objetivo:** que la app web y el servidor publicado muestren y hagan solo lo que funciona de verdad. Un artista no debe ver nada falso.

**Qué sale (resumen; el inventario completo está en `claude/T5a-limpieza.md`):**
- **Servidor:** el agente viejo (`app/api/agent/run`) y `app/api/ingest` (los dos llaman a Gemini sin sesión), y la variable `STAGEFLOW_SIMULAR_FALLA_IA`.
- **App web de v0:** pantalla del agente viejo, asistente con pre-evaluación simulada, `components/agent/*`, `lib/form-mapping.ts`, `lib/plays.ts`, menú, encabezado y botones de funciones que no existen, textos que prometen postular solo, metadatos de v0 y `@vercel/analytics`, componentes sin uso.
- **`public/`:** placeholders, imágenes que no son de la cuenta y `public/test-assets/`.
- **Documentación y configuración vieja:** README, `docs/ARCHITECTURE.md`, `docs/DIAGNOSTICO-MVP.md`, `docs/GUIA-USUARIO.md`, el contexto viejo en la raíz, archivos de pnpm, `tools/capturar-form.mjs`, `ignoreBuildErrors`. Nombre del paquete → `stageflow`. Playwright a dependencias de desarrollo.

**Qué queda:** motor, extensión, `/api/respuestas`, herramientas, pruebas, fixtures, scripts de los formularios de prueba, `docs/plan-mvp.md`, `docs/tareas.md`, `docs/investigacion-desplegable.md`, `AGENTS.md` y `data/obra-demo.json` (solo como semilla y para pruebas).

**Ajustes de mission control:**
1. **Se queda** `.browser-user-data/` (sesión que usan `leer-form` y `completar`) y todo lo que usen las herramientas de prueba. Antes de borrar algo, comprobar que ningún archivo que queda lo importa o lo lee.
2. **Borrar con `git rm`**, para que quede en el historial. La carpeta conectada no permite borrar por defecto: el chat desarrollo pide el permiso una vez, para la carpeta del repo, explicando para qué.
3. **Un commit por bloque** (servidor, app web, `public/`, documentación y configuración), así cualquier cosa se puede recuperar o revertir por separado.
4. **`CLAUDE.md`, `docs/plan-mvp.md` y `docs/tareas.md` los mantiene mission control.** El chat desarrollo solo actualiza el "Cierre" de la T5a en `docs/tareas.md` y deja en el cierre lo que haya que cambiar en `CLAUDE.md`; no reescribe los otros dos. Así no vuelve a pasar lo de las versiones pisadas.
5. El README nuevo dice solo lo que hay hoy: qué es StageFlow, que completa Google Forms desde la extensión y nunca envía, cómo correr el servidor, las pruebas y la extensión, y dónde está el plan.

**Criterios de aceptación**
1. Ningún texto visible ni metadato promete algo que el código no hace (lista de cada texto y botón visible con su función real).
2. Ningún dato inventado a la vista.
3. Cero botones o enlaces que no hacen nada.
4. Las únicas rutas de API son `/api/respuestas` (según la lista de rutas de `npm run build`).
5. Ninguna ruta llama a la IA sin sesión una vez publicada (hasta las cuentas, `/api/respuestas` mantiene el token de desarrollo y no se publica).
6. `npm run build` pasa **sin** `ignoreBuildErrors`.
7. `npm test` pasa y la extensión compila.
8. Ningún archivo que queda referencia a algo borrado.
9. El cierre lista todo lo borrado con su motivo; todo es recuperable en git.
10. Captura de la app web antes y después.

**Fuera de esta tarea:** cuentas y Firestore, rediseño visual, cambios en el motor o en la extensión (salvo lo necesario para compilar).

### Cierre (03/11/2026) — chat desarrollo
Commits, uno por bloque: `d4d62b2` (servidor), `810cea4` (app web), `83e192a` (`public/`), `2dda594` (documentación y configuración) y el de este cierre. Antes, el paso 0 de la T5: `37a97ef` (Next 16.4.0 → 16.4.4). Todo lo borrado se hizo con `git rm` y se recupera desde el historial.

| Criterio | Resultado | Evidencia |
|---|---|---|
| 1. Ningún texto promete lo que el código no hace | ✅ ver la lista de textos visibles abajo | `fixtures/t5a/despues-inicio.png` |
| 2. Ningún dato inventado a la vista | ✅ la página no muestra datos de obras (llegan con las cuentas, en la T5) | captura |
| 3. Cero botones o enlaces que no hacen nada | ✅ la página no tiene botones ni enlaces | `app/page.tsx` |
| 4. Única ruta de API: `/api/respuestas` | ✅ `npm run build` lista `○ /`, `○ /_not-found` y `ƒ /api/respuestas` | salida de `npm run build` (03/11, máquina de Ezequiel) |
| 5. Ninguna ruta llama a la IA sin sesión una vez publicada | ✅ las dos rutas sin sesión (`/api/agent/run`, `/api/ingest`) se borraron; `/api/respuestas` mantiene el token de desarrollo hasta las cuentas y todavía no se publica | código |
| 6. `npm run build` sin `ignoreBuildErrors` | ✅ "Finished TypeScript" sin errores. `tsconfig.json` excluye `extension/` (tiene su propia configuración), `tools/`, `tests/` y `fixtures/` (los corre Node, no los compila Next) | salida de `npm run build` |
| 7. `npm test` y extensión | ✅ `npm test` 32/32; `wxt build` sin errores | salidas del 03/11 |
| 8. Nada referencia algo borrado | ✅ `git grep` de cada ruta y archivo borrado: solo quedan menciones en `CLAUDE.md` (ver abajo), en las evidencias de T3/T4 (históricas) y en `components.json` (configuración del generador de componentes; apunta a carpetas que se recrean al agregar uno) | `git grep` |
| 9. Lista de lo borrado con su motivo | ✅ abajo | — |
| 10. Captura antes y después | ✅ | `fixtures/t5a/antes-inicio.png`, `antes-asistente.png`, `despues-inicio.png` |

**Textos visibles de la app web y su función real (criterio 1):**
| Texto | Qué hay detrás |
|---|---|
| "StageFlow — Te ayuda a completar formularios de convocatorias con los datos de tu obra. Vos revisás y enviás." | Lo que hacen el motor y la extensión (T1–T4). |
| Pasos 1 y 2: abrir el formulario en Chrome y el panel de StageFlow | Extensión con panel lateral (T4). |
| Paso 3: propone respuestas diciendo de dónde sale cada dato | `proponerRespuestas` con origen por respuesta (T2), mostrado en el panel (T4). |
| Paso 4: «Completar esta página» escribe, verifica y marca lo que hay que revisar | Botón del panel + `completar.ts` (T3, T4). |
| Paso 5: archivos y bases los hace la persona; el panel dice cuáles y dónde | Tareas de la persona en el panel (T4). |
| Paso 6: StageFlow nunca envía | Verificado en T3 y T4 (nunca clic en "Enviar"). |
| "En desarrollo: solo Google Forms y lo usa únicamente el equipo" | Estado real. |
| Metadatos (título "StageFlow" y descripción) | Mismo contenido que arriba, sin "detecta convocatorias" ni "postula". |

**Lo borrado y por qué:**
- **Servidor:** `app/api/agent/run` (agente viejo; llamaba a Gemini sin sesión y abría un navegador), `app/api/ingest` (sin uso; llamaba a Gemini sin sesión), la variable `STAGEFLOW_SIMULAR_FALLA_IA` (la falla se simula ahora en la prueba, inyectando `proponer`).
- **App web:** `app/agente/` (pantalla "buscá la ventana de Chromium"), `components/dashboard/` (asistente con pre-evaluación simulada, menú con "Convocatorias detectadas · 3 nuevas", encabezado con buscador, campana "3 sin leer", avatar "LM", "Nueva obra" y "Cerrar sesión" sin función, tarjeta con "Postular" y "Editar ficha"), `components/agent/` y `lib/form-mapping.ts` (código muerto), `lib/plays.ts` (obra con género, fecha y materiales inventados), `components/ui/`, `lib/utils.ts` y `hooks/` (sin uso tras lo anterior), `@vercel/analytics` y `generator: v0.app`.
- **`public/`:** íconos y placeholders por defecto de v0, `la-noche-de-pandoras.png` (otra obra), `deseo-mantente-firme.png` (solo la usaba la tarjeta de la maqueta; la imagen de cada obra llega desde Drive en la T6). `public/test-assets/` (dossier y foto de prueba) se **movió** a `fixtures/archivos-de-prueba/`: antes se servía a cualquiera.
- **Documentación y configuración:** `README.md` viejo (reemplazado por uno que dice solo lo que hay), `docs/ARCHITECTURE.md`, `docs/DIAGNOSTICO-MVP.md`, `docs/GUIA-USUARIO.md` (describían el agente que mira capturas), `stageflow_ai_contexto_para_claude_code.md` (copia vieja; vive en el Proyecto), `pnpm-lock.yaml`, `pnpm-workspace.yaml` y `packageManager: pnpm`, `tools/capturar-form.mjs` (reemplazado por `npm run leer-form`), `typescript.ignoreBuildErrors`. Dependencias quitadas por no tener uso: `@base-ui/react`, `class-variance-authority`, `clsx`, `cn`, `lucide-react`, `tailwind-merge`, `@vercel/analytics`. `playwright` y `shadcn` pasan a desarrollo. `npm audit --omit=dev`: 0 vulnerabilidades (las 6 que muestra `npm install` son de herramientas de desarrollo).
- Corregido de paso: el texto de uso de `tools/leer-form.ts` decía `pnpm`.

**Para que mission control actualice en `CLAUDE.md`:**
- Línea 26: el agente viejo (`app/api/agent/run/route.ts`) ya no existe en el repo; queda en el historial de git (antes de `d4d62b2`).
- "Estado real": la app web es una sola página informativa; no hay wizard, ni pre-evaluación, ni `components/agent/*` ni `lib/form-mapping.ts`; `public/` no existe; los archivos de prueba están en `fixtures/archivos-de-prueba/`; el build compila sin `ignoreBuildErrors`.
- `docs/plan-mvp.md` no requiere cambios por esta tarea.

**Observaciones:**
- El ícono "N" abajo a la izquierda de la captura es el indicador de Next en modo desarrollo; no aparece en la versión publicada.
- La app web queda sin ícono de pestaña (los de v0 eran genéricos). Se puede sumar uno propio más adelante.
- `npm install` en la máquina de Ezequiel quitó del `package-lock.json` dependencias opcionales de `@google/genai` (servidor MCP) que no usamos; se incluye en este commit.

### Verificación de mission control (03/11/2026)
Revisado de forma independiente en el repo:
- **Commits:** uno por bloque (`d4d62b2`, `810cea4`, `83e192a`, `2dda594`) más el cierre `2ccfb25`, todos en GitHub. Paso 0 de la T5 hecho antes: Next 16.4.0 → 16.4.4 (`37a97ef`).
- **Servidor:** la única ruta de API que queda en `app/` es `api/respuestas`.
- **App web:** una sola página (`app/page.tsx`) sin botones ni enlaces; cada texto describe algo que existe (verificado contra T1–T4). Captura "después" revisada.
- **`public/` ya no existe;** los archivos de prueba están en `fixtures/archivos-de-prueba/`, ya no se sirven a nadie.
- **Sin referencias colgadas:** `git grep` de lo borrado solo encuentra la mención en `CLAUDE.md` (actualizada ahora) y la explicación del README de los archivos de prueba.
- **Sin secretos:** la clave de Gemini no aparece en ningún archivo del repo. (Las cadenas `AIza` de `fixtures/html/` son claves públicas del propio Google Forms, incluidas en las páginas guardadas.)
- **`next.config.mjs` sin `ignoreBuildErrors`;** paquete `stageflow`; Playwright en desarrollo.
- **Pruebas:** las 20 sin navegador pasan en una copia limpia del último commit.

**Observación para más adelante (no bloquea):** `tsconfig.json` excluye `tools/` y `tests/`, y Node los ejecuta quitando los tipos sin revisarlos, así que hoy nada verifica los tipos de esos archivos. Conviene sumar un `npm run typecheck` con su propia configuración cuando haya un momento (por ejemplo, al cerrar la T5).

**T5a aprobada.**

---

## T6 — La ficha sale sola del Drive (paso 3 del plan, parte 2 de 3)

**Herramienta:** Claude Code en Cursor, en la rama `t6-drive` (no en `main`: cada push a `main` publica el servidor). Empezar en modo plan.

**Objetivo:** el artista tiene **todo el material de su obra en una carpeta de Drive** (textos, PDFs, documentos, fotos, videos) y StageFlow arma la ficha sola a partir de esa carpeta, con la fuente de cada dato. **El Drive es la única fuente:** nada de datos cargados a mano ni archivos del repo. Los archivos se quedan en su Drive; StageFlow guarda solo los datos y la referencia a cada archivo.

**Paso 0b — Partir de cero (pedido por Ezequiel, 03/11/2026):** antes de probar la extracción, sacar todo lo que pueda contaminar la prueba:
- Borrar la obra de demo de Firestore (la de la cuenta de Ezequiel) y quitar el botón que la carga en desarrollo. "Mis obras" tiene que quedar vacío hasta conectar una carpeta.
- El servidor y la app no leen ningún archivo local de datos: `/api/respuestas` usa solo la ficha guardada en Firestore.
- `data/obra-demo.json` y la ficha congelada de la T2 pasan a `fixtures/` como **datos de prueba del motor** (las pruebas de T1–T4 los siguen usando), con un README que diga que no son datos de ningún usuario. Se borra `fixtures/archivos-de-prueba/` si nada lo usa.
- Commit propio. Comprobar con `git grep` que ningún código de la app, el servidor ni la extensión lee esos archivos.

**Paso 0 — Revisión de tipos:** `npm run typecheck` que revise también `tools/` y `tests/` (observación de la T5a). Commit propio.

**Paso 1 — Investigación del permiso de Drive (antes de construir la pantalla):** probar si, con el permiso liviano (`drive.file`) y el selector de Google, eligiendo **una carpeta** se pueden listar y leer los archivos que tiene adentro. Documentar el resultado en `docs/investigacion-permiso-drive.md` con las opciones y su costo para el artista:
- (a) carpeta con `drive.file`, si funciona;
- (b) elegir varios archivos con el selector (`drive.file`);
- (c) leer todo el Drive (`drive.readonly`): sin auditoría solo mientras haya menos de 100 usuarios de prueba.

**Mission control decide** la opción antes de construir la pantalla. Mientras tanto se puede avanzar con el paso 2, que no depende de esto.

**Paso 2 — Extracción (servidor):**
- Dado una carpeta de Drive **(incluidas sus subcarpetas)**, leer cada archivo según su tipo:
  - **Texto** (`.txt`, Google Docs, Word) como texto.
  - **PDF** (el dossier) con Gemini leyendo el PDF directamente.
  - **Imágenes** por sus metadatos (resolución, peso, formato), sin IA.
  - **Videos:** sin IA (es caro y no aporta datos de la ficha). Se catalogan con su nombre, duración y peso, y se avisa que los formularios suelen pedir un **link** (YouTube o Vimeo), no el archivo. Si algún documento trae links de video, se asocian.
  - Cualquier otro tipo: se lista como "otro" sin procesar.
- Clasificar cada archivo: dossier, foto, rider o ficha técnica, prensa, otro.
- Extraer la ficha con IA: **cada dato con su fuente** (archivo y página o fragmento citado) y un estado: `seguro`, `revisar` (deducido) o `conflicto` (dos fuentes dicen cosas distintas: se guardan las dos).
- **Verificación por código, sin confiar en la IA:** el fragmento citado como fuente tiene que aparecer en el texto del archivo; si no aparece, el dato pasa a `revisar` con el motivo. Ningún nombre, email, teléfono, número o link puede aparecer en la ficha si no está en algún archivo.
- **Materiales:** lista de archivos con su tipo, la referencia de Drive y avisos (foto de menos de 300 DPI, archivo de más de 10 MB, link no público).
- La ficha nueva guarda los datos que ya usa `/api/respuestas` (la T2 sigue funcionando sin cambios en su lógica).

**Paso 3 — Pantalla mínima en la app web:** "Conectar la carpeta de tu obra" → progreso → la ficha armada **solo para leer**, con colores (verde seguro, amarillo revisar o conflicto, vacío) y la fuente de cada dato a la vista. Editar y confirmar llega en la T7.

**Seguridad:** el permiso de Drive se usa en el momento y no se guarda en Firestore ni en registros. No se copia ningún archivo a Firebase.

**Criterios de aceptación**
1. Informe de la investigación del permiso, con la opción que decida mission control implementada.
2. **Carpeta de prueba:** una carpeta de Drive elegida por Ezequiel con el material real de una obra, con al menos un PDF, un texto, un documento, fotos y un video, y alguna subcarpeta. **Antes de la primera corrida con IA**, Ezequiel escribe (o revisa) `tests/ficha-esperada-carpeta-prueba.json` con los datos correctos que hay en esa carpeta, como se hizo en la T2.
3. **Partir de cero:** antes de conectar la carpeta, "Mis obras" está vacío y `/api/respuestas` responde "sin obra"; ningún código de la app, el servidor ni la extensión lee archivos de datos del repo (`git grep`).
4. Con la carpeta de prueba: **al menos 95% de los datos correctos** comparando con lo esperado (tabla dato por dato) y **cero inventos** (verificado por código).
5. Cada dato muestra su fuente, y el fragmento citado aparece en el archivo de origen.
6. Los conflictos entre documentos se muestran como conflicto, no se elige uno en silencio.
7. Materiales: todos los archivos de la carpeta y sus subcarpetas clasificados (incluidos los videos, con duración y peso); los avisos de calidad son correctos (comprobados contra los archivos reales).
8. Costo menor a USD 0,10 y tiempo menor a 2 minutos para la carpeta de prueba. Se informan llamadas, tokens y costo.
9. **Regresión:** con la ficha nueva, el Formulario A se completa desde la extensión contra el servidor (en local o en una vista previa, no en `main`) con todos los campos de texto y opción verificados.
10. Ningún token de Drive guardado en Firestore ni en registros; ningún archivo copiado a Firebase.
11. `npm test`, `npm run test:reglas` y `npm run typecheck` pasan; la extensión compila.

**Requisitos previos (Ezequiel):** activar la API de Drive y el selector de Google en el proyecto; credenciales locales para Firestore (`gcloud auth application-default login` en la terminal de Cursor, o el emulador); armar la carpeta de prueba en Drive y compartir con Claude Code su ubicación.

**Evidencia para cerrar:** informe del permiso, la ficha esperada y la extraída, tabla de comparación, prueba de cero inventos, capturas de la pantalla, costo y tiempo, corrida de regresión del A, salidas de las pruebas, commits en la rama `t6-drive`. Actualizar el "Cierre" en `docs/tareas.md`.

**Fuera de esta tarea:** editar y confirmar la ficha, versiones de los textos (sinopsis corta, inglés) y "la ficha aprende" (T7); varias obras con selector en el panel; subir archivos sin Drive; publicar en `main`.
