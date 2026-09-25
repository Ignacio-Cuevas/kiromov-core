'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Search, MapPin, User, ArrowRight, X, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ClinicalRecordView from '@/components/clinical/ClinicalRecordView';

interface PacienteResultado {
  id: string;
  nombre_completo: string;
  rut: string;
  prevision?: string | null;
  nombre_plan?: string | null;
  estado_pago?: string | null;
  sesiones_usadas?: number | null;
  sesiones_totales?: number | null;
}

export function TopBar() {
  const pathname = usePathname();
  const supabase = createClient();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<PacienteResultado[]>([]);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // No renderizar en la vista de login
  if (pathname === '/login') return null;

  // Atajo global ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en vista_resumen_pacientes (con fallback a pacientes)
  useEffect(() => {
    const cleanQ = query.trim();
    if (cleanQ.length < 2) {
      setResultados([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (!supabase) return;

        // Intentar primero vista_resumen_pacientes
        const { data: vistaData, error: vistaError } = await supabase
          .from('vista_resumen_pacientes')
          .select('id, nombre_completo, rut, prevision, nombre_plan, estado_pago, sesiones_usadas, sesiones_totales')
          .or(`nombre_completo.ilike.%${cleanQ}%,rut.ilike.%${cleanQ}%`)
          .limit(8);

        if (!vistaError && vistaData && vistaData.length > 0) {
          setResultados(vistaData as PacienteResultado[]);
        } else {
          // Fallback a tabla pacientes directa
          const { data: pData } = await supabase
            .from('pacientes')
            .select('id, nombre_completo, rut, prevision')
            .or(`nombre_completo.ilike.%${cleanQ}%,rut.ilike.%${cleanQ}%`)
            .limit(8);

          setResultados((pData as PacienteResultado[]) || []);
        }
      } catch (err) {
        console.error('Error buscando pacientes:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, supabase]);

  const handleSelectPaciente = (pacienteId: string) => {
    setSelectedPacienteId(pacienteId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 flex-shrink-0 select-none">
        
        {/* Buscador Global ⌘K */}
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar paciente por RUT o nombre..."
              className="w-full pl-9 pr-14 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-xs"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResultados([]);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 text-slate-500 rounded shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>

          {/* Menú Flotante de Resultados Rápidos */}
          {isOpen && (query.trim().length >= 2 || loading) && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-100"
            >
              <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Resultados de Pacientes</span>
                {loading && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                  </span>
                )}
                {!loading && (
                  <span>{resultados.length} encontrado(s)</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {!loading && resultados.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No se encontraron pacientes para &quot;{query}&quot;
                  </div>
                )}

                {resultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPaciente(p.id)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {p.nombre_completo}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                            {p.rut || 'Sin RUT'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{p.prevision || 'Particular'}</span>
                          {p.nombre_plan && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-slate-700 truncate">
                                {p.nombre_plan} {p.sesiones_totales ? `(${p.sesiones_usadas || 0}/${p.sesiones_totales})` : ''}
                              </span>
                            </>
                          )}
                           {p.estado_pago && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              String(p.estado_pago || '').toLowerCase() === 'pagado'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {String(p.estado_pago || '').toLowerCase() === 'pagado' ? '✓ Al día' : '🔴 Cobro'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <span>Abrir Ficha</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Identificador de Sucursal */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 text-slate-700 text-xs font-semibold rounded-full border border-slate-200/80 shadow-2xs">
            <span className="text-sm leading-none">📍</span>
            <span className="hidden sm:inline">Box Chillán — Bulnes 470, Of. 75</span>
            <span className="sm:hidden">Box Chillán</span>
          </div>
        </div>

      </header>

      {/* Expediente Clínico Medilink desde el Buscador Global */}
      {selectedPacienteId && (
        <ClinicalRecordView
          pacienteId={selectedPacienteId}
          onClose={() => setSelectedPacienteId(null)}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}

export default TopBar;
