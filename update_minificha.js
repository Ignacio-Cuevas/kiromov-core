const fs = require('fs');
let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

const rightPanelRegex = /\{\/\*\s*Panel Derecho: 60%\s*\*\/\}\s*<div className="w-3\/5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">[\s\S]*?<\/div>\s*<\/div>\s*\) : \(/;

const newRightPanel = `{/* Panel Derecho: 60% (Mini-Ficha del Box) */}
                  <div className="w-3/5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto relative p-6">
                    {selectedPatientForDrawer ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 1. Tarjeta de Identificación */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                            {selectedPatientForDrawer.nombre_completo?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-extrabold text-slate-900 truncate">
                              {selectedPatientForDrawer.nombre_completo}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm font-medium text-slate-600">
                              <span>RUT: {formatRut(selectedPatientForDrawer.rut) || 'Sin registrar'}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className={\`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide \${
                                String(selectedPatientForDrawer.prevision || '').toLowerCase().includes('fonasa') ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                String(selectedPatientForDrawer.prevision || '').toLowerCase().includes('isapre') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                String(selectedPatientForDrawer.prevision || '').toLowerCase().includes('convenio') ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }\`}>
                                {selectedPatientForDrawer.prevision || 'Particular'}
                              </span>
                            </div>
                            
                            {selectedPatientForDrawer.telefono && (
                              <div className="mt-2.5">
                                <a 
                                  href={\`https://wa.me/569\${selectedPatientForDrawer.telefono.replace(/\\D/g, '').slice(-8)}\`}
                                  target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                                >
                                  💬 WhatsApp: +56 9 {selectedPatientForDrawer.telefono.replace(/\\D/g, '').slice(-8).replace(/(\\d{4})(\\d{4})/, '$1 $2')}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Alertas Clínicas / Banderas Rojas */}
                        {(selectedPatientForDrawer.alertas_seguridad || selectedPatientForDrawer.antecedentes_morbidos) && (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
                            <h3 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-2 mb-1.5">
                              🚩 Banderas Rojas y Alertas
                            </h3>
                            <p className="text-sm font-medium text-rose-900 leading-relaxed">
                              {selectedPatientForDrawer.alertas_seguridad || selectedPatientForDrawer.antecedentes_morbidos}
                            </p>
                          </div>
                        )}

                        {/* 3. Tratamiento y Finanzas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Progreso del Tratamiento</h3>
                            {(selectedPatientForDrawer.total_sesiones || 0) > 0 ? (
                              <div>
                                <p className="text-lg font-extrabold text-slate-900">
                                  Sesión {selectedPatientForDrawer.sesiones_usadas || 0} <span className="text-slate-400 text-sm">de {selectedPatientForDrawer.total_sesiones}</span>
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: \`\${Math.min(100, ((selectedPatientForDrawer.sesiones_usadas || 0) / (selectedPatientForDrawer.total_sesiones || 1)) * 100)}%\` }}></div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-slate-700">Sin plan activo</p>
                            )}
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-center">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Estado de Cuenta</h3>
                            {selectedPatientForDrawer.estado_pago === 'pendiente' && (selectedPatientForDrawer.valor_total || 0) > 0 ? (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-extrabold text-rose-600">🔴 Debe {formatCLP(selectedPatientForDrawer.valor_total || 0)}</span>
                                <button 
                                  onClick={() => setSettlingPlan({ id: selectedPatientForDrawer.plan_id, nombre_plan: selectedPatientForDrawer.nombre_plan, monto_clp: selectedPatientForDrawer.valor_total, paciente_id: selectedPatientForDrawer.id })}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  💳 Cobrar
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-600">
                                ✓ Al día
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4. Acciones de Box Inmediatas */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                          {selectedCitaForSuite && (
                            <button
                              onClick={() => handleCambiarEstadoCita(selectedCitaForSuite, 'asistio')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-sm transition-colors"
                            >
                              ✓ Marcar Asistió
                            </button>
                          )}
                          <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                          >
                            ↗ Ver SOAP Completo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <User className="w-12 h-12 mb-3 opacity-50 text-slate-300" />
                        <p className="text-sm font-medium">Seleccione un paciente de la lista para ver el Cockpit de Box.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (`;

c = c.replace(rightPanelRegex, newRightPanel);

fs.writeFileSync('src/app/agenda/page.tsx', c);
