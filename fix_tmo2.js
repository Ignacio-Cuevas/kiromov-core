const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const newContent = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                {/* Tarjeta Resumen */}
                <div className="col-span-1 md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                      {evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? '🦴' : 
                       evaluacionInicialTMO.segmento_evaluado === 'cervical' ? '🧠' : 
                       evaluacionInicialTMO.segmento_evaluado === 'hombro' ? '💪' : '➕'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {evaluacionInicialTMO.segmento_evaluado === 'lumbar' ? 'Columna Lumbar' : 
                         evaluacionInicialTMO.segmento_evaluado === 'cervical' ? 'Columna Cervical' : 
                         evaluacionInicialTMO.segmento_evaluado === 'hombro' ? 'Hombro' : 'Evaluación General'}
                      </h3>
                      <p className="text-sm text-slate-500">Fecha: {evaluacionInicialTMO.fecha_evaluacion}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase">EVA Inicial</span>
                      <span className="font-bold text-blue-600 text-lg">{evaluacionInicialTMO.anamnesis?.eva ?? evaluacionInicialTMO.dolor_inicial_ena ?? 0}/10</span>
                    </div>
                  </div>
                </div>

                {/* Detalles de Anamnesis */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    1. Anamnesis y Dolor
                  </h3>
                  <div className="space-y-2 text-xs">
                    <p><span className="font-bold text-slate-700">Motivo:</span> {evaluacionInicialTMO.anamnesis?.motivo_consulta || '-'}</p>
                    <p><span className="font-bold text-slate-700">Tiempo de evolución:</span> {evaluacionInicialTMO.anamnesis?.tiempo_evolucion || '-'}</p>
                    <p><span className="font-bold text-slate-700">Dolor nocturno:</span> {evaluacionInicialTMO.anamnesis?.dolor_nocturno ? 'Sí' : 'No'}</p>
                    <p><span className="font-bold text-slate-700">Aumenta con:</span> {evaluacionInicialTMO.anamnesis?.aumenta_con || '-'}</p>
                    <p><span className="font-bold text-slate-700">Disminuye con:</span> {evaluacionInicialTMO.anamnesis?.disminuye_con || '-'}</p>
                    
                    {evaluacionInicialTMO.anamnesis?.banderas_rojas?.length > 0 && (
                      <div className="mt-2 p-2 bg-rose-50 rounded text-rose-700">
                        <span className="font-bold">Banderas Rojas:</span> {evaluacionInicialTMO.anamnesis.banderas_rojas.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pruebas Físicas (Expansible o directo) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    2. Pruebas y Segmento
                  </h3>
                  <div className="space-y-2 text-xs overflow-auto max-h-48">
                    {evaluacionInicialTMO.datos_segmento && Object.keys(evaluacionInicialTMO.datos_segmento).length > 0 ? (
                      <ul className="space-y-1">
                        {Object.entries(evaluacionInicialTMO.datos_segmento).map(([key, val]) => (
                          <li key={key} className="flex justify-between border-b border-slate-50 pb-1">
                            <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-semibold text-slate-800">{String(val)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">No hay datos de segmento registrados.</p>
                    )}
                  </div>
                </div>

                {/* Diagnóstico y Plan */}
                <div className="col-span-1 md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    3. Diagnóstico y Plan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Diagnóstico TMO</span>
                      <p className="bg-slate-50 p-2 rounded">{evaluacionInicialTMO.diagnostico_tmo || evaluacionInicialTMO.diagnostico_funcional || '-'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Plan de Tratamiento</span>
                      <p className="bg-slate-50 p-2 rounded">{evaluacionInicialTMO.plan_tratamiento || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>`;

const newLines = [
    ...lines.slice(0, 1149),
    newContent,
    ...lines.slice(1369)
];

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Fixed file');
