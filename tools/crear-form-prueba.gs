/**
 * StageFlow AI — Formulario de prueba "Clon FITCRUZ"
 * ---------------------------------------------------
 * Replica las funciones y la complejidad del formulario real de FITCRUZ 2027:
 * 5 páginas, preguntas bilingües, obligatorias, radio de aceptación, límite de
 * 500 caracteres, campo numérico, descripciones largas y 5 subidas de archivo
 * (con login de Google obligatorio y borrador automático).
 *
 * CÓMO USARLO
 * 1. Entrá a https://script.google.com con tu cuenta de Google → "Nuevo proyecto".
 * 2. Borrá lo que haya, pegá TODO este archivo y guardá.
 * 3. Elegí la función "crearFormularioPrueba" y tocá "Ejecutar".
 *    Google te pide autorizar: "Revisar permisos" → tu cuenta → "Configuración avanzada"
 *    → "Ir a ... (no seguro)" → "Permitir". Es tu propio script, es normal.
 * 4. En "Registro de ejecución" aparecen el link para editar y el link público.
 * 5. PASO MANUAL (Google no permite crear preguntas de archivo por script):
 *    abrí el link de edición y reemplazá cada bloque "⚠ REEMPLAZAR" por una
 *    pregunta del tipo "Subir archivo" con la configuración que indica el bloque.
 *    Después borrá el bloque. Son 5. Al agregar la primera, Google avisa que los
 *    archivos van a tu Drive y que hay que iniciar sesión: aceptá (eso replica el
 *    login obligatorio del formulario real).
 */
function crearFormularioPrueba() {
  var form = FormApp.create('PRUEBA StageFlow — Clon FITCRUZ 2027');
  form.setDescription(
    'Formulario de PRUEBA para StageFlow AI. No es una convocatoria real.\n' +
    'Replica la estructura del Formulario de postulación FITCRUZ 2027.'
  );
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(true);
  form.setConfirmationMessage('Postulación de prueba recibida.');

  // ---------- PÁGINA 1: aceptación de bases ----------
  form.addSectionHeaderItem()
    .setTitle('Bases de la convocatoria (Call guidelines)')
    .setHelpText('Antes de postular, leé las bases de la convocatoria. (Please read the call guidelines before applying.)');

  form.addMultipleChoiceItem()
    .setTitle('He leído minuciosamente las bases de la convocatoria y estoy de acuerdo con todo lo explicado en dicho documento. (I have carefully read the call guidelines and agree with everything explained in that document.)')
    .setChoiceValues(['Sí (Yes)'])
    .setRequired(true);

  // ---------- PÁGINA 2: datos generales ----------
  form.addPageBreakItem().setTitle('Datos generales (General information)');

  form.addTextItem().setTitle('Nombres y apellidos del representante del grupo (Names and surnames of the group representative)').setRequired(true);
  form.addTextItem().setTitle('País (Country)').setRequired(true);
  form.addTextItem().setTitle('Ciudad (City)').setRequired(true);
  form.addTextItem().setTitle('Teléfono celular (Cell phone)').setRequired(true);
  form.addTextItem()
    .setTitle('Correo electrónico (E-mail)')
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Ingresá un correo válido.').build())
    .setRequired(true);

  // ---------- PÁGINA 3: datos de la obra ----------
  form.addPageBreakItem().setTitle('Datos de la obra (Production details)');

  form.addTextItem().setTitle('Nombre de la obra (Production title)').setRequired(true);
  form.addTextItem().setTitle('Disciplina (Theatrical discipline)').setRequired(true);
  form.addTextItem().setTitle('Género (Genre)').setRequired(true);
  form.addTextItem().setTitle('Rango de edad del público recomendado (Recommended audience age)').setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Reseña de la obra (máximo 500 carac.) (Production´s synopsis)')
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(500).setHelpText('Máximo 500 caracteres.').build())
    .setRequired(true);
  form.addTextItem().setTitle('Duración del espectáculo (Performance length)').setRequired(true);
  marcadorArchivo(form,
    'Dossier de la obra (historial de la obra y compañía, archivos de prensa y crítica, información adicional relevante. Archivo PDF) (Performance dossier - PDF file)',
    'Tipo: Subir archivo · Solo PDF · Hasta 5 archivos · Máx. 10 MB · OBLIGATORIA');
  form.addTextItem()
    .setTitle('Enlace del video con la obra completa, sin cortes ni cambios de cámara, visualizable en Youtube o Vimeo. (Link to the youtube or vimeo video of the proposed production)')
    .setHelpText('No se aceptan enlaces de archivos descargables. La calidad mínima será de 720p y con buena calidad de audio. (Downloadable files are not accepted. Minimum quality 720p with good audio.)')
    .setValidation(FormApp.createTextValidation().requireTextIsUrl().setHelpText('Ingresá un enlace válido.').build())
    .setRequired(true);
  marcadorArchivo(form,
    'Adjuntar al presente formulario tres (3) fotografías de la obra en formato digital con una resolución mínima de 300 DPI (3 300 DPI performance photos)',
    'Tipo: Subir archivo · Solo Imagen · Hasta 5 archivos · Máx. 10 MB · OBLIGATORIA');

  // ---------- PÁGINA 4: ficha artística ----------
  form.addPageBreakItem().setTitle('Ficha artística (Artistic details)');

  form.addTextItem().setTitle('Autor(a) de la obra (Author´s name)');
  marcadorArchivo(form,
    'Adjuntar los documentos que certifiquen el permiso de derechos de autor para presentar la obra. (Archivo PDF). (Professional stage licence)',
    'Tipo: Subir archivo · Solo PDF · Hasta 5 archivos · Máx. 10 MB · opcional');
  form.addTextItem().setTitle('Director(a) de la obra (Stage director)').setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Ficha artística completa: elenco y equipo creativo (Full cast and creative team)')
    .setHelpText('Un rol por línea. Ej.: "Iluminación: Nombre Apellido". (One role per line.)')
    .setRequired(true);
  form.addTextItem()
    .setTitle('Número de personas que estarían en el Festival (artistas, equipo técnico y dirección) (Number of people that would be coming to the festival)')
    .setValidation(FormApp.createTextValidation().requireWholeNumber().setHelpText('Ingresá un número entero.').build())
    .setRequired(true);

  // ---------- PÁGINA 5: ficha técnica ----------
  form.addPageBreakItem().setTitle('Ficha técnica (Technical information)');

  marcadorArchivo(form,
    'Ficha técnica (planta escenografía, plano de iluminación y requerimientos técnicos. Archivo PDF) (Technical rider (Set design, props and lighting requirements))',
    'Tipo: Subir archivo · Solo PDF · Hasta 5 archivos · Máx. 10 MB · OBLIGATORIA');
  form.addTextItem().setTitle('Tiempo de montaje (Set up time)').setRequired(true);
  form.addTextItem().setTitle('Tiempo de desmontaje (Strike time)').setRequired(true);

  Logger.log('LISTO. Ahora reemplazá los 5 bloques "⚠ REEMPLAZAR" por preguntas de "Subir archivo".');
  Logger.log('Editar:  ' + form.getEditUrl());
  Logger.log('Público: ' + form.getPublishedUrl());
}

/** Bloque visible que marca dónde va una pregunta de archivo (no se puede crear por script). */
function marcadorArchivo(form, titulo, config) {
  form.addSectionHeaderItem()
    .setTitle('⚠ REEMPLAZAR por pregunta "Subir archivo": ' + titulo)
    .setHelpText('Configuración: ' + config + '. Usá exactamente el título de arriba (sin "⚠ REEMPLAZAR...") y después borrá este bloque.');
}
