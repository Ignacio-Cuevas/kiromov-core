const fs = require('fs');

const routeCode = `import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY no existe en las variables de entorno de Vercel.');
      return NextResponse.json(
        { error: 'Falta la variable GEMINI_API_KEY en Vercel.' },
        { status: 500 }
      );
    }

    const payload = await req.json();

    const systemPrompt = \`
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
\`;

    const userPrompt = \`
Paciente: \${payload.nombre_completo || 'Paciente'}
Edad: \${payload.edad || 'No especificada'}
Motivo: \${payload.motivo_consulta || 'No especificado'}
Trabajo/Ergonomía: \${payload.puesto_trabajo_ergonomia || 'No especificado'}
Cirugías/Antecedentes: \${payload.cirugias_traumatismos || 'Sin antecedentes'}
Fármacos: \${payload.farmacos_actuales || 'Sin fármacos'}
Síntoma/Cronología: \${payload.inicio_sintoma_cronologia || 'No especificado'}
Irritabilidad: \${payload.irritabilidad_tisular || 'Moderada'}
Dolor ENA: \${payload.dolor_inicial_ena ?? 5}
Hallazgos y Pruebas Ortopédicas: \${payload.pruebas_especiales_ortopedicas || 'No especificadas'}
Pruebas Funcionales: \${payload.pruebas_funcionales_control_motor || 'No especificadas'}
\`;

    // Usar modelo gemini-1.5-flash oficial
    const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`;

    console.log('Iniciando llamada a Gemini API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: \`\${systemPrompt}\\n\\n\${userPrompt}\` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    const data = await response.json();

    // 1. SI GOOGLE DEVUELVE ERROR: No intentar parsear, devolver el mensaje textual de Google
    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || \`Error HTTP \${response.status}: \${response.statusText}\`;
      console.error('Respuesta de error desde Google Gemini API:', JSON.stringify(data.error || data));
      return NextResponse.json(
        { error: \`Google AI: \${errorMsg}\` },
        { status: response.status || 400 }
      );
    }

    // 2. EXTRAER TEXTO Y LIMPIAR
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('Gemini respondió 200 OK pero sin candidates:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'Google AI no generó contenido para esta consulta.' },
        { status: 500 }
      );
    }

    const cleanJson = rawText.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error no controlado en /api/ai/diagnose:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
`;

fs.writeFileSync('src/app/api/ai/diagnose/route.ts', routeCode);
