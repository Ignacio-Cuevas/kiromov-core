const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ReimbursementCertificate.tsx', 'utf-8');

// 1. Update the component to fetch evaluaciones_iniciales_tmo
const fetchCitas = `const { data: evalData } = await supabase
          .from('evaluaciones_iniciales_tmo')
          .select('cie10_codigo, cie10_glosa, diagnostico_tmo')
          .eq('paciente_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let diagStr = patient.diagnostico_principal || patient.motivo_consulta || 'Rehabilitación Musculoesquelética y TMO';
        let codigoStr = '';
        if (evalData) {
           diagStr = evalData.cie10_glosa || evalData.diagnostico_tmo || diagStr;
           codigoStr = evalData.cie10_codigo ? \`(\${evalData.cie10_codigo})\` : '';
           setDiagnosticoEditable(\`\${diagStr} \${codigoStr}\`.trim());
        } else {
           setDiagnosticoEditable(diagStr);
        }

        // 1. Asistencias`;
content = content.replace(/\/\/ 1\. Asistencias/, fetchCitas);

// Update default prestation text
content = content.replace(/prestacion: idx === 0 \n\s*\? 'Evaluación Kinésica Integral \+ TMO' \n\s*\: 'Tratamiento Kinésico y Terapia Manual Ortopédica'/g, "prestacion: 'Atención Kinesiológica Integral Ambulatoria (Código Fonasa 06-01-105)'");
content = content.replace(/prestacion: 'Evaluación Kinésica Integral \+ TMO'/g, "prestacion: 'Atención Kinesiológica Integral Ambulatoria (Código Fonasa 06-01-105)'");

// Add new state variables for Monto and Medico
content = content.replace(/const \[boleta2, setBoleta2\] = useState\(''\);/, "const [boleta2, setBoleta2] = useState('');\n  const [montoTotal, setMontoTotal] = useState('');\n  const [medicoDerivador, setMedicoDerivador] = useState('');");

// Update UI to add Medico Derivador, Monto and fix header
// Finding the header
const oldHeader = `<div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">`;
const newHeader = `<div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
                <div className="flex gap-4 items-center">
                  {logoSrc && (
                    <img 
                      src={logoSrc} 
                      alt="Logo Kiromov" 
                      className="h-16 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = \`\${supabaseUrl}/storage/v1/object/public/branding/public%3Alogo.png\`;
                      }}
                    />
                  )}
                  <div className="text-sm font-sans text-slate-800">
                    <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900 mb-0.5">KIROMOV CENTRO CLÍNICO</h1>
                    <p className="font-semibold text-slate-700 text-xs uppercase tracking-widest mb-1">Kinesiología & Terapia Manual Ortopédica</p>
                    <p className="text-xs">Bulnes 470, Oficina 75 (Piso 7, Edificio Aranjuez), Chillán</p>
                    <p className="text-[11px] text-slate-500">contacto@kiromov.cl | https://kiromov.cl | +56 9 3395 7501</p>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest border border-slate-900 px-3 py-1 inline-block">CERTIFICADO MÉDICO</h2>
                  <p className="text-xs text-slate-500 mt-2 font-mono">FECHA EMISIÓN: {getChileanDate()}</p>
                </div>
              </div>`;

content = content.replace(/<div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, newHeader);

// Add fields below diagnostic
content = content.replace(/<\/div>\n\n\s*<div className="mt-8">/, `</div>
              
              <div className="flex gap-2 items-center">
                <span className="font-bold text-slate-700 w-32 shrink-0">Médico Derivador:</span>
                <input
                  type="text"
                  value={medicoDerivador}
                  onChange={(e) => setMedicoDerivador(e.target.value)}
                  placeholder="Nombre del médico u orden (Opcional)"
                  className="flex-1 font-sans border-b border-slate-300 p-0 bg-transparent text-sm focus:ring-0 focus:border-blue-500 outline-none print:border-none print:p-0"
                />
              </div>

              <div className="flex gap-2 items-center">
                <span className="font-bold text-slate-700 w-32 shrink-0">Total Cancelado:</span>
                <input
                  type="text"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value)}
                  placeholder="Ej. $145.000 CLP"
                  className="font-sans border-b border-slate-300 p-0 bg-transparent text-sm font-semibold focus:ring-0 focus:border-blue-500 outline-none print:border-none print:p-0 w-48"
                />
              </div>

            </div>

            <div className="mt-8">`);

// Make sure that the "Boletas" fields correctly update to be responsive
// "Boleta Evaluación:" / "Boleta Tratamiento:" section
content = content.replace(/Boleta Evaluación:/g, "Boleta(s) de Honorarios:");
content = content.replace(/Boleta Tratamiento:/g, "N° Adicional:");

// Update print styles to strict 1 page
const printStyles = `        {/* Estilos estrictos para impresión */}
        <style dangerouslySetInnerHTML={{ __html: \`
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              background: white !important;
            }
            .print-hide { display: none !important; }
            .print-layout {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 2cm;
              box-sizing: border-box;
              background: white;
              page-break-after: avoid;
            }
            @page {
              size: letter portrait;
              margin: 0;
            }
          }
        \`}} />`;

content = content.replace(/<style dangerouslySetInnerHTML=\{\{ __html: \`[\s\S]*?\`\}\} \/>/, printStyles);

// Pre-fill Monto Total
content = content.replace(/setBoleta2\(planData\.numero_boleta \|\| ''\);/, "setBoleta2(planData.numero_boleta || '');\n          setMontoTotal(`$${planData.valor_total ? planData.valor_total.toLocaleString('es-CL') : '0'} CLP`);");

fs.writeFileSync('src/components/clinical/ReimbursementCertificate.tsx', content);
