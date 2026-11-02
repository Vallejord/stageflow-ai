# T4 — Verificaciones de cierre (criterios 2, 5, 6 y 8)

Fecha: 02/11/2026.

## Criterio 2 · Formulario B, todos los tipos desde el panel
`node tools/probar-extension.ts todos-los-tipos-b` — respuestas de prueba (`tests/respuestas-prueba-form-b.json`) cargadas en la memoria de la extensión (la ficha de demo no tiene esos datos); el panel completa por el camino normal. 0 llamadas a la IA.

```
Página 1: Listo: las 3 respuestas quedaron bien.
   ¿En qué disciplinas trabaja la compañía?: ok   (casillas)
   Provincia: ok                                   (desplegable)
   Año de estreno: ok                              (respuesta corta)
Página 2: Listo: las 5 respuestas quedaron bien.
   Fecha de estreno: ok                            (fecha)
   Horario preferido de función: ok                (hora)
   ¿Qué tan adaptable es la obra a espacios: ok    (escala)
   Disponibilidad por mes: ok                      (cuadrícula de opción)
   Necesidades técnicas por sala: ok               (cuadrícula de casillas)
```
Capturas: `capturas/b-todos-los-tipos-p1.png`, `capturas/b-todos-los-tipos-p2.png`. El desplegable con borrador ya no es un caso aparte (ver `docs/investigacion-desplegable.md`).

## Criterio 5 · La clave de Gemini no está en la extensión compilada
Búsqueda en `extension/.output/chrome-mv3` (6 archivos), con el valor de `GEMINI_API_KEY` leído de `.env.local` sin mostrarlo:
- clave completa: **0** apariciones
- un tramo de 20 caracteres de la clave: **0**
- cualquier patrón de clave de Google (`AIza…`): **0**
- el texto `GEMINI_API_KEY`: **0**
- el token de desarrollo (esperado: es lo que identifica a la extensión ante el servidor): 1

## Criterio 6 · Nunca "Enviar" ni "Borrar formulario"
- La extensión no tiene ningún clic sobre botones del formulario. Los únicos eventos que dispara están en el motor (`lib/motor/google-forms/completar.ts`): escribir texto (`input`/`change`), marcar opciones dentro de una pregunta (radios y casillas) y presionar opciones del desplegable.
- En la extensión, "Enviar" y "Siguiente" solo aparecen como texto del panel para la persona ("Revisá todo y apretá «Enviar» vos", "apretá «Siguiente» en el formulario") y para detectar la última página.
- En las pruebas, "Siguiente" lo aprieta el script de prueba haciendo de persona (`tools/probar-extension.ts`), nunca la extensión.

## Criterio 8 · Pruebas y compilación
- `npm test`: 32/32.
- Extensión: `tsc --noEmit` sin errores; `wxt build` sin errores.
