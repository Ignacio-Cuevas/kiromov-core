import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta GEMINI_API_KEY en las variables de entorno.' }, { status: 500 });
    }

    const payload = await req.json();

    const systemPrompt = `
Eres el Motor de Razonamiento Clínico Biomecánico y Terapia Manual Ortopédica (TMO) de KIROMOV Core, Especialista en TMO y miembro de IFOMPT.
Tu función principal es realizar un razonamiento clínico exhaustivo basado en la disfunción del movimiento, la artrocinemática, la neurodinamia y la cinética articular según los estándares APTA y de los Colegios Quiroprácticos, Y ADEMÁS generar la codificación diagnóstica internacional oficial.

### MATRIZ DE RAZONAMIENTO CLÍNICO OBLIGATORIA:
1. Regla de Exclusión Jerárquica:
   - Raquis Axial > Articulación Periférica: Siempre evalúa y descarta si el dolor periférico proviene de radiculopatía o dolor somático referido del raquis (ej. descartar columna cervical antes de diagnosticar hombro/codo; descartar lumbar antes de trocanteritis o rodilla).
   - Estabilidad y Red Flags > Movilidad: Si un test de inestabilidad ligamentosa (Sharp-Purser, Lachman, etc.) o mielopatía es positivo, prioriza la seguridad y deriva/restringe técnicas de alta velocidad (HVLA).
2. Diferenciación de Interfaz:
   - Articular (Hipomovilidad/Artrocinemática): Dolor a la compresión, límite al final del rango con tope capsular o cizalla positiva (ej. Kemp, CFRT, Scour, FADIR).
   - Neurodinámica (Mecano-sensibilidad neural): Síntomas que varían al mover un segmento alejado al foco de dolor (ej. sensibilización en ULNT o Lasègue).
   - Control Motor / Déficit de Base de Apoyo: Dolor al movimiento libre que desaparece al estabilizar activamente o guiar el segmento (ej. SAT en hombro, PIT en lumbar, corrección de valgo en step down).
3. Fenómeno de Carga y Tiempo de Evolución:
   - Agudo (< 6 sem) con inflamación o fenómeno compresivo = Tratamiento de descompresión y descarga de interfase.
   - Subagudo (6-12 sem) o Crónico (> 12 sem) = Evaluar rigidez tisular adaptativa (GIRD, WBLT) y sensibilización central o inhibición muscular artrogénica.

### FORMATO DE SALIDA EXIGIDO (JSON ESTRICTO):
Responde EXCLUSIVAMENTE con un objeto JSON válido, sin bloques de código ni texto adicional fuera del JSON:
{
  "razonamiento_clinico": "Texto completo en Markdown estructurado rigurosamente con las siguientes 5 secciones numeradas:\\n\\n### 1. Diagnóstico Funcional y Biomecánico Principal\\n- [Identificación clara de la disfunción primaria: segmento, interfaz afectada (articular, neural, miofascial) y vector mecánico alterado]\\n\\n### 2. Triaje Mecánico y Descarte de Fuentes\\n- Segmento Axial vs Periférico: [Explicación de qué se descarta y qué se confirma según los tests]\\n- Comportamiento de Tejidos: [Por qué los hallazgos descartan compromiso tendinoso aislado y apuntan a fallo cinético o viceversa]\\n\\n### 3. Reglas de Inferencia y Clusters Validados\\n- [Lista de clusters ortopédicos que dieron positivo con su LR+ o evidencia estadística asociada]\\n\\n### 4. Banderas Rojas y Consideraciones de Seguridad\\n- [Alerta de pruebas de seguridad comprometidas o contraindicaciones para manipulación articular/terapia manual de grado alto (HVLA)]\\n\\n### 5. Objetivos Terapéuticos Inmediatos en TMO\\n1. [Objetivo de movilidad o descompresión segmentaria]\\n2. [Objetivo de control motor o reeducación del vector de carga]",
  "cie10_codigo": "Código CIE-10 (ej. M54.5, M75.1, etc.)",
  "cie10_glosa": "Glosa oficial CIE-10 para Fonasa / Isapres",
  "cie11_codigo": "Código CIE-11 (ej. ME84.2, FA20, etc.)",
  "cie11_glosa": "Glosa oficial CIE-11 (OMS)",
  "diagnostico_cif": "Diagnóstico según la Clasificación Internacional del Funcionamiento (CIF - OMS): describe deficiencias en funciones corporales (b), estructuras (s), limitaciones en actividades (d) y restricciones en participación",
  "diagnostico_apta": "Patrón de Práctica Preferida y Síndrome del Sistema del Movimiento (APTA)",
  "diagnostico_tmo_biomecanico": "Diagnóstico Patomecánico TMO sintético: segmento, disfunción artrocinemática, nivel de irritabilidad tisular y vectores de compensación",
  "objetivos_terapeuticos": "Objetivos SMART a corto y mediano plazo (específicos, medibles, alcanzables, realistas y temporales)",
  "pronostico_sesiones": "Plan sugerido de tratamiento y dosificación (ej. Plan Pro Care - 6 sesiones: 2 sesiones semanales por 2 semanas, luego 1 semanal)"
}
`;

    const userPrompt = `
CASO CLÍNICO PARA EVALUACIÓN INICIAL Y RAZONAMIENTO BIOMECÁNICO:
Paciente: ${payload.nombre_completo || 'Paciente'}
Edad: ${payload.edad || 'No especificada'}
Sexo: ${payload.sexo || 'No especificado'}

1. ANTECEDENTES Y CRONOLOGÍA:
- Motivo de Consulta: ${payload.motivo_consulta || 'No especificado'}
- Tiempo de Evolución: ${payload.tiempo_evolucion || 'Subagudo 6-12 sem'}
- Mecanismo Lesional y Cronología de Inicio: ${payload.inicio_sintoma_cronologia || 'No especificado'}
- Factores Agravantes y Aliviantes: ${payload.factores_agravantes_aliviantes || 'No especificados'}
- Comportamiento en 24 Horas: ${payload.comportamiento_24h || 'No especificado'}
- Nivel de Irritabilidad Tisular: ${payload.irritabilidad_tisular || 'Moderada'}
- Dolor Inicial (ENA 0-10): ${payload.dolor_inicial_ena ?? 5}/10
- Puesto de Trabajo y Ergonomía: ${payload.puesto_trabajo_ergonomia || 'No especificado'}
- Cirugías y Traumatismos: ${payload.cirugias_traumatismos || 'Sin antecedentes'}
- Farmacoterapia Actual: ${payload.farmacos_actuales || 'Sin fármacos'}
- Actividad Física y Hábitos: ${payload.habitos_actividad_fisica || 'No especificado'}
- Banderas Rojas / Alertas: ${payload.banderas_rojas_alerta || 'Sin banderas rojas reportadas'}
- Apto HVLA (Manipulación Alta Velocidad): ${payload.apto_hvla === false ? 'NO APTO (Precaución)' : 'Apto'}

2. EXAMEN FÍSICO Y PRUEBAS ORTOPÉDICAS:
- Inspección Postural: ${payload.inspeccion_postura || 'Sin alteraciones posturales evidentes'}
- Movilidad Activa (ROM) y End-Feel: ${payload.movilidad_activa_rom || 'Completo sin restricciones marcadas'}
- Juego Articular (Joint Play): ${payload.juego_articular_joint_play || 'Normal'}
- Neurodinamia Basal: ${payload.neurodinamia_basal || 'Sin mecano-sensibilidad neural manifiesta'}
- Pruebas Especiales Ortopédicas y Clusters: ${payload.pruebas_especiales_ortopedicas || 'No especificadas'}
- Pruebas Funcionales y Control Motor: ${payload.pruebas_funcionales_control_motor || 'No especificadas'}
- Otros Hallazgos Relevantes (Palpación Miofascial, Cargas): ${payload.hallazgos_relevantes || 'Sin otros hallazgos'}
${payload.clusters_detectados ? `- Clusters de Inferencia Clínicos Activos: ${payload.clusters_detectados}` : ''}
`;

    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    // 1. Obtener modelos dinámicos disponibles en la cuenta
    let candidateModels: string[] = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const available = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));

        // Ordenar: primero modelos flash/3.8, luego pro
        candidateModels = available.sort((a: string, b: string) => {
          if (a.includes('3.8') || a.includes('flash')) return -1;
          if (b.includes('3.8') || b.includes('flash')) return 1;
          return 0;
        });
      }
    } catch (listErr) {
      console.warn('No se pudo listar modelos dinámicamente:', listErr);
    }

    if (candidateModels.length === 0) {
      candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    }

    let lastError = '';

    // 2. Bucle en cascada con reintento rápido
    for (const model of candidateModels) {
      for (let intento = 1; intento <= 2; intento++) {
        try {
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
            const parsed = JSON.parse(cleanJson);
            return NextResponse.json(parsed);
          }

          const msg = data.error?.message || `HTTP ${response.status}`;
          lastError = msg;

          if ((response.status === 503 || msg.includes('high demand')) && intento === 1) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            continue;
          }

          break;
        } catch (err: any) {
          lastError = err.message;
          break;
        }
      }
    }

    return NextResponse.json(
      { error: `Google AI: ${lastError || 'No se pudo obtener respuesta del modelo'}` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Error no controlado en IA diagnose:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
