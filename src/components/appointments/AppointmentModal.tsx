'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatRut } from '@/lib/utils';
import { crearEventoGoogleCalendar } from '@/actions/calendar';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedPatient?: {
    id: string;
    nombre_completo: string;
    rut?: string;
    telefono?: string;
  } | null;
  initialDate?: string;
}

function getFormattedLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatient,
  initialDate,
}: AppointmentModalProps) {
  const supabase = createClient();

  const [fecha, setFecha] = useState(initialDate || getFormattedLocalDate(new Date()));
  const [hora, setHora] = useState('09:00');
  const [motivo, setMotivo] = useState('Atención Kinésica TMO');
  const [profesional, setProfesional] = useState('Klgo. Ignacio Cuevas Silva');
  
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  const [citasOcupadas, setCitasOcupadas] = useState<any[]>([]);
  const [savingCita, setSavingCita] = useState(false);
  const [configAgenda, setConfigAgenda] = useState<any>(null);

  // Cargar configuración de agenda para conocer horarios día por día
  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      let cfg: any = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from('configuracion_agenda')
            .select('*')
            .limit(1)
            .maybeSingle();
          if (data) cfg = data;
        } catch (e) {
          console.warn('Error leyendo configuracion_agenda:', e);
        }
      }
      if (!cfg) {
        try {
          const cached = localStorage.getItem('kiromov_configuracion_agenda');
          if (cached) cfg = JSON.parse(cached);
        } catch (e) {}
      }
      if (cfg) setConfigAgenda(cfg);
    };

    loadConfig();
  }, [isOpen]);

  useEffect(() => {
    if (preselectedPatient?.id) {
      setSelectedPatientId(preselectedPatient.id);
    } else {
      setSelectedPatientId('');
    }
    
    if (isOpen) {
      if (!preselectedPatient) {
        cargarPacientes();
      }
      cargarCitasOcupadas(fecha);
    }
  }, [isOpen, preselectedPatient, fecha]);

  // Día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  const diaSemana = useMemo(() => {
    if (!fecha) return 1;
    const [y, m, d] = fecha.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.getDay();
  }, [fecha]);

  // Horario del día según configuración
  const horarioDia = useMemo(() => {
    if (!configAgenda) {
      const esDomingo = diaSemana === 0;
      return {
        activo: !esDomingo,
        hora_inicio: '09:00',
        hora_fin: esDomingo ? '14:00' : '20:00',
      };
    }

    if (configAgenda.horarios_por_dia && (configAgenda.horarios_por_dia[diaSemana] || configAgenda.horarios_por_dia[String(diaSemana)])) {
      const h = configAgenda.horarios_por_dia[diaSemana] || configAgenda.horarios_por_dia[String(diaSemana)];
      return {
        activo: Boolean(h.activo),
        hora_inicio: h.hora_inicio || '09:00',
        hora_fin: h.hora_fin || '20:00',
      };
    }

    const diasActivos = Array.isArray(configAgenda.dias_activos) ? configAgenda.dias_activos : [1, 2, 3, 4, 5, 6];
    return {
      activo: diasActivos.includes(diaSemana),
      hora_inicio: configAgenda.hora_apertura || '09:00',
      hora_fin: configAgenda.hora_cierre || '20:00',
    };
  }, [configAgenda, diaSemana]);

  // Generar exclusivamente bloques dentro del horario del día
  const timeBlocksDisponibles = useMemo(() => {
    if (!horarioDia.activo) return [];

    const [startH, startM] = (horarioDia.hora_inicio || '09:00').split(':').map(Number);
    const [endH, endM] = (horarioDia.hora_fin || '20:00').split(':').map(Number);

    const startMin = (startH || 0) * 60 + (startM || 0);
    const endMin = (endH || 0) * 60 + (endM || 0);

    const duracionMin = 30;
    const blocks: string[] = [];

    for (let m = startMin; m < endMin; m += duracionMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      blocks.push(`${hh}:${mm}`);
    }

    return blocks;
  }, [horarioDia]);

  // Ajustar hora seleccionada si queda fuera de los bloques disponibles
  useEffect(() => {
    if (timeBlocksDisponibles.length > 0) {
      if (!timeBlocksDisponibles.includes(hora)) {
        setHora(timeBlocksDisponibles[0]);
      }
    }
  }, [timeBlocksDisponibles]);

  const cargarPacientes = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('pacientes')
      .select('id, nombre_completo, rut, telefono')
      .order('nombre_completo', { ascending: true });
    if (data) setPacientes(data);
  };

  const cargarCitasOcupadas = async (f: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('citas_atenciones')
      .select('hora')
      .eq('fecha', f)
      .neq('estado', 'cancelada');
    if (data) setCitasOcupadas(data);
  };

  const pacientesOptions = useMemo(() => {
    if (!pacienteSearch.trim()) return pacientes.slice(0, 50);
    const q = pacienteSearch.toLowerCase();
    return pacientes.filter(p => p.nombre_completo?.toLowerCase().includes(q) || p.rut?.toLowerCase().includes(q)).slice(0, 50);
  }, [pacientes, pacienteSearch]);

  const handleCreateCita = async () => {
    if (!selectedPatientId || !fecha || !hora) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if (!horarioDia.activo) {
      toast.error('No es posible agendar: Día no laboral según tu configuración de box.');
      return;
    }
    setSavingCita(true);
    if (!supabase) return;
    try {
      const { data: citaOcupada } = await supabase
        .from('citas_atenciones')
        .select('id, hora, pacientes(nombre_completo)')
        .eq('fecha', fecha)
        .eq('hora', hora)
        .neq('estado', 'cancelada')
        .maybeSingle();

      if (citaOcupada) {
        const nombre = Array.isArray(citaOcupada.pacientes) ? citaOcupada.pacientes[0]?.nombre_completo : (citaOcupada.pacientes as any)?.nombre_completo;
        toast.error(`⚠️ El horario de las ${hora.slice(0, 5)} ya está reservado para ${nombre || 'otro paciente'}. Elige otro bloque.`);
        return;
      }
      
      const pacienteSeleccionado = preselectedPatient || pacientes.find(p => p.id === selectedPatientId);
      const fechaSeleccionada = fecha;
      const horaSeleccionada = hora;
      const motivoConsulta = motivo || 'Atención Kinésica TMO';

      // Al confirmar la cita:
      const { data: nuevaCita, error: errCita } = await supabase
        .from('citas_atenciones')
        .insert([{
          paciente_id: selectedPatientId,
          fecha: fechaSeleccionada,
          hora: horaSeleccionada,
          profesional: profesional || 'Klgo. Ignacio Cuevas Silva',
          motivo_consulta: motivoConsulta,
          estado: 'pendiente'
        }])
        .select()
        .single();

      if (errCita) throw errCita;

      // DISPARAR SINCRONIZACIÓN CON GOOGLE CALENDAR EN SEGUNDO PLANO
      try {
        const googleEventId = await crearEventoGoogleCalendar({
          pacienteNombre: pacienteSeleccionado?.nombre_completo || 'Paciente Kiromov',
          pacienteTelefono: pacienteSeleccionado?.telefono || null,
          fecha: fechaSeleccionada,
          hora: horaSeleccionada,
          motivo: motivoConsulta
        });

        if (googleEventId) {
          // Vincular el ID del evento de Google en Supabase
          await supabase
            .from('citas_atenciones')
            .update({ google_event_id: googleEventId })
            .eq('id', nuevaCita.id);
        }
      } catch (gErr) {
        console.warn('[Google Calendar Sync] Falló el envío en segundo plano:', gErr);
      }

      toast.success('¡Cita agendada exitosamente!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado al agendar cita');
    } finally {
      setSavingCita(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Agendar Nueva Cita</DialogTitle>
        <DialogDescription>Selecciona un horario para agendar.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 pt-4">
        {preselectedPatient ? (
          /* Tarjeta Fija del Paciente Vinculado (Sin buscador) */
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Paciente de la Cita
              </span>
              <p className="text-sm font-bold text-slate-900">{preselectedPatient.nombre_completo}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {preselectedPatient.rut || 'Sin RUT'} {preselectedPatient.telefono ? `• ${preselectedPatient.telefono}` : ''}
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              ✓ Vinculado
            </span>
          </div>
        ) : (
          /* Buscador normal solo si se agendó desde el botón global '+ Agendar Cita' */
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Seleccionar Paciente</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por nombre o RUT..." value={pacienteSearch} onChange={e => setPacienteSearch(e.target.value)} className="pl-9 bg-slate-50/50" />
            </div>
            <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} className="w-full mt-2 p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm" size={4}>
              {pacientesOptions.map(p => <option key={p.id} value={p.id}>{p.nombre_completo} - {formatRut(p.rut)}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Fecha</label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="bg-slate-50/50" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Hora</label>
              {horarioDia.activo && (
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {horarioDia.hora_inicio} - {horarioDia.hora_fin}
                </span>
              )}
            </div>
            {horarioDia.activo ? (
              <select
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10 font-mono"
              >
                {timeBlocksDisponibles.map(t => {
                  const isOccupied = citasOcupadas.some(c => c.hora?.startsWith(t));
                  return (
                    <option key={t} value={t} disabled={isOccupied}>
                      {t} {isOccupied ? '(Ocupado)' : ''}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-xs text-slate-400 italic">
                Cerrado
              </div>
            )}
          </div>
        </div>

        {!horarioDia.activo && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">Día no laboral según tu configuración de box</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Motivo de Consulta</label>
          <Input value={motivo} onChange={e => setMotivo(e.target.value)} className="bg-slate-50/50" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleCreateCita}
          disabled={savingCita || !horarioDia.activo}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          {savingCita ? 'Guardando...' : 'Agendar Cita'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
