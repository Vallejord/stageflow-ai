import { NextRequest, NextResponse } from "next/server";
import { chromium, BrowserContext, Locator, Page } from "playwright";
import { GoogleGenAI, Part } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";

// ============================================================================
// TIPOS
// ============================================================================

/** Datos del perfil de la obra */
interface ObraProfile {
  general: {
    nombre_artista_agrupacion: string;
    pais: string;
    persona_contacto: string;
    email_contacto: string;
    whatsapp_contacto: string;
    trayectoria_resumen: string;
  };
  espectaculo: {
    titulo: string;
    direccion: string;
    sinopsis: string;
    publico_objetivo: string;
    duracion_minutos: string;
    tiempo_montaje_desmontaje: string;
    cantidad_delegacion: string;
    ciudad_origen: string;
  };
  tecnica_y_links: {
    rider_tecnico_resumen: string;
    link_video_completo: string;
    link_carpeta_drive: string;
    monto_honorarios_usd: string;
  };
  informacion_adicional: {
    notas_prensa_criticas: string;
    comentarios_adicionales: string;
  };
}

/** Payload de entrada para el agente */
interface AgentRunRequest {
  formUrl: string;
  maxIterations?: number;
  timeoutMs?: number;
}

/** Acción identificada por Gemini para ejecutar */
interface GeminiAction {
  type: "fill" | "click" | "select" | "scroll" | "wait" | "upload";
  selector?: string;
  value?: string;
  fileType?: "image" | "pdf" | "dossier";
  description: string;
}

/** Respuesta estructurada de Gemini Vision */
interface GeminiVisionResponse {
  pageDescription: string;
  fieldsIdentified: Array<{
    fieldLabel: string;
    fieldType: "text" | "email" | "textarea" | "select" | "radio" | "checkbox" | "file" | "other";
    suggestedSelector: string;
    matchingObraField: string | null;
    valueToFill: string | null;
    fileType?: "image" | "pdf" | "dossier";
  }>;
  actions: GeminiAction[];
  navigationButton: {
    detected: boolean;
    type: "next" | "submit" | "none";
    selector: string | null;
    buttonText: string | null;
  };
  isLastPage: boolean;
  confidence: number;
}

/** Detalle de un campo procesado */
interface CampoDetalle {
  label: string;
  completado: boolean;
  status?: "ok" | "revisar" | "manual";
  selector?: string;
  valorUsado?: string;
  error?: string;
}

interface AccionManual {
  label: string;
  reason: string;
}

/** Detalle de una página procesada */
interface PaginaProcesada {
  pageNumber: number;
  fieldsFound: number;
  fieldsCompleted: number;
  campos: CampoDetalle[];
  navigationAction: string | null;
  screenshotTaken: boolean;
}

/** Respuesta del agente */
interface AgentRunResponse {
  status: "ready_for_review" | "completed" | "error" | "max_iterations_reached" | "login_required";
  pagesProcessed: number;
  totalFieldsCompleted: number;
  totalFieldsFound: number;
  pages: PaginaProcesada[];
  browserOpen: boolean;
  error?: string;
  executionTimeMs: number;
  loginRequired?: boolean;
  manual_actions_required?: AccionManual[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_ITERATIONS_DEFAULT = 20;
const TIMEOUT_MS_DEFAULT = 300000; // 5 minutos
const GEMINI_TIMEOUT_MS = 45000;
const GEMINI_MODEL = "gemini-3.8-flash";
const AGENT_LOG_PATH = path.join(process.cwd(), "logs", "agent.log");

function formatLogArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.stack ?? arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function log(...args: unknown[]): void {
  const line = formatLogArgs(args);
  process.stdout.write(line + "\n");
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  void fs.appendFile(AGENT_LOG_PATH, stamped).catch(() => undefined);
}

function logError(...args: unknown[]): void {
  const line = formatLogArgs(args);
  process.stderr.write(line + "\n");
  const stamped = `[${new Date().toISOString()}] ERROR ${line}\n`;
  void fs.appendFile(AGENT_LOG_PATH, stamped).catch(() => undefined);
}

async function ensureLogFile(): Promise<void> {
  await fs.mkdir(path.dirname(AGENT_LOG_PATH), { recursive: true });
  await fs.appendFile(
    AGENT_LOG_PATH,
    `\n========== sesión ${new Date().toISOString()} ==========\n`
  );
}

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Carpeta para persistir sesión del navegador
const BROWSER_USER_DATA_DIR = path.join(process.cwd(), ".browser-user-data");

// Archivos de prueba para uploads
const TEST_ASSETS = {
  image: path.join(process.cwd(), "public", "test-assets", "foto-obra.jpg"),
  pdf: path.join(process.cwd(), "public", "test-assets", "dossier.pdf"),
  dossier: path.join(process.cwd(), "public", "test-assets", "dossier.pdf"),
};

// ============================================================================
// PROMPTS
// ============================================================================

const VISION_SYSTEM_PROMPT = `Eres un agente de automatización de formularios web con capacidades de visión por computadora.

Tu tarea es analizar capturas de pantalla de formularios web y determinar:
1. Qué campos de formulario son visibles
2. Qué datos del perfil de la obra corresponden a cada campo
3. Qué acciones debe ejecutar Playwright para completar el formulario

REGLAS IMPORTANTES:
- Identifica TODOS los campos visibles en la imagen
- Para cada campo, sugiere un selector CSS o XPath que Playwright pueda usar
- Mapea los campos a los datos del perfil de la obra cuando corresponda
- Detecta botones de navegación: "Siguiente", "Next", "Continuar", "Continue", "Enviar", "Submit", "Guardar", "Save"
- Si detectas un botón "Enviar"/"Submit", marca isLastPage como true
- Prioriza selectores robustos: id > name > aria-label > placeholder > texto visible

DETECCIÓN DE CAMPOS DE ARCHIVO (MUY IMPORTANTE):
- Identifica inputs de tipo file (input[type="file"])
- Identifica botones con texto: "Añadir archivo", "Add file", "Subir", "Upload", "Adjuntar", "Attach", "Cargar archivo"
- Identifica zonas de drop/drag con texto: "Arrastra aquí", "Drop files here", "Suelta archivos"
- Para campos de archivo, indica el tipo esperado:
  - "image": si pide fotos, imágenes, capturas de la obra
  - "pdf": si pide documentos PDF genéricos
  - "dossier": si pide dossier, carpeta técnica, rider, documentación de la obra
- Para campos de archivo, genera una acción de tipo "upload" con el fileType correspondiente

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con JSON válido siguiendo este esquema exacto:
{
  "pageDescription": "Descripción breve de la página actual",
  "fieldsIdentified": [
    {
      "fieldLabel": "Etiqueta visible del campo",
      "fieldType": "text|email|textarea|select|radio|checkbox|file|other",
      "suggestedSelector": "selector CSS o XPath",
      "matchingObraField": "campo del JSON de obra que corresponde o null",
      "valueToFill": "valor a ingresar o null si no aplica",
      "fileType": "image|pdf|dossier (solo para fieldType=file)"
    }
  ],
  "actions": [
    {
      "type": "fill|click|select|scroll|wait|upload",
      "selector": "selector del elemento",
      "value": "valor a usar (si aplica)",
      "fileType": "image|pdf|dossier (solo para type=upload)",
      "description": "Descripción de la acción"
    }
  ],
  "navigationButton": {
    "detected": true|false,
    "type": "next|submit|none",
    "selector": "selector del botón o null",
    "buttonText": "texto del botón o null"
  },
  "isLastPage": false,
  "confidence": 0.95
}`;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Asegura que existe el directorio de datos del navegador
 */
async function ensureBrowserDataDir(): Promise<void> {
  try {
    await fs.mkdir(BROWSER_USER_DATA_DIR, { recursive: true });
  } catch {
    // El directorio ya existe
  }
}

/**
 * Verifica si existen los archivos de prueba
 */
async function checkTestAssets(): Promise<{ exists: boolean; missing: string[] }> {
  const missing: string[] = [];
  
  for (const [type, filePath] of Object.entries(TEST_ASSETS)) {
    try {
      await fs.access(filePath);
    } catch {
      missing.push(type);
    }
  }
  
  return { exists: missing.length === 0, missing };
}

/**
 * Carga el perfil de la obra desde el archivo JSON
 */
async function cargarPerfilObra(): Promise<ObraProfile> {
  const obraPath = path.join(process.cwd(), "data", "obra-demo.json");
  const obraData = await fs.readFile(obraPath, "utf-8");
  return JSON.parse(obraData) as ObraProfile;
}

/**
 * Convierte el perfil de la obra a un formato plano para el prompt
 */
function aplanarPerfilObra(obra: ObraProfile): Record<string, string> {
  return {
    "nombre_artista": obra.general.nombre_artista_agrupacion,
    "pais": obra.general.pais,
    "contacto_nombre": obra.general.persona_contacto,
    "email": obra.general.email_contacto,
    "whatsapp": obra.general.whatsapp_contacto,
    "trayectoria": obra.general.trayectoria_resumen,
    "titulo_obra": obra.espectaculo.titulo,
    "direccion": obra.espectaculo.direccion,
    "sinopsis": obra.espectaculo.sinopsis,
    "publico_objetivo": obra.espectaculo.publico_objetivo,
    "duracion": obra.espectaculo.duracion_minutos,
    "montaje_desmontaje": obra.espectaculo.tiempo_montaje_desmontaje,
    "cantidad_personas": obra.espectaculo.cantidad_delegacion,
    "ciudad_origen": obra.espectaculo.ciudad_origen,
    "rider_tecnico": obra.tecnica_y_links.rider_tecnico_resumen,
    "video_link": obra.tecnica_y_links.link_video_completo,
    "drive_link": obra.tecnica_y_links.link_carpeta_drive,
    "honorarios": obra.tecnica_y_links.monto_honorarios_usd,
    "notas_prensa": obra.informacion_adicional.notas_prensa_criticas,
    "comentarios": obra.informacion_adicional.comentarios_adicionales,
  };
}

/**
 * Captura screenshot del viewport actual
 */
async function capturarPantalla(page: Page): Promise<Buffer> {
  return await page.screenshot({
    type: "jpeg",
    quality: 85,
    fullPage: false,
  });
}

/**
 * Analiza una imagen con Gemini Vision
 */
async function analizarConGemini(
  genai: GoogleGenAI,
  imageBuffer: Buffer,
  perfilPlano: Record<string, string>
): Promise<GeminiVisionResponse> {
  const imageBase64 = imageBuffer.toString("base64");

  const imagePart: Part = {
    inlineData: {
      mimeType: "image/jpeg",
      data: imageBase64,
    },
  };

  const textPart: Part = {
    text: `PERFIL DE LA OBRA A COMPLETAR:
${JSON.stringify(perfilPlano, null, 2)}

Analiza la captura de pantalla del formulario y genera las instrucciones para completarlo.`,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    log(`   … esperando Gemini (intento ${attempt}/2, timeout ${GEMINI_TIMEOUT_MS / 1000}s)`);
    try {
      const response = await Promise.race([
        genai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [imagePart, textPart],
            },
          ],
          config: {
            systemInstruction: VISION_SYSTEM_PROMPT,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini no respondió en ${GEMINI_TIMEOUT_MS / 1000}s`)),
            GEMINI_TIMEOUT_MS
          )
        ),
      ]);

      const responseText = response.text;
      if (!responseText) throw new Error("Gemini no devolvió respuesta");

      try {
        return JSON.parse(responseText) as GeminiVisionResponse;
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]) as GeminiVisionResponse;
        throw new Error(`No se pudo parsear respuesta de Gemini: ${responseText.substring(0, 200)}`);
      }
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "error desconocido";
      log(`   ✗ Gemini intento ${attempt}/2: ${message}`);
      if (esCuotaGemini(error)) break;
      if (attempt === 1) log(`   reintentando la misma captura...`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini falló dos veces");
}

/**
 * Gemini a veces devuelve varios selectores separados por coma.
 * Playwright no acepta esa lista: hay que probarlos de a uno.
 */
function esCuotaGemini(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /RESOURCE_EXHAUSTED|Quota exceeded|429/.test(message);
}

function candidatosSelector(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\s*,\s*(?=(?:[a-zA-Z#.[*]|xpath=|text=|id=))/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function esClickDeNavegacion(action: GeminiAction): boolean {
  const texto = `${action.description} ${action.selector ?? ""}`.toLowerCase();
  return /siguiente|next|continuar|continue|enviar|submit|guardar|save/.test(texto);
}

function normalizarTexto(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pistaEtiqueta(etiqueta: string): string {
  const sinParentesis = etiqueta.split("(")[0].trim();
  return sinParentesis.length >= 4 ? sinParentesis : etiqueta.trim();
}

function etiquetaDeAccion(
  action: GeminiAction,
  fields: GeminiVisionResponse["fieldsIdentified"]
): string | null {
  if (!action.value) return null;
  const match = fields.find(
    (field) =>
      field.fieldLabel &&
      field.valueToFill &&
      normalizarTexto(field.valueToFill) === normalizarTexto(action.value ?? "")
  );
  return match?.fieldLabel ?? null;
}

async function leerValor(loc: Locator): Promise<string> {
  try {
    return await loc.inputValue();
  } catch {
    const text = await loc.evaluate((el) => {
      const node = el as HTMLElement;
      return node.innerText || node.textContent || "";
    });
    return String(text);
  }
}

/**
 * El listitem más corto que contiene la pista es la pregunta, no la página entera.
 */
async function listitemDePregunta(page: Page, etiqueta: string): Promise<Locator> {
  const pista = pistaEtiqueta(etiqueta);
  const items = page.locator('[role="listitem"]').filter({ hasText: pista });
  const count = await items.count();
  if (count === 0) throw new Error(`Sin pregunta visible para "${pista}"`);

  let bestIndex = 0;
  let bestLen = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const text = normalizarTexto(await items.nth(i).innerText());
    if (text.length > 0 && text.length < bestLen) {
      bestLen = text.length;
      bestIndex = i;
    }
  }

  const item = items.nth(bestIndex);
  await item.scrollIntoViewIfNeeded();
  return item;
}

function etiquetaDeArchivo(
  action: GeminiAction,
  fields: GeminiVisionResponse["fieldsIdentified"]
): string | null {
  const archivos = fields.filter((field) => field.fieldType === "file" && field.fieldLabel);
  if (archivos.length === 0) return null;
  const texto = `${action.description} ${action.selector ?? ""} ${action.fileType ?? ""}`.toLowerCase();
  const match = archivos.find((field) => {
    const pista = pistaEtiqueta(field.fieldLabel).toLowerCase();
    return texto.includes(pista.slice(0, Math.min(18, pista.length)));
  });
  return (match ?? (archivos.length === 1 ? archivos[0] : null))?.fieldLabel ?? null;
}

/**
 * Google Forms agrupa cada pregunta en un listitem. El XPath de Gemini
 * suele matchear un ancestro y `.first()` escribe siempre en el primer input.
 */
async function localizarCampoPorEtiqueta(page: Page, etiqueta: string): Promise<Locator> {
  const item = await listitemDePregunta(page, etiqueta);
  const input = item
    .locator(
      'textarea, input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([type="checkbox"]), [role="textbox"]'
    )
    .first();
  await input.waitFor({ state: "visible", timeout: 3000 });
  return input;
}

type Navegacion = "next" | "submit" | "none";

async function botonVisible(page: Page, pattern: RegExp): Promise<Locator | null> {
  const boton = page.getByRole("button", { name: pattern }).first();
  if (await boton.isVisible().catch(() => false)) return boton;
  return null;
}

async function buscarNavegacion(page: Page): Promise<{ kind: Navegacion; button: Locator | null }> {
  const submitEnDom = page.getByRole("button", { name: /^\s*(enviar|submit|send)\s*$/i }).first();
  const nextEnDom = page.getByRole("button", { name: /siguiente|next|continuar|continue/i }).first();
  if ((await submitEnDom.count()) > 0) {
    await submitEnDom.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await submitEnDom.isVisible().catch(() => false)) return { kind: "submit", button: submitEnDom };
  }
  if ((await nextEnDom.count()) > 0) {
    await nextEnDom.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await nextEnDom.isVisible().catch(() => false)) return { kind: "next", button: nextEnDom };
  }

  for (let paso = 0; paso < 10; paso++) {
    const submit = await botonVisible(page, /^\s*(enviar|submit|send)\s*$/i);
    if (submit) return { kind: "submit", button: submit };
    const next = await botonVisible(page, /siguiente|next|continuar|continue/i);
    if (next) return { kind: "next", button: next };

    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => window.scrollY);
    const atBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40
    );
    if (after === before || atBottom) break;
  }

  const submit = await botonVisible(page, /^\s*(enviar|submit|send)\s*$/i);
  if (submit) return { kind: "submit", button: submit };
  const next = await botonVisible(page, /siguiente|next|continuar|continue/i);
  if (next) return { kind: "next", button: next };
  return { kind: "none", button: null };
}

async function localizar(page: Page, selector?: string, textoVisible?: string) {
  const errores: string[] = [];
  for (const candidato of candidatosSelector(selector)) {
    const loc = page.locator(candidato).first();
    try {
      await loc.waitFor({ state: "visible", timeout: 2500 });
      return loc;
    } catch (error) {
      errores.push(
        `${candidato}: ${error instanceof Error ? error.message : "no visible"}`
      );
    }
  }

  if (textoVisible?.trim()) {
    const porTexto = page.getByText(textoVisible.trim(), { exact: false }).first();
    try {
      await porTexto.waitFor({ state: "visible", timeout: 2500 });
      return porTexto;
    } catch {
      errores.push(`texto "${textoVisible}" no visible`);
    }

    const radio = page.getByRole("radio", { name: textoVisible.trim() }).first();
    try {
      await radio.waitFor({ state: "visible", timeout: 1500 });
      return radio;
    } catch {
      // seguir
    }
  }

  throw new Error(errores.slice(0, 3).join(" | ") || "Selector no encontrado");
}

/**
 * Ejecuta una acción individual en la página
 */
async function limpiarBorrador(page: Page): Promise<void> {
  const nombre = /borrar formulario|clear form/i;
  const disparador = page
    .getByRole("button", { name: nombre })
    .or(page.getByRole("link", { name: nombre }))
    .first();

  if ((await disparador.count()) === 0) {
    log("No aparece 'Borrar formulario' / 'Clear form'. Sigo con lo que haya en pantalla.");
    return;
  }

  log("Encontré 'Borrar formulario'. Limpio el borrador anterior.");
  page.once("dialog", (dialog) => {
    log(`   Confirmación del navegador: ${dialog.message()}`);
    void dialog.accept();
  });

  await disparador.scrollIntoViewIfNeeded().catch(() => undefined);
  await disparador.click({ timeout: 5000 });

  const confirmar = page.getByRole("button", { name: /borrar formulario|clear form/i }).last();
  if (await confirmar.isVisible({ timeout: 2500 }).catch(() => false)) {
    await confirmar.click();
    log("   Confirmé el borrado.");
  }

  await page.waitForTimeout(1200);
}

async function ejecutarAccion(
  page: Page,
  action: GeminiAction,
  etiqueta?: string | null
): Promise<{ success: boolean; error?: string; status?: CampoDetalle["status"]; manual?: AccionManual }> {
  try {
    switch (action.type) {
      case "fill": {
        if (!action.value) {
          return { success: false, error: "Valor faltante para fill" };
        }
        let loc: Locator | null = null;
        if (etiqueta) {
          try {
            loc = await localizarCampoPorEtiqueta(page, etiqueta);
            log(`      campo por etiqueta: "${pistaEtiqueta(etiqueta)}"`);
          } catch (error) {
            const message = error instanceof Error ? error.message : "sin etiqueta";
            log(`      etiqueta no encontrada (${message})`);
          }
        }
        if (!loc) {
          if (!action.selector) {
            return { success: false, error: "Sin etiqueta ni selector para fill" };
          }
          loc = await localizar(page, action.selector);
        }
        await loc.scrollIntoViewIfNeeded();
        await loc.focus();
        await page.waitForTimeout(100);
        await loc.clear().catch(() => undefined);
        await loc.fill(action.value);
        await loc.blur().catch(() => undefined);

        let actual = "";
        const selector = candidatosSelector(action.selector)[0];
        try {
          actual = await loc.inputValue({ timeout: 2000 });
        } catch {
          if (selector) {
            try {
              actual = await page.inputValue(selector, { timeout: 1500 });
            } catch {
              actual = await leerValor(loc);
            }
          } else {
            actual = await leerValor(loc);
          }
        }

        const esperado = normalizarTexto(action.value);
        const leido = normalizarTexto(actual);
        log(`      esperado: "${esperado}"`);
        log(`      actual:   "${leido}"`);
        if (!leido.includes(esperado)) {
          log(`      ⚠ revisar: el campo no contiene "${esperado}"`);
          return {
            success: false,
            status: "revisar",
            error: `Se intentó escribir "${esperado}" y el campo quedó en "${leido}"`,
          };
        }
        return { success: true, status: "ok" };
      }

      case "click": {
        if (!action.selector && !action.value) {
          return { success: false, error: "Selector faltante para click" };
        }
        const loc = await localizar(page, action.selector, action.value);
        await loc.scrollIntoViewIfNeeded();
        await loc.click({ timeout: 5000 });
        return { success: true };
      }

      case "select": {
        if (!action.selector || !action.value) {
          return { success: false, error: "Selector o valor faltante para select" };
        }
        const loc = await localizar(page, action.selector, action.value);
        await loc.selectOption(action.value);
        return { success: true };
      }

      case "upload": {
        const fileType = action.fileType || "pdf";
        const filePath = TEST_ASSETS[fileType as keyof typeof TEST_ASSETS] || TEST_ASSETS.pdf;
        const label =
          etiqueta ||
          (fileType === "image" ? "Fotos 300 DPI" : fileType === "dossier" ? "Dossier PDF" : "Archivo");

        try {
          await fs.access(filePath);
          const scope = etiqueta
            ? await listitemDePregunta(page, etiqueta).catch(() => page.locator("body"))
            : page.locator("body");
          await scope.locator('input[type="file"]').first().setInputFiles(filePath, { timeout: 4000 });
          log(`      📎 Archivo subido: ${filePath}`);
          return { success: true, status: "ok" };
        } catch (error) {
          const message = error instanceof Error ? error.message : "no se pudo adjuntar";
          log(`      ⚠ subida manual: ${label}. ${message}`);
          return {
            success: false,
            status: "manual",
            error: message,
            manual: { label, reason: "Requiere subida manual" },
          };
        }
      }

      case "scroll":
        await page.mouse.wheel(0, 300);
        return { success: true };

      case "wait":
        await page.waitForTimeout(1000);
        return { success: true };

      default:
        return { success: false, error: `Tipo de acción desconocido: ${action.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido ejecutando acción",
    };
  }
}

/**
 * Detecta si estamos en una página de login
 */
function isLoginPage(url: string): boolean {
  const loginPatterns = [
    "accounts.google.com",
    "login.microsoftonline.com",
    "login.live.com",
    "auth.google.com",
  ];
  return loginPatterns.some((pattern) => url.toLowerCase().includes(pattern));
}

/**
 * Si el formulario redirige a login, espera a que el usuario inicie sesión
 * en la ventana de Chromium y continúa en la misma ejecución.
 * La sesión queda guardada en .browser-user-data para las próximas corridas.
 */
async function esperarLoginManual(page: Page, waitMs: number): Promise<"ok" | "timeout"> {
  if (!isLoginPage(page.url())) return "ok";

  log(`\n🔐 PÁGINA DE LOGIN DETECTADA`);
  log(`   URL: ${page.url()}`);
  log(`\n   ╔════════════════════════════════════════════════════════╗`);
  log(`   ║  INICIÁ SESIÓN EN LA VENTANA DE CHROMIUM               ║`);
  log(`   ║  El agente espera y continúa solo cuando entres.       ║`);
  log(`   ║  La sesión queda guardada para la próxima vez.         ║`);
  log(`   ╚════════════════════════════════════════════════════════╝\n`);

  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!isLoginPage(url)) {
      log(`✓ Sesión iniciada. Continuando en: ${url}`);
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
        log(`   (networkidle timeout después del login - continuando)`);
      });
      await page.waitForTimeout(1500);
      return "ok";
    }
    const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    log(`   … esperando login (${remaining}s restantes)`);
  }

  log(`⏰ Tiempo de espera de login agotado. El navegador sigue abierto.`);
  return "timeout";
}

/**
 * Procesa una página del formulario
 */
async function procesarPagina(
  page: Page,
  genai: GoogleGenAI,
  perfilPlano: Record<string, string>,
  pageNumber: number
): Promise<{
  resultado: PaginaProcesada;
  geminiResponse: GeminiVisionResponse;
  manualActions: AccionManual[];
}> {
  const pageUrl = page.url();
  log(`\n${"=".repeat(60)}`);
  log(`📄 [PÁGINA ${pageNumber}] ${pageUrl}`);
  log(`${"=".repeat(60)}`);
  
  log(`📸 Capturando screenshot del viewport...`);
  const screenshot = await capturarPantalla(page);
  log(`   ✓ Screenshot capturado (${(screenshot.length / 1024).toFixed(1)} KB)`);

  log(`🧠 Enviando a Gemini Vision para análisis...`);
  const geminiResponse = await analizarConGemini(genai, screenshot, perfilPlano);
  log(`   ✓ Análisis completado (confianza: ${(geminiResponse.confidence * 100).toFixed(0)}%)`);
  log(`\n📝 Descripción de página: "${geminiResponse.pageDescription}"`);
  
  log(`\n🔍 CAMPOS DETECTADOS POR GEMINI (${geminiResponse.fieldsIdentified.length}):`);
  geminiResponse.fieldsIdentified.forEach((field, i) => {
    const match = field.matchingObraField ? `→ ${field.matchingObraField}` : '(sin mapeo)';
    const fileInfo = field.fieldType === 'file' ? ` [${field.fileType || 'archivo'}]` : '';
    log(`   ${i + 1}. [${field.fieldType}${fileInfo}] "${field.fieldLabel}" ${match}`);
    if (field.valueToFill) {
      const preview = field.valueToFill.length > 50 
        ? field.valueToFill.substring(0, 50) + '...' 
        : field.valueToFill;
      log(`      Valor: "${preview}"`);
    }
  });

  const campos: CampoDetalle[] = [];
  const manualActions: AccionManual[] = [];
  let completados = 0;

  log(`\n✋ EJECUTANDO ACCIONES (${geminiResponse.actions.length}):`);
  for (const action of geminiResponse.actions) {
    if (action.type === "click" && esClickDeNavegacion(action)) {
      log(`   → click de navegación omitido aquí: ${action.description}`);
      continue;
    }

    if (action.type === "fill" || action.type === "click" || action.type === "select" || action.type === "upload") {
      if (action.type === "click" && !action.value) {
        const quoted = action.description.match(/['"“”]([^'"“”]+)['"“”]/);
        if (quoted) action.value = quoted[1];
      }
      const preview =
        action.type === "upload"
          ? `[archivo: ${action.fileType}]`
          : (action.value || "").substring(0, 40);
      log(`   → ${action.type}("${action.selector}", "${preview}")`);
      const etiqueta =
        action.type === "fill"
          ? etiquetaDeAccion(action, geminiResponse.fieldsIdentified)
          : action.type === "upload"
            ? etiquetaDeArchivo(action, geminiResponse.fieldsIdentified)
            : null;
      const resultado = await ejecutarAccion(page, action, etiqueta);

      if (resultado.manual) manualActions.push(resultado.manual);

      if (resultado.success) {
        log(`      ✓ Completado: ${action.description}`);
        completados++;
      } else if (resultado.status === "revisar") {
        log(`      ⚠ Campo marcado para revisar: ${action.description}`);
      } else if (resultado.status === "manual") {
        log(`      ⚠ Quedó para la persona: ${resultado.manual?.label}`);
      } else {
        log(`      ✗ Error: ${resultado.error}`);
      }

      campos.push({
        label: action.description,
        completado: resultado.success,
        status: resultado.status ?? (resultado.success ? "ok" : "revisar"),
        selector: action.selector,
        valorUsado: action.type === "upload" ? `[archivo: ${action.fileType}]` : action.value,
        error: resultado.error,
      });

      await page.waitForTimeout(action.type === "upload" ? 500 : 250);
    } else {
      log(`   → ${action.type}(${action.selector ?? ""})`);
      await ejecutarAccion(page, action);
    }
  }

  if (geminiResponse.navigationButton.detected) {
    log(`\n🧭 NAVEGACIÓN DETECTADA:`);
    log(`   Tipo: ${geminiResponse.navigationButton.type}`);
    log(`   Botón: "${geminiResponse.navigationButton.buttonText}"`);
    log(`   Selector: ${geminiResponse.navigationButton.selector}`);
    if (geminiResponse.isLastPage) {
      log(`   ⚠️  ES LA ÚLTIMA PÁGINA (Submit detectado)`);
    }
  }

  log(`\n📊 Resumen página ${pageNumber}: ${completados}/${geminiResponse.fieldsIdentified.length} campos completados`);

  return {
    resultado: {
      pageNumber,
      fieldsFound: geminiResponse.fieldsIdentified.length,
      fieldsCompleted: completados,
      campos,
      navigationAction: geminiResponse.navigationButton.detected
        ? geminiResponse.navigationButton.type
        : null,
      screenshotTaken: true,
    },
    geminiResponse,
    manualActions,
  };
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<AgentRunResponse>> {
  let context: BrowserContext | null = null;
  const startTime = Date.now();

  log(`\n${"#".repeat(70)}`);
  log(`#  🎭 STAGEFLOW AI - AGENTE AUTÓNOMO v2.1`);
  log(`#  ${new Date().toISOString()}`);
  log(`#  Contexto persistente habilitado`);
  log(`${"#".repeat(70)}\n`);

  try {
    await ensureLogFile();

    // Verificar API key de Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "tu_api_key_aqui") {
      logError("❌ GEMINI_API_KEY no configurada");
      return NextResponse.json(
        {
          status: "error",
          pagesProcessed: 0,
          totalFieldsCompleted: 0,
          totalFieldsFound: 0,
          pages: [],
          browserOpen: false,
          error: "GEMINI_API_KEY no configurada",
          executionTimeMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }
    log("✓ API Key de Gemini verificada");

    // Parsear request
    const body: AgentRunRequest = await request.json();
    const { formUrl, maxIterations = MAX_ITERATIONS_DEFAULT, timeoutMs = TIMEOUT_MS_DEFAULT } = body;

    log(`\n📋 CONFIGURACIÓN:`);
    log(`   URL del formulario: ${formUrl}`);
    log(`   Max iteraciones: ${maxIterations}`);
    log(`   Timeout: ${timeoutMs / 1000}s`);

    if (!formUrl) {
      logError("❌ formUrl es requerido");
      return NextResponse.json(
        {
          status: "error",
          pagesProcessed: 0,
          totalFieldsCompleted: 0,
          totalFieldsFound: 0,
          pages: [],
          browserOpen: false,
          error: "formUrl es requerido",
          executionTimeMs: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    // Asegurar directorio de datos del navegador
    await ensureBrowserDataDir();
    log(`\n📁 Directorio de sesión: ${BROWSER_USER_DATA_DIR}`);

    // Verificar archivos de prueba
    const assetsCheck = await checkTestAssets();
    if (!assetsCheck.exists) {
      log(`⚠️ Archivos de prueba faltantes: ${assetsCheck.missing.join(', ')}`);
      log(`   Crear en: public/test-assets/`);
    } else {
      log(`✓ Archivos de prueba disponibles para uploads`);
    }

    // Cargar perfil de la obra
    log(`\n📂 Cargando perfil de obra...`);
    const obraProfile = await cargarPerfilObra();
    const perfilPlano = aplanarPerfilObra(obraProfile);
    log(`   ✓ Obra: "${obraProfile.espectaculo.titulo}"`);
    log(`   ✓ Artista: "${obraProfile.general.nombre_artista_agrupacion}"`);

    // Inicializar Gemini
    log(`\n🤖 Inicializando Gemini Vision (${GEMINI_MODEL})...`);
    const genai = new GoogleGenAI({ apiKey });
    log(`   ✓ Cliente Gemini listo`);

    // Lanzar navegador con contexto PERSISTENTE
    log(`\n🌐 Lanzando navegador con contexto persistente...`);
    log(`   Modo: headless=false (visible)`);
    log(`   Sesión guardada en: .browser-user-data/`);
    
    // Google rechaza el login en navegadores marcados como automatizados.
    // Usar el Chrome instalado (mismo binario que `npm run login`, para compartir cookies)
    // y quitar las señales de automatización. No forzar userAgent: un UA desfasado es sospechoso.
    context = await chromium.launchPersistentContext(BROWSER_USER_DATA_DIR, {
      channel: "chrome",
      headless: false,
      slowMo: 50,
      viewport: { width: 1280, height: 800 },
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--disable-blink-features=AutomationControlled"],
    });
    log(`   ✓ Contexto persistente creado`);

    const page = context.pages()[0] || await context.newPage();
    log(`   ✓ Página lista`);

    // Navegar al formulario
    log(`\n🔗 Navegando a: ${formUrl}`);
    await page.goto(formUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    log(`   ✓ Página cargada`);

    await page.waitForTimeout(1500);

    // Si hay login, esperar en la misma ventana y seguir. No cortar el proceso.
    const LOGIN_WAIT_MS = 180000;
    const loginInicial = await esperarLoginManual(page, LOGIN_WAIT_MS);
    if (loginInicial === "timeout") {
      return NextResponse.json({
        status: "login_required",
        pagesProcessed: 0,
        totalFieldsCompleted: 0,
        totalFieldsFound: 0,
        pages: [],
        browserOpen: true,
        loginRequired: true,
        error: "No se detectó el inicio de sesión a tiempo. La ventana de Chromium sigue abierta: entrá y volvé a lanzar el agente. La sesión queda guardada.",
        executionTimeMs: Date.now() - startTime,
      });
    }

    // ========================================================================
    // BUCLE AGENTIVO PRINCIPAL
    // ========================================================================
    await limpiarBorrador(page);

    log(`\n${"*".repeat(70)}`);
    log(`*  🔄 INICIANDO BUCLE AGENTIVO (max ${maxIterations} iteraciones)`);
    log(`${"*".repeat(70)}`);
    
    const pages: PaginaProcesada[] = [];
    const manualActions: AccionManual[] = [];
    let iteration = 0;
    let isLastPage = false;
    let totalFieldsCompleted = 0;
    let totalFieldsFound = 0;

    while (iteration < maxIterations && !isLastPage) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        log(`\n⏰ TIMEOUT GLOBAL ALCANZADO (${elapsed / 1000}s > ${timeoutMs / 1000}s)`);
        break;
      }

      const loginEnCurso = await esperarLoginManual(page, LOGIN_WAIT_MS);
      if (loginEnCurso === "timeout") {
        return NextResponse.json({
          status: "login_required",
          pagesProcessed: pages.length,
          totalFieldsCompleted,
          totalFieldsFound,
          pages,
          browserOpen: true,
          loginRequired: true,
          error: "El formulario pidió iniciar sesión y no se completó a tiempo. La ventana sigue abierta.",
          executionTimeMs: Date.now() - startTime,
        });
      }

      iteration++;
      log(`\n🔁 ITERACIÓN ${iteration}/${maxIterations} (${(elapsed / 1000).toFixed(1)}s)`);

      let geminiDijoSubmit = false;
      let paginaAnalizada = false;
      try {
        for (let pasada = 1; pasada <= 4; pasada++) {
          const { resultado, geminiResponse, manualActions: dePagina } = await procesarPagina(
            page,
            genai,
            perfilPlano,
            iteration
          );

          pages.push(resultado);
          manualActions.push(...dePagina);
          totalFieldsCompleted += resultado.fieldsCompleted;
          totalFieldsFound += resultado.fieldsFound;
          paginaAnalizada = true;
          if (geminiResponse.isLastPage || geminiResponse.navigationButton.type === "submit") {
            geminiDijoSubmit = true;
          }

          const yBefore = await page.evaluate(() => window.scrollY);
          const maxScroll = await page.evaluate(() =>
            Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
          );
          if (yBefore >= maxScroll - 30) break;

          await page.mouse.wheel(0, 750);
          await page.waitForTimeout(400);
          const yAfter = await page.evaluate(() => window.scrollY);
          if (yAfter <= yBefore + 20) break;
          log(`   Hay más contenido en esta página. Pasada ${pasada + 1}...`);
        }
      } catch (iterationError) {
        logError(`\n❌ ERROR EN ITERACIÓN ${iteration}:`, iterationError);
        if (esCuotaGemini(iterationError)) {
          return NextResponse.json({
            status: "error",
            pagesProcessed: pages.length,
            totalFieldsCompleted,
            totalFieldsFound,
            pages,
            browserOpen: true,
            error:
              "La clave gratis de Gemini llegó al tope de 20 análisis por día para gemini-3.8-flash. Hay que esperar unas 2 horas y media, o activar facturación en Google AI Studio. No es un fallo del formulario.",
            executionTimeMs: Date.now() - startTime,
          });
        }
        pages.push({
          pageNumber: iteration,
          fieldsFound: 0,
          fieldsCompleted: 0,
          campos: [],
          navigationAction: null,
          screenshotTaken: false,
        });
      }

      if (!paginaAnalizada) {
        log(`\n⛔ Esta página no se analizó. No hago clic en Siguiente para no dejarla vacía.`);
        isLastPage = true;
        break;
      }

      const nav = await buscarNavegacion(page);
      if (nav.kind === "submit") {
        log(`\n🛑 BOTÓN ENVIAR VISIBLE`);
        log(`   → HUMAN-IN-THE-LOOP: no se hace clic en Enviar`);
        log(`   ⚠️  El navegador permanece ABIERTO para revisión manual`);
        isLastPage = true;
        break;
      }

      if (nav.kind === "next" && nav.button) {
        log(`\n➡️  Clic en Siguiente por texto del botón`);
        await nav.button.click({ timeout: 5000 });
        log(`   Esperando carga...`);
        await page.waitForTimeout(2000);
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {
          log(`   (domcontentloaded timeout - continuando)`);
        });
        continue;
      }

      if (geminiDijoSubmit) {
        log(`\n🛑 Gemini marcó esta página como final y no hay botón Siguiente`);
        isLastPage = true;
        break;
      }

      log(`\n⚠️  No apareció Siguiente ni Enviar después de recorrer la página`);
      isLastPage = true;
    }

    // ========================================================================
    // RESULTADO FINAL
    // ========================================================================
    const finalStatus: AgentRunResponse["status"] =
      iteration >= maxIterations ? "max_iterations_reached" : "ready_for_review";

    const executionTime = Date.now() - startTime;
    
    log(`\n${"#".repeat(70)}`);
    log(`#  🏁 EJECUCIÓN FINALIZADA`);
    log(`${"#".repeat(70)}`);
    log(`\n📊 RESUMEN FINAL:`);
    log(`   Estado: ${finalStatus}`);
    log(`   Páginas procesadas: ${pages.length}`);
    log(`   Campos encontrados: ${totalFieldsFound}`);
    log(`   Campos completados: ${totalFieldsCompleted}`);
    log(`   Para hacer a mano: ${manualActions.length}`);
    log(`   Tasa de éxito: ${totalFieldsFound > 0 ? ((totalFieldsCompleted / totalFieldsFound) * 100).toFixed(1) : 0}%`);
    log(`   Tiempo: ${(executionTime / 1000).toFixed(2)}s`);
    log(`\n🌐 NAVEGADOR: PERMANECE ABIERTO`);
    log(`   → Revisar datos y enviar MANUALMENTE\n`);

    return NextResponse.json({
      status: finalStatus,
      pagesProcessed: pages.length,
      totalFieldsCompleted,
      totalFieldsFound,
      pages,
      browserOpen: true,
      manual_actions_required: manualActions,
      executionTimeMs: executionTime,
    });

  } catch (error) {
    logError("[Agente] Error fatal:", error);

    return NextResponse.json(
      {
        status: "error",
        pagesProcessed: 0,
        totalFieldsCompleted: 0,
        totalFieldsFound: 0,
        pages: [],
        browserOpen: false,
        error: error instanceof Error ? error.message : "Error interno del servidor",
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
  // NOTA: No cerramos el contexto para que el navegador permanezca abierto
}

// ============================================================================
// GET - Información del endpoint
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/agent/run",
    version: "2.1.0",
    description: "Agente autónomo con contexto persistente + soporte de archivos",
    features: [
      "Contexto persistente (sesiones guardadas entre ejecuciones)",
      "Soporte para subida de archivos (fotos, PDFs, dossiers)",
      "Visión por computadora con Gemini Vision",
      "Navegación automática multi-página",
      "Human-in-the-loop: pausa antes de enviar",
      "Detección inteligente de páginas de login",
    ],
    usage: {
      method: "POST",
      body: {
        formUrl: "URL del formulario (requerido)",
        maxIterations: "Máx páginas a procesar (default: 20)",
        timeoutMs: "Timeout en ms (default: 300000)",
      },
    },
  });
}
