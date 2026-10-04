// src/app/api/ai/diagnose/route.ts
import { NextResponse } from 'next/server';

async function getAvailableGeminiModel(apiKey: string): Promise<string> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = data.models || [];
      
      // Buscar modelos que soporten generateContent y priorizar flash
      const candidate = models.find((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') && 
        (m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-2.0-flash') || m.name.includes('flash'))
      );
      
      if (candidate) {
        // Limpiar el prefijo 'models/' si viene incluido
        return candidate.name.replace('models/', '');
      }

      // Si no encuentra flash, buscar cualquier gemini válido
      const anyModel = models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
      if (anyModel) {
        return anyModel.name.replace('models/', '');
      }
    }
  } catch (err) {
    console.warn('Fallo en consulta de modelos disponibles, usando fallback:', err);
  }
  
  // Fallback seguro por defecto
  return 'gemini-1.5-flash';
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 });
    }

    const payload = await req.json();

    const systemPrompt = `
Eres un Kinesiólogo Especialista en Terapia Manual Ortopédica (TMO) certificado bajo estándares de la International Federation of Orthopaedic Manipulative Physical Therapists (IFOMPT) y del Ministerio de Salud de Chile (Fonasa/Isapres).

Tu labor es analizar la evaluación clínica completa del paciente y generar un informe diagnóstico riguroso, estructurado y aplicable.

Debes responder OBLIGATORIAMENTE en formato JSON con la siguiente estructura exacta:
{
  "cie10_codigo": "Código CIE-10 (ej. M54.5, M75.1, M22.2)",
  "cie10_glosa": "Glosa clínica oficial Fonasa/CIE-10",
  "cie11_codigo": "Código CIE-11 de la OMS (ej. ME84.2, FB40.1)",
  "cie11_glosa": "Glosa oficial CIE-11",
  "diagnostico_cif": "Diagnóstico kinésico según la CIF (OMS) abarcando: Deficiencias en Funciones Corporales (b), Estructuras (s), Limitación en Actividades (d) y Restricción en Participación laboral/recreativa (d).",
  "diagnostico_tmo_biomecanico": "Diagnóstico patomecánico y de TMO (disfunción articular, componente miofascial, control motor, neurodinamia e irritabilidad tisular).",
  "objetivos_terapeuticos": "Objetivos SMART a corto, mediano y largo plazo.",
  "pronostico_sesiones": "Estimación recomendada (ej. 4 a 6 sesiones, o Plan Pro Care / Integral)"
}
`;

    const userPrompt = `
DATOS DEL PACIENTE:
- Edad: ${payload.edad ?? 'No especificada'}
- Sexo: ${payload.sexo ?? 'No especificado'}
- Motivo de Consulta: ${payload.motivo_consulta ?? ''}
- Puesto de Trabajo / Ergonomía: ${payload.puesto_trabajo_ergonomia ?? 'No especificado'}
- Antecedentes (Cirugías / Fracturas / Traumatismos): ${payload.cirugias_traumatismos ?? 'Sin antecedentes relevantes'}
- Farmacoterapia Actual: ${payload.farmacos_actuales ?? 'Sin fármacos'}
- Banderas Rojas / Alertas: ${payload.banderas_rojas_alerta ?? 'Negativas'}

ANAMNESIS PRÓXIMA Y COMPORTAMIENTO DEL SÍNTOMA:
- Cronología / Mecanismo de Inicio: ${payload.inicio_sintoma_cronologia ?? ''}
- Tiempo de Evolución: ${payload.tiempo_evolucion ?? ''}
- Comportamiento 24h: ${payload.comportamiento_24h ?? ''}
- Factores Agravantes / Aliviantes: ${payload.factores_agravantes_aliviantes ?? ''}
- Nivel de Irritabilidad Tisular: ${payload.irritabilidad_tisular ?? 'Moderada'}
- Dolor Inicial ENA (0-10): ${payload.dolor_inicial_ena ?? 0}

HALLAZGOS DEL EXAMEN FÍSICO Y BIOMECÁNICA:
- Inspección Postural: ${payload.inspeccion_postura ?? ''}
- Movilidad Activa (ROM): ${payload.movilidad_activa_rom ?? ''}
- Juego Articular (Joint Play): ${payload.juego_articular_joint_play ?? ''}
- Neurodinamia Basal: ${payload.neurodinamia_basal ?? ''}
- Pruebas Especiales Ortopédicas: ${payload.pruebas_especiales_ortopedicas ?? 'Sin pruebas específicas adicionales'}
- Pruebas Funcionales / Control Motor: ${payload.pruebas_funcionales_control_motor ?? 'Sin hallazgos adicionales'}
- Hallazgos Relevantes Adicionales: ${payload.hallazgos_relevantes ?? ''}
`;

    // 1. Detectar el modelo disponible dinámicamente
    const modelName = await getAvailableGeminiModel(apiKey);
    console.log(`Usando modelo Gemini detectado: ${modelName}`);

    // 2. Ejecutar la llamada con el modelo detectado
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Error de API Gemini:', data.error);
      return NextResponse.json(
        { error: data.error?.message || 'Error en la respuesta de la IA' },
        { status: response.status || 500 }
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: 'Respuesta vacía de la IA' }, { status: 500 });
    }

    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error en diagnóstico IA:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
