'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatRut } from '@/lib/utils';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedPatient?: {
    id: string;
    nombre_completo: string;
    rut?: string;
  } | null;
  initialDate?: string;
}

const timeBlocks: string[] = [];
for (let i = 8; i <= 20; i++) {
  timeBlocks.push(`${String(i).padStart(2, '0')}:00`);
  timeBlocks.push(`${String(i).padStart(2, '0')}:30`);
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
  const [motivo, setMotivo] = useState('Sesión Kinésica');
  const [profesional, setProfesional] = useState('Klgo. Ignacio Cuevas');
  
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  const [citasOcupadas, setCitasOcupadas] = useState<any[]>([]);
  const [savingCita, setSavingCita] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (preselectedPatient) {
        setSelectedPatientId(preselectedPatient.id);
      } else {
        cargarPacientes();
      }
      cargarCitasOcupadas(fecha);
    }
  }, [isOpen, preselectedPatient, fecha]);

  const cargarPacientes = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('pacientes')
      .select('id, nombre_completo, rut')
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
      
      const payload = {
         paciente_id: selectedPatientId,
         fecha, 
         hora,
         profesional,
         motivo_consulta: motivo || 'Sesión de Tratamiento Kinésico',
         estado: 'pendiente'
      };

      const { error } = await supabase
         .from('citas_atenciones')
         .insert([payload]);

      if (error) {
         toast.error(`No se pudo agendar: ${error.message}`);
         return;
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
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Paciente Seleccionado</span>
            <p className="text-xs font-bold text-slate-900">{preselectedPatient.nombre_completo}</p>
            {preselectedPatient.rut && <p className="text-[11px] text-slate-500 font-mono">{preselectedPatient.rut}</p>}
          </div>
        ) : (
          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Paciente</label>
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
            <label className="text-xs font-bold text-slate-700">Hora</label>
            <select value={hora} onChange={e => setHora(e.target.value)} className="w-full p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm h-10">
              {timeBlocks.map(t => {
                const isOccupied = citasOcupadas.some(c => c.hora?.startsWith(t));
                return <option key={t} value={t} disabled={isOccupied}>{t} {isOccupied ? '(Ocupado)' : ''}</option>;
              })}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Motivo de Consulta</label>
          <Input value={motivo} onChange={e => setMotivo(e.target.value)} className="bg-slate-50/50" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleCreateCita} disabled={savingCita} className="bg-blue-600 hover:bg-blue-700 text-white">
          {savingCita ? 'Guardando...' : 'Agendar Cita'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
