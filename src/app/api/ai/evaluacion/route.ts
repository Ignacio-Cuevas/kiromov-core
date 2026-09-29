import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta GEMINI_API_KEY" }, { status: 500 });
    }

    const { anamnesis, segmento_evaluado, datos_segmento } = await req.json();

    // 1. Obtener modelos activos con fallback en cascada
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!listRes.ok) {
      return NextResponse.json({ error: "Error en API Key de Gemini" }, { status: 500 });
    }

    const listData = await listRes.json();
    const availableModels: string[] = listData.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      ?.map((m: any) => m.name.replace("models/", "")) || [];

    const uniqueCandidates = Array.from(new Set([
      ...availableModels.filter(m => m.includes("flash")),
      ...availableModels.filter(m => m.includes("pro")),
      ...availableModels
    ]));

    // 2. Prompt de Razonamiento Clínico TMO
    const systemPrompt = `
Eres un Kinesiólogo experto en Terapia Manual Ortopédica (TMO) en Chile.
Tu rol es analizar los hallazgos de una Evaluación Inicial Kinésica y emitir un diagnóstico funcional y objetivos terapéuticos con alto rigor biomecánico.

DATOS DEL PACIENTE:
- Segmento evaluado: ${segmento_evaluado}
- Anamnesis y Dolor (EVA): ${JSON.stringify(anamnesis)}
- Examen Físico, Arcos de Movimiento (ROM), Pruebas Ortopédicas y Neurodinamia: ${JSON.stringify(datos_segmento)}

INSTRUCCIONES CLÍNICAS:
1. "diagnostico_tmo": Redacta un diagnóstico kinésico funcional formal (no médico genérico). Incluye la disfunción articular/mecánica, mecanosensibilidad neural si existe, segmento implicado y compensaciones observadas.
2. "objetivos_corto_plazo": Redacta 3 o 4 objetivos concisos a corto plazo (ej: modular dolor EVA, restaurar movilidad accesoria/fisiológica, normalizar mecanosensibilidad y control motor).
3. "plan_recomendado": Sugiere uno de los siguientes según severidad: "Plan Activa Care - 4 ses", "Plan Pro Care - 6 ses", "Plan Integral - 10 ses" o "Sesión Individual".
4. "frecuencia_semanal": Sugiere la dosificación (ej: "2 sesiones semanales por 2 semanas, luego 1 semanal").

Devuelve ESTRICTAMENTE un JSON válido con las claves: "diagnostico_tmo", "objetivos_corto_plazo", "plan_recomendado", "frecuencia_semanal".
`;

    // 3. Ejecución en cascada
    let lastError = null;
    for (const modelName of uniqueCandidates) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        );

        if (!res.ok) {
          const errData = await res.json();
          lastError = errData.error?.message;
          continue;
        }

        const data = await res.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        rawText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(rawText);

        return NextResponse.json(parsed);
      } catch (err: any) {
        lastError = err.message;
        continue;
      }
    }

    return NextResponse.json({ error: lastError || "Servidores de IA temporalmente no disponibles." }, { status: 503 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
