import re

file_path = 'src/app/pacientes/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { evaluarRiesgoDesercion, requiereReevaluacion } from '@/lib/clinical';")

# 2. State & Filtering
content = content.replace("const [pacientes, setPacientes] = useState<any[]>([]);", "const [activeTab, setActiveTab] = useState<'todos' | 'riesgo' | 'reevaluacion'>('todos');\n  const [pacientes, setPacientes] = useState<any[]>([]);")

old_filter_logic = """  const pacientesFiltrados = useMemo(() => {
    if (!searchTerm) return pacientes;
    return pacientes.filter(p => 
      p.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rut?.includes(searchTerm)
    );
  }, [pacientes, searchTerm]);"""
new_filter_logic = """  const pacientesBusqueda = useMemo(() => {
    if (!searchTerm) return pacientes;
    return pacientes.filter(p => 
      p.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rut?.includes(searchTerm)
    );
  }, [pacientes, searchTerm]);

  const pacientesEnRiesgo = useMemo(() => pacientes.filter(p => evaluarRiesgoDesercion(p).nivel !== null), [pacientes]);
  const pacientesReevaluacion = useMemo(() => pacientes.filter(p => requiereReevaluacion(p)), [pacientes]);

  const pacientesFiltrados = useMemo(() => {
    if (activeTab === 'riesgo') return pacientesBusqueda.filter(p => evaluarRiesgoDesercion(p).nivel !== null);
    if (activeTab === 'reevaluacion') return pacientesBusqueda.filter(p => requiereReevaluacion(p));
    return pacientesBusqueda;
  }, [pacientesBusqueda, activeTab]);"""
content = content.replace(old_filter_logic, new_filter_logic)

# 3. Add Tabs to Header
old_header = """          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setIsSaleModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all whitespace-nowrap"
            >
              + Registrar Venta
            </button>
            <Link
              href="/pacientes/nuevo"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all whitespace-nowrap"
            >
              + Nuevo Paciente
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl"""

new_header = """          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setIsSaleModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all whitespace-nowrap"
            >
              + Registrar Venta
            </button>
            <Link
              href="/pacientes/nuevo"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all whitespace-nowrap"
            >
              + Nuevo Paciente
            </Link>
          </div>
        </div>

        {/* Tabs de Clínicos */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'todos' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos los Pacientes
          </button>
          <button
            onClick={() => setActiveTab('riesgo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'riesgo' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Radar Deserción ({pacientesEnRiesgo.length})
          </button>
          <button
            onClick={() => setActiveTab('reevaluacion')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'reevaluacion' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⚠️ Reevaluación ({pacientesReevaluacion.length})
          </button>
        </div>

        <div className="bg-white rounded-2xl"""

content = content.replace(old_header, new_header)

# 4. Modify Table Content to render the badges
old_estado_plan = """                        {/* Estado del Plan */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {p.estado_plan === 'vigente' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Plan Vigente
                            </span>
                          )}
                          {p.estado_plan === 'por_renovar' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Por Renovar (1 rest.)
                            </span>
                          )}
                          {p.estado_plan === 'finalizado' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Finalizado
                            </span>
                          )}
                          {p.estado_plan === 'sin_plan' && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>"""
new_estado_plan = """                        {/* Estado del Plan / Alertas Clínicas */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {p.estado_plan === 'vigente' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                              ● Plan Vigente
                            </span>
                          )}
                          {p.estado_plan === 'por_renovar' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-1">
                              ⚠️ Por Renovar (1 rest.)
                            </span>
                          )}
                          {p.estado_plan === 'finalizado' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 mb-1">
                              Finalizado
                            </span>
                          )}
                          {p.estado_plan === 'sin_plan' && (
                            <span className="text-slate-400 text-xs mb-1 block">—</span>
                          )}
                          
                          {(() => {
                            const alerta = evaluarRiesgoDesercion(p);
                            if (alerta.nivel) {
                              return (
                                <div className="mt-1">
                                  <a 
                                    href={`https://wa.me/56${(p.telefono || '').replace(/\\D/g, '').slice(-9)}?text=${encodeURIComponent(alerta.mensajeWhatsApp)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border hover:opacity-80 transition-opacity ${alerta.badgeClass}`}
                                  >
                                    {alerta.etiqueta} 💬
                                  </a>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {requiereReevaluacion(p) && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                ⚠️ Reevaluar TMO (ENA {p.ultimo_dolor_ena}/10)
                              </span>
                            </div>
                          )}
                        </td>"""

content = content.replace(old_estado_plan, new_estado_plan)

with open('src/app/pacientes/page.tsx', 'w') as f:
    f.write(content)

print("Pacientes page refactored with Clinical Radar.")
