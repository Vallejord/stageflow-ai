import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";

// Tipos para la respuesta estructurada
interface ChecklistItem {
  requisito: string;
  cumple: boolean;
  detalle: string;
}

interface MapeoCampo {
  pregunta_id: string;
  label: string;
  valor_inyectar: string;
}

interface AnalisisResponse {
  compatible: boolean;
  checklist: ChecklistItem[];
  mapeo_campos: MapeoCampo[];
}

// Tipo para el cuerpo de la solicitud
interface IngestRequestBody {
  convocatoria_contenido?: string;
  convocatoria_url?: string;
  requisitos?: {
    duracion_min?: number;
    duracion_max?: number;
    paises_permitidos?: string[];
    requiere_video?: boolean;
    requiere_dossier?: boolean;
  };
}

// System prompt para el análisis de compatibilidad
const SYSTEM_PROMPT = `Eres un asistente especializado en analizar convocatorias de festivales de teatro y artes escénicas.

Tu tarea es:
1. Analizar si una obra teatral cumple con los requisitos de una convocatoria de festival.
2. Generar un checklist detallado de requisitos y su cumplimiento.
3. Mapear los campos del perfil de la obra a las preguntas típicas de formularios de convocatoria.

IMPORTANTE: 
- Responde ÚNICAMENTE con un JSON válido, sin texto adicional.
- Evalúa cada requisito de forma precisa basándote en los datos proporcionados.
- Si un dato no está disponible, indica "No especificado" en el detalle.

El formato de respuesta debe ser exactamente:
{
  "compatible": boolean,
  "checklist": [
    { "requisito": "descripción del requisito", "cumple": boolean, "detalle": "explicación" }
  ],
  "mapeo_campos": [
    { "pregunta_id": "número", "label": "nombre del campo", "valor_inyectar": "valor del perfil" }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "tu_api_key_aqui") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada. Por favor configura tu API key en .env.local" },
        { status: 500 }
      );
    }

    // Parsear el cuerpo de la solicitud
    const body: IngestRequestBody = await request.json();
    const { convocatoria_contenido, convocatoria_url, requisitos } = body;

    if (!convocatoria_contenido && !convocatoria_url) {
      return NextResponse.json(
        { error: "Debes proporcionar convocatoria_contenido o convocatoria_url" },
        { status: 400 }
      );
    }

    // Leer el perfil de la obra desde el archivo local
    const obraPath = path.join(process.cwd(), "data", "obra-demo.json");
    const obraData = await fs.readFile(obraPath, "utf-8");
    const obraProfile = JSON.parse(obraData);

    // Construir el prompt del usuario
    const userPrompt = buildUserPrompt(
      obraProfile,
      convocatoria_contenido || `URL de convocatoria: ${convocatoria_url}`,
      requisitos
    );

    // Inicializar cliente de Gemini
    const genai = new GoogleGenAI({ apiKey });

    // Llamar a Gemini para el análisis
    const response = await genai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3, // Baja temperatura para respuestas más consistentes
        responseMimeType: "application/json",
      },
    });

    // Extraer el texto de la respuesta
    const responseText = response.text;
    
    if (!responseText) {
      return NextResponse.json(
        { error: "No se recibió respuesta del modelo" },
        { status: 500 }
      );
    }

    // Parsear la respuesta JSON
    let analisis: AnalisisResponse;
    try {
      analisis = JSON.parse(responseText);
    } catch {
      // Si falla el parsing, intentar extraer JSON del texto
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analisis = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "Error al parsear respuesta del modelo", raw: responseText },
          { status: 500 }
        );
      }
    }

    // Retornar el análisis estructurado
    return NextResponse.json({
      success: true,
      obra: obraProfile.general.nombre_artista_agrupacion,
      titulo_obra: obraProfile.espectaculo.titulo,
      analisis,
    });

  } catch (error) {
    console.error("Error en /api/ingest:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        detalle: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

function buildUserPrompt(
  obraProfile: Record<string, unknown>,
  convocatoriaInfo: string,
  requisitos?: IngestRequestBody["requisitos"]
): string {
  const requisitosTexto = requisitos
    ? `
REQUISITOS ESPECÍFICOS DE LA CONVOCATORIA:
- Duración permitida: ${requisitos.duracion_min || "No especificado"} - ${requisitos.duracion_max || "No especificado"} minutos
- Países permitidos: ${requisitos.paises_permitidos?.join(", ") || "No especificado"}
- Requiere video: ${requisitos.requiere_video ? "Sí" : "No especificado"}
- Requiere dossier/carpeta: ${requisitos.requiere_dossier ? "Sí" : "No especificado"}
`
    : "";

  return `
PERFIL DE LA OBRA:
${JSON.stringify(obraProfile, null, 2)}

INFORMACIÓN DE LA CONVOCATORIA:
${convocatoriaInfo}
${requisitosTexto}

Por favor analiza:
1. Si la obra cumple con los requisitos del festival (duración, país de origen, materiales requeridos como video y dossier).
2. Genera un checklist detallado de cada requisito verificado.
3. Mapea los campos del perfil a las preguntas típicas de formularios de inscripción:
   - Nombre del artista/agrupación
   - País de origen
   - Email de contacto
   - Teléfono/WhatsApp
   - Título de la obra
   - Sinopsis
   - Duración
   - Público objetivo
   - Link a video
   - Link a carpeta/dossier
   - Rider técnico
   - Honorarios

Responde con el JSON estructurado.`;
}

// GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/ingest",
    description: "Endpoint para analizar compatibilidad de obras con convocatorias",
    usage: {
      method: "POST",
      body: {
        convocatoria_contenido: "Texto de la convocatoria (opcional si se provee URL)",
        convocatoria_url: "URL de la convocatoria (opcional si se provee contenido)",
        requisitos: {
          duracion_min: "número (minutos)",
          duracion_max: "número (minutos)",
          paises_permitidos: ["array de países"],
          requiere_video: "boolean",
          requiere_dossier: "boolean",
        },
      },
    },
  });
}
