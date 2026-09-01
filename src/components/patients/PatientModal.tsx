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
import { Patient, HealthInsurance } from '@/types/clinical';
import { createPatient, updatePatient } from '@/actions/patients';
import { formatRut, validateRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  UserPlus,
  User,
  Phone,
  Mail,
  Calendar,
  Stethoscope,
  Save,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Edit2,
  Loader2,
  X,
} from 'lucide-react';

interface PatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientToEdit?: Patient | null;
  onPatientSaved?: (patient: Patient) => void;
}

export function PatientModal({
  open,
  onOpenChange,
  patientToEdit,
  onPatientSaved,
}: PatientModalProps) {
  const [fullName, setFullName] = useState('');
  const [rut, setRut] = useState('');
  const [phone, setPhone] = useState('+56 9 ');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [healthInsurance, setHealthInsurance] = useState<HealthInsurance>('Particular');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (patientToEdit) {
        setFullName(patientToEdit.full_name || patientToEdit.nombre_completo || '');
        setRut(patientToEdit.rut || '');
        setPhone(patientToEdit.phone || '+56 9 ');
        setEmail(patientToEdit.email || '');
        setBirthDate(patientToEdit.birth_date || '');
        setHealthInsurance(patientToEdit.health_insurance || 'Particular');
        setMedicalNotes(patientToEdit.medical_notes || '');
      } else {
        setFullName('');
        setRut('');
        setPhone('+56 9 ');
        setEmail('');
        setBirthDate('');
        setHealthInsurance('Particular');
        setMedicalNotes('');
      }
    }
  }, [open, patientToEdit]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setRut(formatted);
  };

  const isRutValid = rut.length >= 8 ? validateRut(rut) : null;

  const calculatedAge = React.useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [birthDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('El nombre completo es obligatorio');
      return;
    }

    if (!rut.trim()) {
      toast.error('El RUT es obligatorio');
      return;
    }

    if (!validateRut(rut)) {
      toast.error('El RUT ingresado no es válido', {
        description: 'Revisa el formato y el dígito verificador.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (patientToEdit) {
        const result = await updatePatient(patientToEdit.id, {
          full_name: fullName.trim().toUpperCase(),
          rut: rut.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase() || null,
          birth_date: birthDate || null,
          health_insurance: healthInsurance,
          medical_notes: medicalNotes.trim() || null,
        });

        if (result.success) {
          toast.success('¡Paciente actualizado con éxito!', {
            description: `${fullName.trim().toUpperCase()}`,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          });
          if (onPatientSaved && result.data) onPatientSaved(result.data);
          onOpenChange(false);
        } else {
          toast.error('Error al actualizar: ' + (result.error || ''));
        }
      } else {
        const result = await createPatient({
          full_name: fullName.trim().toUpperCase(),
          rut: rut.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase() || null,
          birth_date: birthDate || null,
          health_insurance: healthInsurance,
          medical_notes: medicalNotes.trim() || null,
        });

        if (result.success && result.data) {
          toast.success('¡Paciente registrado con éxito!', {
            description: `${result.data.full_name}`,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          });
          if (onPatientSaved) onPatientSaved(result.data);
          onOpenChange(false);
        } else {
          toast.error('Error al registrar paciente: ' + (result.error || ''));
        }
      }
    } catch (err: any) {
      toast.error('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-2xl">
      {/* 1. Header Fijo Superior */}
      <DialogHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700 border border-blue-100 shrink-0">
            {patientToEdit ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <DialogTitle>
              {patientToEdit ? 'Editar Ficha del Paciente' : 'Registrar Nuevo Paciente'}
            </DialogTitle>
            <DialogDescription>
              {patientToEdit
                ? 'Actualiza los datos personales, previsión o antecedentes clínicos en Supabase.'
                : 'Ingresa los datos para abrir la ficha clínica y habilitar la venta de sesiones.'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        {/* 2. Cuerpo Scrolleable */}
        <DialogBody className="space-y-4">
          {/* Sección 1: Identificación y Contacto */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              1. Identificación y Contacto
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nombre Completo */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">
                  Nombre y Apellidos <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: Valentina Andrea Rojas Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white rounded-xl text-sm font-medium"
                />
              </div>

              {/* RUT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    RUT <span className="text-rose-500">*</span>
                  </label>
                  {isRutValid !== null && (
                    <span
                      className={`text-[10px] font-bold ${
                        isRutValid ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isRutValid ? '✓ RUT Válido' : '✗ RUT Inválido'}
                    </span>
                  )}
                </div>
                <Input
                  required
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={handleRutChange}
                  className={`bg-white rounded-xl text-sm font-mono ${
                    isRutValid === false ? 'border-rose-400 focus:ring-rose-400' : ''
                  }`}
                />
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    required
                    placeholder="+56 9 8765 4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-white rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="paciente@correo.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Fecha de Nacimiento / Edad */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Fecha de Nacimiento</label>
                  {calculatedAge !== null && (
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {calculatedAge} años
                    </span>
                  )}
                </div>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Previsión de Salud */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
              2. Previsión de Salud
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Particular', 'Fonasa', 'Isapre', 'Convenio'] as HealthInsurance[]).map((prev) => (
                <button
                  key={prev}
                  type="button"
                  onClick={() => setHealthInsurance(prev)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    healthInsurance === prev
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {prev}
                </button>
              ))}
            </div>
          </div>

          {/* Sección 3: Antecedentes Clínicos y Alertas */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-amber-600" />
              3. Diagnóstico Clínico y Antecedentes
            </span>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Motivo de Consulta / Diagnóstico Médico / Alertas
              </label>
              <Textarea
                rows={3}
                placeholder="Ej: Lumbago Mecánico Agudo L5-S1. Derivado para pauta kinésica y TMO. Sin marcapasos..."
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="bg-white rounded-xl text-xs resize-none"
              />
            </div>
          </div>
        </DialogBody>

        {/* 3. Footer Fijo Inferior */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold h-9 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xs text-xs h-9 px-5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{patientToEdit ? 'Guardar Cambios' : 'Guardar Paciente'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default PatientModal;
