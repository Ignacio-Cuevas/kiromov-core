const fs = require('fs');
let content = fs.readFileSync('src/app/api/ai/diagnose/route.ts', 'utf-8');

// Extraer el systemPrompt y userPrompt actuales
const systemPromptMatch = content.match(/const systemPrompt = `([\s\S]*?)`;/);
const userPromptMatch = content.match(/const userPrompt = `([\s\S]*?)`;/);

if (!systemPromptMatch || !userPromptMatch) {
  console.error("No se pudo extraer los prompts");
  process.exit(1);
}

const systemPrompt = systemPromptMatch[1];
const userPrompt = userPromptMatch[1];

const newContent = `// src/app/api/ai/diagnose/route.ts
import { NextResponse } from 'next/server';

async function getAvailableGeminiModel(apiKey: string): Promise<string> {
  try {
    const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models?key=\${apiKey}\`);
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

    const systemPrompt = \`${systemPrompt}\`;

    const userPrompt = \`${userPrompt}\`;

    // 1. Detectar el modelo disponible dinámicamente
    const modelName = await getAvailableGeminiModel(apiKey);
    console.log(\`Usando modelo Gemini detectado: \${modelName}\`);

    // 2. Ejecutar la llamada con el modelo detectado
    const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${modelName}:generateContent?key=\${apiKey}\`;
    
    const response = await fetch(url, {
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

    const cleanJson = rawText.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error en diagnóstico IA:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/ai/diagnose/route.ts', newContent);
