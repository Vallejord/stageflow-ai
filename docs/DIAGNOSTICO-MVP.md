# 🔍 Diagnóstico MVP StageFlow AI

> **Fecha:** Octubre 2026  
> **Objetivo:** Validar estado actual y preparar pruebas E2E antes del lanzamiento

---

## 1. ✅ Auditoría de Código - Checklist de Control

| Estado | Ítem | Detalle |
|:------:|------|---------|
| ✅ | **Bucle agentivo listo para `headless: false`** | Configurado en `route.ts:448`: `chromium.launch({ headless: false, slowMo: 50 })` |
| ✅ | **UI envía payload correcto a `/api/agent/run`** | **CORREGIDO** - `ExecutionStep` ahora invoca el endpoint real |
| ✅ | **Timeouts optimizados** | Screenshot JPEG 85%, timeout global 5min, navegación 30s, pausa entre campos 200ms |
| ✅ | **Logs detallados para monitoreo** | **AGREGADOS** - Ver terminal durante ejecución para paso a paso completo |
| ✅ | **Human-in-the-loop** | El agente NUNCA hace clic en Submit - siempre pausa para revisión humana |

---

## 2. 🧪 Setup de Prueba Realista (E2E)

### Formularios de Prueba Recomendados

| Proveedor | URL de Ejemplo | Notas |
|-----------|----------------|-------|
| **Google Forms** | `https://forms.gle/...` | Funciona bien, selectores predecibles |
| **Microsoft Forms** | `https://forms.cloud.microsoft/r/...` | Requiere login en algunos casos |
| **Typeform** | `https://xxx.typeform.com/to/...` | Animaciones pueden requerir más esperas |

### Pasos para Probar

1. **Iniciar el servidor de desarrollo:**
   ```powershell
   cd c:\Users\USUARIO\Documents\DEV\stageflow-ai
   pnpm dev
   ```

2. **Abrir la aplicación:**
   ```
   http://localhost:3000
   ```

3. **Flujo de prueba:**
   - Clic en "Postular a Festival" en la tarjeta de la obra
   - Pegar URL de un Google Forms o Microsoft Forms activo
   - Completar el wizard hasta el Paso 3
   - Clic en "Iniciar Postulación en Vivo"
   - **Observar la terminal** para ver los logs del agente

### Logs que Verás en Terminal

```
######################################################################
#  🎭 STAGEFLOW AI - AGENTE AUTÓNOMO INICIANDO
#  2026-10-13T23:00:00.000Z
######################################################################

✓ API Key de Gemini verificada

📋 CONFIGURACIÓN:
   URL del formulario: https://forms.gle/...
   Max iteraciones: 20
   Timeout: 300s

📂 Cargando perfil de obra desde data/obra-demo.json...
   ✓ Obra: "Deseo, mantente firme"
   ✓ Artista: "Monte Virgen"
   ✓ 20 campos disponibles para mapeo

🌐 Lanzando navegador Chromium...
   ✓ Navegador lanzado

============================================================
📄 [PÁGINA 1] https://forms.gle/...
============================================================
📸 Capturando screenshot del viewport...
🧠 Enviando a Gemini Vision para análisis...

🔍 CAMPOS DETECTADOS POR GEMINI (5):
   1. [text] "Nombre de la compañía" → nombre_artista
   2. [email] "Correo electrónico" → email
   ...

✋ EJECUTANDO ACCIONES (5):
   → fill("#company-name", "Monte Virgen...")
      ✓ Completado: Rellenar nombre de compañía
   ...

🧭 NAVEGACIÓN DETECTADA:
   Tipo: next
   Botón: "Siguiente"

######################################################################
#  🏁 EJECUCIÓN FINALIZADA
######################################################################

📊 RESUMEN FINAL:
   Estado: ready_for_review
   Páginas procesadas: 3
   Campos encontrados: 12
   Campos completados: 11
   Tasa de éxito: 91.7%
   Tiempo de ejecución: 45.23s

🌐 NAVEGADOR CHROMIUM: PERMANECE ABIERTO
   → El usuario debe revisar los datos en el formulario
   → El usuario debe hacer clic en "Enviar" manualmente
```

---

## 3. 🚧 Ajustes Mínimos para Usuarios Reales

Para pasar de `obra-demo.json` hardcodeado a un sistema donde usuarios reales puedan cargar sus propios datos, necesitamos:

### Opción A: Upload de JSON (Mínimo Viable)

**Esfuerzo:** ~2-3 horas

1. **Agregar campo de upload en el Wizard:**
   ```typescript
   // En application-wizard.tsx, paso 1
   // Permitir upload de JSON además de URL
   <input type="file" accept=".json" onChange={handleJsonUpload} />
   ```

2. **Almacenar temporalmente en estado o localStorage:**
   ```typescript
   const [obraProfile, setObraProfile] = useState<ObraProfile | null>(null)
   ```

3. **Pasar al endpoint vía body:**
   ```typescript
   fetch('/api/agent/run', {
     body: JSON.stringify({
       formUrl,
       obraProfile, // Enviar el perfil completo
     })
   })
   ```

4. **Modificar `route.ts` para aceptar perfil externo:**
   ```typescript
   // En lugar de siempre leer de archivo:
   const obraProfile = body.obraProfile || await cargarPerfilObra();
   ```

### Opción B: Editor de Campos en UI (Mejor UX)

**Esfuerzo:** ~1 día

1. **Crear componente `ObraEditor`:**
   - Formulario con todos los campos de `ObraProfile`
   - Pre-llenado desde `obra-demo.json` como template
   - Validación de campos requeridos

2. **Agregar paso 0 al Wizard:**
   - "Configurar datos de tu obra"
   - Permitir editar antes de postular

3. **Persistencia local:**
   - Guardar en `localStorage` para no perder datos
   - O conectar a backend para guardar perfiles

### Opción C: Base de Datos de Obras (Escalable)

**Esfuerzo:** ~2-3 días

1. **Agregar Prisma + SQLite/PostgreSQL**
2. **CRUD de obras:** `/api/obras`
3. **Selección de obra en dashboard**
4. **Múltiples obras por usuario**

---

## 4. 📋 Archivos Modificados en Esta Sesión

| Archivo | Cambios |
|---------|---------|
| `components/dashboard/application-wizard.tsx` | Conectado `ExecutionStep` a `/api/agent/run` real |
| `app/api/agent/run/route.ts` | Agregados logs detallados para monitoreo en terminal |

---

## 5. 🎯 Próximos Pasos Recomendados

1. **Hoy:** Probar con un Google Forms real y validar el flujo completo
2. **Corto plazo:** Implementar Opción A (upload JSON) para demos con usuarios
3. **Mediano plazo:** Implementar Opción B (editor en UI) para mejor UX
4. **Pre-lanzamiento:** Agregar persistencia de sesiones y manejo de errores robusto

---

## 6. 🔧 Comandos Útiles

```powershell
# Iniciar desarrollo
pnpm dev

# Ver logs del agente
# (aparecen automáticamente en la terminal donde corre pnpm dev)

# Probar endpoint manualmente
curl -X POST http://localhost:3000/api/agent/run -H "Content-Type: application/json" -d "{\"formUrl\": \"https://forms.gle/XXXXXX\"}"

# Ver info del endpoint
curl http://localhost:3000/api/agent/run
```

---

**Estado General:** ✅ **LISTO PARA PRUEBAS E2E**

El código está preparado para ejecutar pruebas realistas. Solo se necesita:
1. Un formulario activo (Google Forms / Microsoft Forms)
2. Monitorear la terminal para ver el progreso
3. Revisar y enviar manualmente el formulario completado
