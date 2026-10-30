/**
 * Formulario B de prueba para el lector de estructura (T1).
 * Corto y con los tipos que el formulario A no tiene.
 * Uso: script.google.com → Nuevo proyecto → pegar esto → Ejecutar "crearFormB" → autorizar.
 * Al terminar, en "Registro de ejecución" aparece el link público.
 *
 * Creado el 30/10/2026:
 *   Público: https://docs.google.com/forms/d/e/1FAIpQLSdB-Spfi_-8eemcSWvTf_1lakNyaaDpQuhY7V5EkIOWay6S0Q/viewform
 *   Edición: https://docs.google.com/forms/d/1-469xlMKgRKAQjL4UKgix0EbKr-fcwlLChMLHnlXyLI/edit
 */
function crearFormB() {
  var form = FormApp.create('PRUEBA StageFlow — Formulario B (tipos)');
  form.setDescription('Formulario de prueba de StageFlow. No responder.');

  // Sección 1
  form.addCheckboxItem()
    .setTitle('¿En qué disciplinas trabaja la compañía?')
    .setChoiceValues(['Teatro', 'Danza', 'Música', 'Circo'])
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtLeast(1).build())
    .setRequired(true);

  form.addListItem()
    .setTitle('Provincia')
    .setChoiceValues(['Buenos Aires', 'Córdoba', 'Santa Cruz', 'Otra'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Año de estreno')
    .setValidation(FormApp.createTextValidation().requireNumberBetween(1950, 2027).build())
    .setRequired(false);

  // Sección 2
  form.addPageBreakItem().setTitle('Fechas y valoración');

  form.addDateItem()
    .setTitle('Fecha de estreno')
    .setRequired(true);

  form.addTimeItem()
    .setTitle('Horario preferido de función')
    .setRequired(false);

  form.addScaleItem()
    .setTitle('¿Qué tan adaptable es la obra a espacios no convencionales?')
    .setBounds(1, 5)
    .setLabels('Nada', 'Totalmente')
    .setRequired(true);

  form.addGridItem()
    .setTitle('Disponibilidad por mes')
    .setRows(['Enero', 'Febrero', 'Marzo'])
    .setColumns(['Disponible', 'No disponible'])
    .setRequired(true);

  form.addCheckboxGridItem()
    .setTitle('Necesidades técnicas por sala')
    .setRows(['Sala chica', 'Sala grande'])
    .setColumns(['Sonido', 'Luces', 'Proyector'])
    .setRequired(false);

  try { form.setPublished(true); } catch (e) { /* cuentas donde no aplica */ }
  Logger.log('Link público: ' + form.getPublishedUrl());
  Logger.log('Link de edición: ' + form.getEditUrl());
}
