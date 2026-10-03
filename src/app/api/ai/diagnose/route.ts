// src/app/api/ai/diagnose/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
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

    // Llamada al proveedor de IA (ej. Google Gemini API o SDK compatible)
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2, // Baja temperatura para precisión diagnóstica
          },
        }),
      }
    );

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawJson);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error generando diagnóstico IA:', error);
    return NextResponse.json({ error: 'Error al generar diagnóstico' }, { status: 500 });
  }
}
