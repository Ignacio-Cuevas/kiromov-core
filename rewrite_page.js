const fs = require('fs');

let content = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

// 1. Imports
content = content.replace(
  "import { AgendaSidebar, FiltroEstadoCitas } from '@/components/agenda/AgendaSidebar';",
  "import { ClinicalNavbar, FiltroEstadoCitas } from '@/components/agenda/ClinicalNavbar';"
);

// 2. renderCardCita replacement
// Encontramos el incio de renderCardCita
const renderCardCitaStart = content.indexOf('  const renderCardCita = (cita: CitaExtendida, compact = false) => {');
// La siguiente funcion suele ser renderSemana o handleCambiarEstadoCita. 
// Busquemos "const " despues de renderCardCitaStart para encontrar el final
const searchStart = content.indexOf('};', renderCardCitaStart) + 2;
// Check what function comes next
const regexNextFunc = /^\s*(const|function) \w+ \=/m;
const nextFuncMatch = content.substring(renderCardCitaStart + 50).match(regexNextFunc);
const nextFuncIndex = renderCardCitaStart + 50 + nextFuncMatch.index;

const newRenderCardCita = `  const renderCardCita = (cita: CitaExtendida, compact = false) => {
    const p = cita.pacientes || {
      id: cita.paciente_id || '',
      nombre_completo: cita.motivo_consulta || 'Paciente Externo (Sin Ficha)',
      estado_plan: 'sin_plan', sesiones_usadas: 0, total_sesiones: 0, estado_pago: 'al_dia', valor_total: 0,
    };
    
    const s = String(cita?.estado || 'pendiente').toLowerCase();
    
    // Semáforo de bordes
    let borderColor = 'border-l-slate-400 border-slate-200';
    let bgColor = 'bg-white';
    if (s === 'confirmada') { borderColor = 'border-l-emerald-500 border-slate-200'; bgColor = 'bg-emerald-50/20'; }
    else if (s === 'pendiente') { borderColor = 'border-l-amber-500 border-slate-200'; bgColor = 'bg-amber-50/20'; }
    else if (s === 'asistio' || s === 'asistió' || s === 'atendido') { borderColor = 'border-l-slate-400 border-slate-300'; bgColor = 'bg-slate-50'; }
    else if (s === 'cancelada' || s === 'no_asistio') { borderColor = 'border-l-rose-500 border-slate-200'; bgColor = 'bg-rose-50/20'; }

    const tienePlan = p.estado_plan !== 'sin_plan' && (p.total_sesiones || 0) > 0;
    const debePago = p.estado_pago === 'pendiente';
    const motivo = cita.motivo_consulta || 'Sesión Kinésica';

    // Rango horario monoespaciado
    const horaInicio = cita.hora?.slice(0, 5) || '00:00';
    const duracion = cita.duracion_minutos || 45;
    const dateMock = new Date(\`1970-01-01T\${horaInicio}:00\`);
    dateMock.setMinutes(dateMock.getMinutes() + duracion);
    const horaFin = dateMock.toTimeString().slice(0, 5);

    return (
      <div key={cita.id} className={\`relative flex flex-col p-3 rounded-lg border border-l-4 \${borderColor} \${bgColor} hover:shadow-md transition-all cursor-pointer group\`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col min-w-0 pr-10">
            <span className="font-mono text-xs text-slate-500 tabular-nums">\${horaInicio} - \${horaFin}</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 leading-tight">\${p.nombre_completo}</span>
            <span className="text-xs text-slate-500 truncate mt-0.5" title={motivo}>\${motivo}</span>
          </div>
          
          {/* Hover actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white p-1 rounded-md shadow-sm border border-slate-100">
            <button onClick={(e) => { e.stopPropagation(); setSelectedPatientForDrawer(p); setSelectedCitaForSuite(cita); setIsDrawerOpen(true); }} className="p-1 hover:bg-slate-100 rounded text-slate-600" title="Ver Ficha">📋</button>
            <button onClick={(e) => { e.stopPropagation(); window.open(generarMensajeConfirmacion(cita), '_blank'); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600" title="WhatsApp">💬</button>
            <button onClick={(e) => { e.stopPropagation(); setCheckoutCita(cita); }} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Cobrar">💳</button>
            <button onClick={(e) => { e.stopPropagation(); handleCambiarEstadoCita(cita, 'asistio'); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600" title="Marcar Asistió">✓</button>
          </div>
        </div>

        {/* Badges inferiores */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100/50">
          {tienePlan && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-medium border border-blue-100">
              {p.sesiones_usadas}/{p.total_sesiones} ses.
            </span>
          )}
          {debePago ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded-sm font-medium border border-rose-100">
              Debe {formatCLP(p.valor_total || 0)}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm font-medium border border-emerald-100">
              ✓ Pagado
            </span>
          )}
        </div>
      </div>
    );
  };
`;

content = content.substring(0, renderCardCitaStart) + newRenderCardCita + content.substring(nextFuncIndex);


// 3. Reemplazar return ( <div className="min-h-screen
const returnStart = content.indexOf('  return (\n    <div className="min-h-screen bg-cloud pb-20 font-gilroy text-ink-navy">');
if (returnStart === -1) {
  console.log("No encontre el return principal");
  process.exit(1);
}

// Encontrar el inicio de "        {/* Modal Unificado de Cita Rápida Medilink */}" o donde terminen los main modals.
const modalsStart = content.indexOf('{/* Modal Unificado de Cita Rápida Medilink */}');
if (modalsStart === -1) {
    console.log("No encontre la seccion de los modales en el return principal");
}
const endOfMain = content.lastIndexOf('</main>', modalsStart) + 7;

const newMainLayout = `  const setToday = () => setFechaBase(new Date());
  const changeDate = (dir: number) => {
    const newD = new Date(fechaBase);
    if (vista === 'dia') newD.setDate(newD.getDate() + dir);
    else newD.setDate(newD.getDate() + dir * 7);
    setFechaBase(newD);
  };

  return (
    <div className="min-h-screen bg-cloud pb-20 font-gilroy text-ink-navy">
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 sm:space-y-8 print:hidden">
        {activeTab === 'disponibilidad' ? (
          <BoxScheduleView
            onBackToAgenda={() => setActiveTab('agenda')}
            onSavedSuccess={() => { setActiveTab('agenda'); loadAgenda(); }}
          />
        ) : (
          <div className="flex flex-col gap-5 items-start">
            <div className="w-full space-y-4">
              <ClinicalNavbar
                fechaBase={fechaBase}
                vista={vista}
                onVistaChange={(v) => setVista(v)}
                onChangeDate={(dir) => changeDate(dir)}
                onToday={setToday}
                onNuevaCita={() => setShowNewCitaModal(true)}
                onBloquearHorario={() => setShowBlockModal(true)}
                filtroEstado={filtroEstado}
                onFiltroEstadoChange={(f) => setFiltroEstado(f)}
              />

              {loading ? (
                <div className="bg-white rounded-2xl p-16 border border-slate-200/90 shadow-sm flex flex-col items-center justify-center min-h-[450px]">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-600">Cargando agenda clínica...</p>
                </div>
              ) : vista === 'dia' ? (
                // COCKPIT DE ATENCIÓN (VISTA DÍA)
                <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
                  {/* Panel Izquierdo: 40% */}
                  <div className="w-2/5 flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-800">Citas del Día</h3>
                    {citasFiltradas.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay citas registradas para hoy.</p>
                    ) : (
                      citasFiltradas.map((c) => (
                        <div key={c.id} onClick={() => {
                          const p = c.pacientes || { id: c.paciente_id };
                          setSelectedPatientForDrawer(p as any);
                          setSelectedCitaForSuite(c);
                        }}>
                          {renderCardCita(c, false)}
                        </div>
                      ))
                    )}
                  </div>
                  {/* Panel Derecho: 60% */}
                  <div className="w-3/5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                    {selectedPatientForDrawer ? (
                      <ClinicalRecordView 
                        onClose={() => setSelectedPatientForDrawer(null)} 
                        pacienteId={selectedPatientForDrawer?.id || ''} 
                        citaId={selectedCitaForSuite?.id || ''}
                        onSuccess={() => loadAgenda()} 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <User className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Seleccione un paciente para ver el Cockpit.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // VISTA SEMANA
                <ClinicalTimeGrid
                  dias={diasAMostrar}
                  citas={citasFiltradas}
                  bloqueos={bloqueos}
                  semanaConfig={semanaConfig}
                  duracionPredeterminada={duracionPredeterminada}
                  onSelectEmptySlot={(fecha, hora) => { setNewCita((prev) => ({ ...prev, fecha, hora, pacienteId: '' })); setShowNewCitaModal(true); }}
                  onSelectCita={(cita) => { setSelectedCitaForPopover(cita); setIsPopoverOpen(true); }}
                  onDesbloquear={(b) => {
                     // Lógica simple mock:
                  }}
                />
              )}
            </div>
          </div>
        )}
      </main>`;

content = content.substring(0, returnStart) + newMainLayout + content.substring(endOfMain);

fs.writeFileSync('src/app/agenda/page.tsx', content);

