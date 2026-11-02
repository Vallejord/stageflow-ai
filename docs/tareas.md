# Tareas — StageFlow AI

Tablero de tareas que mission control (chat general) asigna al **chat desarrollo** o a **Claude Code en Cursor** (según se indique en cada tarea). Copia en el repo: `docs/tareas.md`. Cada tarea se cierra solo con la evidencia que piden sus criterios de aceptación. Referencia del plan: `claude/plan-mvp.md`.

| ID | Paso del plan | Tarea | Estado |
|---|---|---|---|
| T1 | 1. Motor | Lector de estructura de Google Forms | **Cerrada y aprobada (30/10/2026)** — ver "Cierre" y "Verificación" abajo |
| T2 | 1. Motor | Respuestas para cada pregunta (mapeo con IA) | **Cerrada y aprobada (31/10/2026)** |
| T3 | 1. Motor | Completar y verificar el formulario de punta a punta (Claude Code en Cursor) | Asignada (31/10/2026) |

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
