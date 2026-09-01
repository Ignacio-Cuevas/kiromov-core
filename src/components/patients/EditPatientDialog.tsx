'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/utils/supabase/client';
import { formatRut, validateRut } from '@/lib/utils';
import { toast } from 'sonner';
import { Edit2, Save, Loader2, User, Phone, Mail, Stethoscope, AlertTriangle } from 'lucide-react';

interface EditPatientDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  patient: any;
  onPatientUpdated: (updatedPatient: any) => void;
}

export function EditPatientDialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  patient,
  onPatientUpdated,
}: EditPatientDialogProps) {
  const isDialogOpen = isOpen ?? open ?? false;

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const supabase = createClient();

  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [antecedentes, setAntecedentes] = useState('');
  const [banderasRojas, setBanderasRojas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setNombre(patient.nombre_completo || patient.full_name || '');
      setRut(patient.rut || '');
      setTelefono(patient.telefono || patient.phone || '');
      setEmail(patient.email || '');
      setFechaNacimiento(patient.fecha_nacimiento || patient.birth_date || '');
      setDiagnostico(patient.diagnostico_medico || patient.diagnostico_principal || patient.medical_notes || '');
      setAntecedentes(patient.antecedentes_medicos || '');
      setBanderasRojas(patient.banderas_rojas || '');
    }
  }, [patient]);

  if (!isDialogOpen || !patient) return null;

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRut(formatRut(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre completo es obligatorio');
      return;
    }
    if (rut && !validateRut(rut)) {
      toast.error('El RUT ingresado no es válido');
      return;
    }

    setSaving(true);

    const updatePayload = {
      nombre_completo: nombre.toUpperCase().trim(),
      rut: rut.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim().toLowerCase() || null,
      fecha_nacimiento: fechaNacimiento || null,
      diagnostico_medico: diagnostico.trim() || null,
      diagnostico_principal: diagnostico.trim() || null,
      antecedentes_medicos: antecedentes.trim() || null,
      banderas_rojas: banderasRojas.trim() || null,
    };

    if (supabase) {
      try {
        await supabase.from('pacientes').update(updatePayload).eq('id', patient.id);
        await supabase.from('patients').update({
          full_name: updatePayload.nombre_completo,
          rut: updatePayload.rut,
          phone: updatePayload.telefono,
          email: updatePayload.email,
          birth_date: updatePayload.fecha_nacimiento,
          medical_notes: updatePayload.diagnostico_medico,
        }).eq('id', patient.id);
      } catch (err) {
        console.warn('Excepción actualizando paciente en Supabase:', err);
      }
    }

    const updatedPatientObj = {
      ...patient,
      ...updatePayload,
      nombre_completo: updatePayload.nombre_completo,
      full_name: updatePayload.nombre_completo,
      rut: updatePayload.rut || patient.rut,
      telefono: updatePayload.telefono || patient.telefono,
      email: updatePayload.email,
      diagnostico_medico: updatePayload.diagnostico_medico,
      diagnostico_principal: updatePayload.diagnostico_principal,
      medical_notes: updatePayload.diagnostico_medico,
    };

    onPatientUpdated(updatedPatientObj);
    toast.success('Ficha del paciente actualizada con éxito');
    handleClose();
    setSaving(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleClose} maxWidth="max-w-2xl">
      <DialogHeader onClose={handleClose}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700 border border-blue-100 shrink-0">
            <Edit2 className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Ficha y Datos del Paciente</DialogTitle>
            <DialogDescription>
              {patient.codigo_paciente ? `Código: ${patient.codigo_paciente}` : 'Actualizar antecedentes y diagnóstico médico'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              1. Identificación y Contacto
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Nombre Completo *</label>
                <Input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-white rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">RUT</label>
                <Input
                  type="text"
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={handleRutChange}
                  className="bg-white rounded-xl text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp</label>
                <Input
                  type="text"
                  placeholder="+56 9 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="bg-white rounded-xl text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Correo Electrónico</label>
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fecha de Nacimiento</label>
                <Input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
              2. Diagnóstico Clínico (Para Certificados)
            </span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-800">
                  Diagnóstico Médico / Kinésico Principal
                </label>
                <Input
                  type="text"
                  placeholder="Ej: Síndrome de Pinzamiento Subacromial D°, Lumbago Mecánico..."
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  className="bg-white border-blue-200 focus:border-blue-500 rounded-xl text-sm font-medium text-blue-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Antecedentes Médicos / Quirúrgicos</label>
                <Textarea
                  rows={2}
                  placeholder="Ej: Cirugía meniscal 2024, HTA controlada..."
                  value={antecedentes}
                  onChange={(e) => setAntecedentes(e.target.value)}
                  className="bg-white rounded-xl text-xs resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Banderas Rojas / Alertas Clínicas
                </label>
                <Textarea
                  rows={2}
                  placeholder="Ej: Dolor nocturno constante, fiebre, sospecha radiculopatía..."
                  value={banderasRojas}
                  onChange={(e) => setBanderasRojas(e.target.value)}
                  className="bg-white border-rose-200 focus:border-rose-400 rounded-xl text-xs text-rose-900 resize-none"
                />
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold h-9 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9 px-5 shadow-xs rounded-xl"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default EditPatientDialog;
