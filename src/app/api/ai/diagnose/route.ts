import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lista de modelos ordenada por preferencia (velocidad / costo / disponibilidad)
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta GEMINI_API_KEY en Vercel.' }, { status: 500 });
    }

    const payload = await req.json();

    const systemPrompt = `
Eres un Kinesiólogo Especialista en Terapia Manual Ortopédica (TMO) y miembro de IFOMPT.
Analiza la evaluación clínica y responde EXCLUSIVAMENTE con un JSON válido sin texto adicional:
{
  "cie10_codigo": "Código CIE-10 (ej. M54.5)",
  "cie10_glosa": "Glosa CIE-10",
  "cie11_codigo": "Código CIE-11 (ej. ME84.2)",
  "cie11_glosa": "Glosa CIE-11",
  "diagnostico_cif": "Diagnóstico según la CIF (OMS)",
  "diagnostico_apta": "Patrón de Práctica Preferida y Síndrome del Sistema del Movimiento (APTA)",
  "diagnostico_tmo_biomecanico": "Diagnóstico TMO e irritabilidad tisular",
  "objetivos_terapeuticos": "Objetivos SMART",
  "pronostico_sesiones": "Plan sugerido (ej. Pro Care 6 sesiones)"
}
`;

    const userPrompt = `
Paciente: ${payload.nombre_completo || 'Paciente'}
Edad: ${payload.edad || 'No especificada'}
Motivo: ${payload.motivo_consulta || 'No especificado'}
Trabajo/Ergonomía: ${payload.puesto_trabajo_ergonomia || 'No especificado'}
Cirugías/Antecedentes: ${payload.cirugias_traumatismos || 'Sin antecedentes'}
Fármacos: ${payload.farmacos_actuales || 'Sin fármacos'}
Síntoma/Cronología: ${payload.inicio_sintoma_cronologia || 'No especificado'}
Irritabilidad: ${payload.irritabilidad_tisular || 'Moderada'}
Dolor ENA: ${payload.dolor_inicial_ena ?? 5}
Hallazgos y Pruebas Ortopédicas: ${payload.pruebas_especiales_ortopedicas || 'No especificadas'}
Pruebas Funcionales: ${payload.pruebas_funcionales_control_motor || 'No especificadas'}
`;

    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    let lastErrorMessage = '';

    // 2. BUCLE EN CASCADA: Intentar con cada modelo si el anterior está saturado o no disponible
    for (const model of CANDIDATE_MODELS) {
      try {
        console.log(`Intentando generar diagnóstico con modelo: ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

        const data = await response.json();

        // Si el modelo responde OK y con contenido, parsear y retornar de inmediato
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          console.log(`Diagnóstico generado exitosamente con el modelo: ${model}`);
          return NextResponse.json(parsed);
        }

        // Si falló (ej. high demand, rate limit o 404), registrar y continuar con el siguiente modelo
        const errorDetail = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`Modelo ${model} no disponible (${errorDetail}). Probando siguiente modelo...`);
        lastErrorMessage = errorDetail;
      } catch (err: any) {
        console.warn(`Error de red al consultar ${model}:`, err.message);
        lastErrorMessage = err.message;
      }
    }

    // Si todos los modelos de la lista fallaron, retornar el último error recibido
    return NextResponse.json(
      { error: `Google AI (todos los modelos saturados): ${lastErrorMessage}` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Error no controlado en diagnóstico IA:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
