const fs = require('fs');
let content = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

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
  };`;

const startIndex = content.indexOf('const renderCardCita = (cita: CitaExtendida, compact = false) => {');
// Encuentra el final de la función renderCardCita original
// Busca la línea "  const renderSemana = () => {" que es la función siguiente.
const endIndex = content.indexOf('const renderSemana = () => {', startIndex);

content = content.substring(0, startIndex) + newRenderCardCita + '\n\n  ' + content.substring(endIndex);

fs.writeFileSync('src/app/agenda/page.tsx', content);
