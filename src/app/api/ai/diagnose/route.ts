import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    // 1. OBTENER EN VIVO LOS MODELOS REALES DISPONIBLES EN TU CUENTA
    let candidateModels: string[] = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const available = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));

        // Ordenar: primero los modelos 'flash' más recientes, luego cualquier otro
        candidateModels = available.sort((a: string, b: string) => {
          if (a.includes('3.8') || a.includes('flash')) return -1;
          if (b.includes('3.8') || b.includes('flash')) return 1;
          return 0;
        });
      }
    } catch (listErr) {
      console.warn('No se pudo listar modelos dinámicamente:', listErr);
    }

    // Si la lista de Google devolvió modelos, usarlos; de lo contrario, usar gemini-3.8-flash por defecto
    if (candidateModels.length === 0) {
      candidateModels = ['gemini-3.8-flash'];
    }

    console.log('Modelos reales disponibles en tu cuenta:', candidateModels);

    let lastError = '';

    // 2. BUCLE EN CASCADA CON REINTENTO RÁPIDO
    for (const model of candidateModels) {
      for (let intento = 1; intento <= 2; intento++) {
        try {
          console.log(`Llamando a modelo ${model} (intento ${intento})...`);
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });

          const data = await response.json();

          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const rawText = data.candidates[0].content.parts[0].text;
            const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return NextResponse.json(JSON.parse(cleanJson));
          }

          const msg = data.error?.message || `HTTP ${response.status}`;
          lastError = msg;

          // Si es alta demanda (503/high demand) y es el primer intento, pausar 1.2 segundos y reintentar
          if ((response.status === 503 || msg.includes('high demand')) && intento === 1) {
            console.log(`Modelo ${model} con alta demanda momentánea. Esperando 1.2s...`);
            await new Promise((resolve) => setTimeout(resolve, 1200));
            continue;
          }

          // Si es otro error o falló el reintento, pasar al siguiente modelo
          break;
        } catch (err: any) {
          lastError = err.message;
          break;
        }
      }
    }

    return NextResponse.json(
      { error: `Google AI: ${lastError}` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Error no controlado:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
