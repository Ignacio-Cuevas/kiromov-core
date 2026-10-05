const fs = require('fs');
let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

const popoverCode = `
      {/* Modal / Popover de Acciones Rápidas (Estilo Google Calendar) */}
      <Dialog open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        {selectedCitaForPopover && (
          <>
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
                    {selectedCitaForPopover.pacientes?.nombre_completo || selectedCitaForPopover.motivo_consulta?.replace(/^Atención Kinésica - /i, '') || 'Paciente sin registrar'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-slate-600 font-mono">
                      {formatRut(selectedCitaForPopover.pacientes?.rut || '') || 'Sin RUT'}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase \${
                      String(selectedCitaForPopover.pacientes?.prevision || '').toLowerCase().includes('fonasa') ? 'bg-purple-100 text-purple-700' :
                      String(selectedCitaForPopover.pacientes?.prevision || '').toLowerCase().includes('isapre') ? 'bg-emerald-100 text-emerald-700' :
                      String(selectedCitaForPopover.pacientes?.prevision || '').toLowerCase().includes('convenio') ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }\`}>
                      {selectedCitaForPopover.pacientes?.prevision || 'Particular'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
                    <span>📅 {selectedCitaForPopover.fecha}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>⏰ {selectedCitaForPopover.hora?.slice(0, 5)} - {calcularHoraFin(selectedCitaForPopover.hora?.slice(0, 5) || '00:00', selectedCitaForPopover.duracion_minutos || 45)}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-6 pt-5">
              {/* Semáforo de Estado Rápido */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cambiar Estado</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'asistio'); setIsPopoverOpen(false); }}
                    className={\`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all \${selectedCitaForPopover.estado === 'asistio' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
                  >
                    ✓ Asistió
                  </button>
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'confirmada'); setIsPopoverOpen(false); }}
                    className={\`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all \${selectedCitaForPopover.estado === 'confirmada' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}\`}
                  >
                    Confirmada
                  </button>
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'pendiente'); setIsPopoverOpen(false); }}
                    className={\`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all \${selectedCitaForPopover.estado === 'pendiente' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}\`}
                  >
                    Pendiente
                  </button>
                  <button 
                    onClick={() => { handleCambiarEstadoCita(selectedCitaForPopover, 'no_asistio'); setIsPopoverOpen(false); }}
                    className={\`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all \${['no_asistio', 'cancelada'].includes(selectedCitaForPopover.estado || '') ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}\`}
                  >
                    No asistió
                  </button>
                </div>
              </div>

              {/* Botones de Acción Inmediata */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Acciones Clínicas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      if (selectedCitaForPopover.paciente_id) {
                        setSelectedPatientForDrawer(selectedCitaForPopover.pacientes || { id: selectedCitaForPopover.paciente_id });
                        setSelectedCitaForSuite(selectedCitaForPopover);
                        setIsDrawerOpen(true);
                      } else {
                        toast.error('Cita sin paciente vinculado');
                      }
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    📋 Ficha / Box
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      window.open(generarMensajeConfirmacion(selectedCitaForPopover), '_blank');
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold transition-all"
                  >
                    💬 WhatsApp
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setCheckoutCita(selectedCitaForPopover);
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold transition-all"
                  >
                    💳 Cobrar / Saldo
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false);
                        setEditingCita(selectedCitaForPopover);
                        setEditForm({ fecha: selectedCitaForPopover.fecha || '', hora: selectedCitaForPopover.hora?.slice(0, 5) || '', motivo: selectedCitaForPopover.motivo_consulta || '', profesional: selectedCitaForPopover.profesional_id || '' });
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false);
                        setDeletingCita(selectedCitaForPopover);
                      }}
                      className="flex-none flex items-center justify-center w-12 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold transition-all"
                      title="Cancelar Cita"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </DialogBody>
          </>
        )}
      </Dialog>
`;

c = c.replace(/\{\/\* Modal Editar Cita \*\/\}/, popoverCode + '\n      {/* Modal Editar Cita */}');

fs.writeFileSync('src/app/agenda/page.tsx', c);
