# 🎭 StageFlow AI

**Plataforma SaaS para automatizar postulaciones de proyectos culturales a festivales y convocatorias en Iberoamérica mediante un agente de IA autónomo.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.64-2EAD33?logo=playwright)](https://playwright.dev/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5--flash-4285F4?logo=google)](https://ai.google.dev/)

---

## 🎯 Misión

StageFlow AI **revaloriza el tiempo operativo de los artistas independientes** automatizando el proceso repetitivo de postular obras de teatro a convocatorias de festivales (Microsoft Forms, Google Forms, Typeform, etc.).

En lugar de rellenar manualmente decenas de formularios con los mismos datos, el artista mantiene una **Ficha Única de la Obra** y el agente de IA la mapea inteligentemente a cada convocatoria.

---

## ✨ Características Principales

| Feature | Descripción |
|---------|-------------|
| 🤖 **Agente Autónomo Multimodal** | Combina Visión por Computadora (Gemini) + Control de Navegador (Playwright) |
| 👁️ **Percepción Visual** | Captura screenshots del formulario y los analiza semánticamente |
| 🧠 **Razonamiento Contextual** | Mapea campos del formulario a datos de la obra automáticamente |
| ✍️ **Acción Precisa** | Rellena campos simulando velocidad humana de tipeo |
| 🛡️ **Human-in-the-Loop** | Pausa antes de "Enviar" para revisión humana obligatoria |
| 📊 **Pre-evaluación de Elegibilidad** | Verifica compatibilidad obra ↔ convocatoria antes de ejecutar |
| 🎨 **Dashboard Intuitivo** | Interfaz moderna con shadcn/ui y Tailwind CSS |

---

## 🏗️ Tech Stack

```
Frontend          Backend               AI/Automation
─────────         ───────               ─────────────
Next.js 16.4      App Router API        Gemini 2.5 Flash (Vision)
React 19          Route Handlers        @google/genai SDK
Tailwind CSS 4    Server Components     Playwright (Chromium)
shadcn/ui         Node.js Runtime
Lucide Icons
```

---

## 📁 Estructura del Proyecto

```
stageflow-ai/
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   └── run/
│   │   │       └── route.ts      # 🤖 Motor del Agente Autónomo
│   │   └── ingest/
│   │       └── route.ts          # 📋 Pre-evaluación de elegibilidad
│   ├── agente/
│   │   └── [playId]/
│   │       └── page.tsx          # 🖥️ Workspace de ejecución en vivo
│   ├── layout.tsx                # Layout raíz con providers
│   ├── page.tsx                  # Dashboard principal "Mis Obras"
│   └── globals.css
├── components/
│   ├── agent/
│   │   ├── agent-workspace.tsx   # Orquestador del workspace de agente
│   │   ├── browser-stream.tsx    # Visualización del navegador simulado
│   │   └── mapping-inspector.tsx # Inspector de mapeo de datos
│   ├── dashboard/
│   │   ├── app-sidebar.tsx       # Sidebar de navegación
│   │   ├── application-wizard.tsx # Modal wizard de postulación
│   │   ├── dashboard-header.tsx  # Header del dashboard
│   │   └── play-card.tsx         # Tarjeta de obra
│   └── ui/                       # Componentes shadcn/ui
├── data/
│   └── obra-demo.json            # 📄 Perfil Único de la Obra (esquema)
├── lib/
│   ├── form-mapping.ts           # Lógica de mapeo obra → formulario
│   ├── plays.ts                  # Datos y helpers de obras
│   └── utils.ts                  # Utilidades (cn, etc.)
├── hooks/
│   └── use-mobile.ts             # Hook de detección mobile
├── docs/
│   └── ARCHITECTURE.md           # 📚 Documentación técnica profunda
├── .env.local                    # Variables de entorno (crear)
├── package.json
├── tsconfig.json
└── README.md                     # Este archivo
```

---

## 🚀 Quick Start

### Prerrequisitos

- **Node.js** 20+ 
- **pnpm** 9+ (o npm/yarn)
- **API Key de Gemini** (gratuita en [Google AI Studio](https://aistudio.google.com/))

### 1. Clonar e Instalar

```bash
git clone https://github.com/tu-usuario/stageflow-ai.git
cd stageflow-ai
pnpm install
```

### 2. Configurar Variables de Entorno

Crea el archivo `.env.local` en la raíz:

```env
# API Key de Google Gemini (requerida)
GEMINI_API_KEY=tu_api_key_de_gemini_aqui
```

> 💡 Obtén tu API Key gratis en [Google AI Studio](https://aistudio.google.com/apikey)

### 3. Instalar Navegadores de Playwright

```bash
npx playwright install chromium
```

### 4. Ejecutar en Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📖 Uso Básico

### Flujo de Postulación

1. **Dashboard** → Selecciona una obra del repertorio
2. **Wizard de Postulación** → Pega la URL del formulario del festival
3. **Pre-evaluación** → El sistema verifica compatibilidad automáticamente
4. **Ejecución del Agente** → Observa en vivo cómo se completa el formulario
5. **Revisión Human-in-the-Loop** → Valida y envía manualmente el formulario

### Endpoints de la API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/agent/run` | `POST` | Ejecuta el agente autónomo |
| `/api/agent/run` | `GET` | Info del endpoint y documentación |
| `/api/ingest` | `POST` | Pre-evalúa elegibilidad de una convocatoria |
| `/api/ingest` | `GET` | Info del endpoint |

#### Ejemplo: Ejecutar el Agente

```bash
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "formUrl": "https://forms.gle/ejemplo-festival",
    "maxIterations": 10,
    "timeoutMs": 180000
  }'
```

---

## 📄 Perfil Único de la Obra (Esquema JSON)

El archivo `data/obra-demo.json` contiene la estructura estándar de datos:

```json
{
  "general": {
    "nombre_artista_agrupacion": "string",
    "pais": "string",
    "persona_contacto": "string",
    "email_contacto": "string",
    "whatsapp_contacto": "string",
    "trayectoria_resumen": "string"
  },
  "espectaculo": {
    "titulo": "string",
    "direccion": "string",
    "sinopsis": "string",
    "publico_objetivo": "string",
    "duracion_minutos": "string",
    "tiempo_montaje_desmontaje": "string",
    "cantidad_delegacion": "string",
    "ciudad_origen": "string"
  },
  "tecnica_y_links": {
    "rider_tecnico_resumen": "string",
    "link_video_completo": "URL",
    "link_carpeta_drive": "URL",
    "monto_honorarios_usd": "string"
  },
  "informacion_adicional": {
    "notas_prensa_criticas": "string",
    "comentarios_adicionales": "string"
  }
}
```

> 📚 Ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) para documentación técnica detallada del motor agentivo.

---

## 🧪 Testing

```bash
# Verificar que el endpoint del agente está activo
curl http://localhost:3000/api/agent/run

# Verificar endpoint de ingest
curl http://localhost:3000/api/ingest
```

---

## 🔐 Seguridad

- ✅ **Human-in-the-Loop obligatorio**: El agente NUNCA envía formularios automáticamente
- ✅ **API Keys seguras**: Variables de entorno, no hardcodeadas
- ✅ **Timeouts configurables**: Prevención de ejecuciones infinitas
- ✅ **Modo visible en desarrollo**: `headless: false` permite auditar acciones del agente

---

## 🗺️ Roadmap

- [ ] Soporte para Typeform
- [ ] Manejo de campos de archivo (upload de PDFs)
- [ ] Múltiples perfiles de obra por usuario
- [ ] Historial de postulaciones
- [ ] Detección automática de nuevas convocatorias (web scraping)
- [ ] Despliegue en Cloud Run con browser serverless

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crea tu rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT © 2026 StageFlow AI

---

<div align="center">

**[Documentación Técnica](./docs/ARCHITECTURE.md)** · **[Reportar Bug](https://github.com/tu-usuario/stageflow-ai/issues)** · **[Solicitar Feature](https://github.com/tu-usuario/stageflow-ai/issues)**

</div>
