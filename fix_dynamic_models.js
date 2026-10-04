const fs = require('fs');

const code = `import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta GEMINI_API_KEY en Vercel.' }, { status: 500 });
    }

    const payload = await req.json();

    // 1. CONSULTAR A GOOGLE QUÉ MODELOS TIENE ACTIVOS ESTA API KEY (ListModels)
    const listRes = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models?key=\${apiKey}\`);
    const listData = await listRes.json();

    if (!listRes.ok || !listData.models) {
      console.error('Error listando modelos:', listData);
      return NextResponse.json(
        { error: \`Google AI no pudo listar modelos: \${listData.error?.message || 'Error de clave'}\` },
        { status: 400 }
      );
    }

    // Filtrar modelos que admitan generateContent
    const validModels = listData.models.filter((m: any) =>
      m.supportedGenerationMethods?.includes('generateContent')
    );

    // Priorizar: flash -> pro -> cualquiera válido
    const selected =
      validModels.find((m: any) => m.name.includes('flash')) ||
      validModels.find((m: any) => m.name.includes('pro')) ||
      validModels[0];

    if (!selected) {
      return NextResponse.json(
        { error: 'No se encontraron modelos compatibles con generateContent para esta API Key.' },
        { status: 400 }
      );
    }

    console.log(\`Modelo seleccionado dinámicamente de tu cuenta: \${selected.name}\`);

    // 2. CONSTRUIR PROMPTS
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

    // 3. EJECUTAR LLAMADA CON EL NOMBRE EXACTO DEL MODELO DE TU CUENTA
    // selected.name ya viene en formato "models/nombre-del-modelo"
    const generateUrl = \`https://generativelanguage.googleapis.com/v1beta/\${selected.name}:generateContent?key=\${apiKey}\`;

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: \`\${systemPrompt}\\n\\n\${userPrompt}\` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return NextResponse.json(
        { error: \`Google AI: \${data.error?.message || response.statusText}\` },
        { status: response.status || 400 }
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: 'Google AI no devolvió texto.' }, { status: 500 });
    }

    const cleanJson = rawText.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error en diagnóstico IA:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/ai/diagnose/route.ts', code);
