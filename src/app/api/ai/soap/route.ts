import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta GEMINI_API_KEY" }, { status: 500 });
    }

    const { notas_rapidas, eva_actual, paciente_id, diagnostico_base, segmento } = await req.json();

    // 1. Obtener modelos activos
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!listRes.ok) {
      return NextResponse.json({ error: "API Key de Gemini no válida" }, { status: 500 });
    }

    const listData = await listRes.json();
    const availableModels: string[] = listData.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      ?.map((m: any) => m.name.replace("models/", "")) || [];

    // Orden de prioridad en cascada (del más rápido al más estable)
    const priorityList = [
      ...availableModels.filter(m => m.includes("flash")),
      ...availableModels.filter(m => m.includes("pro")),
      ...availableModels
    ];
    // Eliminar duplicados
    const uniqueCandidates = Array.from(new Set(priorityList));

    const systemPrompt = `
Eres un Kinesiólogo experto en Terapia Manual Ortopédica (TMO) en Chile.
Anonimización Estricta: No procesar PII (nombres, RUT, teléfonos).
Redacta una evolución clínica formal en formato SOAP en base a los siguientes datos:
NOTAS DEL BOX: "${notas_rapidas}"
DOLOR ACTUAL (EVA): ${eva_actual}/10
DIAGNÓSTICO BASE: ${diagnostico_base || 'No especificado'}
SEGMENTO A TRATAR: ${segmento || 'General'}

Devuelve estrictamente un objeto JSON con las claves: "subjetivo", "objetivo", "analisis", "plan".
Usa terminología técnica formal de kinesiología TMO.
`;

    // 2. Intentar en cascada con los modelos disponibles hasta que uno responda
    let lastError = null;
    for (const modelName of uniqueCandidates) {
      try {
        // Model cascade: trying ${modelName}
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
          console.warn(`[Copiloto SOAP] Modelo ${modelName} no disponible (${res.status}), probando siguiente...`);
          lastError = errData.error?.message || `Error ${res.status}`;
          continue; // Pasa al siguiente modelo de la lista
        }

        const data = await res.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        rawText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(rawText);

        // Model cascade: success with ${modelName}
        return NextResponse.json(parsed);
      } catch (err: any) {
        lastError = err.message;
        continue;
      }
    }

    // Si todos fallaron
    return NextResponse.json({ error: lastError || "Servidores de IA temporalmente saturados. Intenta en unos segundos." }, { status: 503 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
