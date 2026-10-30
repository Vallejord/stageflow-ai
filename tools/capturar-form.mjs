// Captura los datos internos de un Google Form (FB_PUBLIC_LOAD_DATA_) y los guarda en fixtures/.
// Solo abre y lee: no escribe en el formulario ni toca ningún botón.
// Uso: node tools/capturar-form.mjs <link> [nombre]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const url = process.argv[2];
const nombre = process.argv[3] || "form";
if (!url) {
  console.error("Uso: node tools/capturar-form.mjs <link del formulario> [nombre]");
  process.exit(1);
}

const context = await chromium.launchPersistentContext(path.resolve(".browser-user-data"), {
  channel: "chrome",
  headless: false,
  viewport: { width: 1280, height: 800 },
  ignoreDefaultArgs: ["--enable-automation"],
  args: ["--disable-blink-features=AutomationControlled"],
});

try {
  const page = context.pages()[0] || (await context.newPage());
  await page.goto(url, { waitUntil: "load" });
  const urlFinal = page.url();

  if (urlFinal.includes("accounts.google.com")) {
    console.log("AVISO: este formulario requiere iniciar sesión en Google y el navegador no tiene la sesión iniciada.");
    process.exitCode = 2;
  } else {
    // Solo el bloque de script que contiene los datos (no todo el HTML, que incluye tu email).
    const script = await page.evaluate(() => {
      const s = [...document.scripts].find((x) => x.textContent.includes("FB_PUBLIC_LOAD_DATA_"));
      return s ? s.textContent : null;
    });
    if (!script) {
      console.log("No se encontraron los datos del formulario en la página (¿es un Google Form?). URL final: " + urlFinal);
      process.exitCode = 3;
    } else {
      mkdirSync("fixtures", { recursive: true });
      const destino = path.join("fixtures", `${nombre}.script.txt`);
      writeFileSync(destino, script, "utf8");
      console.log(`OK: datos guardados en ${destino} (${script.length} caracteres). URL final: ${urlFinal}`);
    }
  }
} finally {
  await context.close();
}
