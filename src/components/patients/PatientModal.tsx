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
import { createClient } from '@/utils/supabase/client';
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
} from 'lucide-react';

interface PatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientToEdit?: Patient | any | null;
  onPatientSaved?: (patient: Patient | any) => void;
}

export function PatientModal({
  open,
  onOpenChange,
  patientToEdit,
  onPatientSaved,
}: PatientModalProps) {
  const supabase = createClient();

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('+56 9 ');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [prevision, setPrevision] = useState<HealthInsurance>('Particular');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState('');
  const [antecedentesMorbidos, setAntecedentesMorbidos] = useState('');
  const [alertasSeguridad, setAlertasSeguridad] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (patientToEdit) {
        setNombreCompleto(
          patientToEdit.nombre_completo || patientToEdit.full_name || ''
        );
        setRut(patientToEdit.rut || '');
        setTelefono(patientToEdit.telefono || patientToEdit.phone || '+56 9 ');
        setEmail(patientToEdit.email || '');
        setFechaNacimiento(
          patientToEdit.fecha_nacimiento || patientToEdit.birth_date || ''
        );
        setPrevision(
          patientToEdit.prevision ||
            patientToEdit.prevision_salud ||
            patientToEdit.health_insurance ||
            'Particular'
        );
        setMotivoConsulta(patientToEdit.motivo_consulta || '');
        setDiagnosticoPrincipal(
          patientToEdit.diagnostico_principal ||
            patientToEdit.diagnostico_medico ||
            patientToEdit.medical_notes ||
            ''
        );
        setAntecedentesMorbidos(
          patientToEdit.antecedentes_morbidos ||
            patientToEdit.antecedentes_medicos ||
            ''
        );
        setAlertasSeguridad(
          patientToEdit.alertas_seguridad ||
            patientToEdit.banderas_rojas ||
            ''
        );
      } else {
        setNombreCompleto('');
        setRut('');
        setTelefono('+56 9 ');
        setEmail('');
        setFechaNacimiento('');
        setPrevision('Particular');
        setMotivoConsulta('');
        setDiagnosticoPrincipal('');
        setAntecedentesMorbidos('');
        setAlertasSeguridad('');
      }
    }
  }, [open, patientToEdit]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setRut(formatted);
  };

  const isRutValid = rut.length >= 8 ? validateRut(rut) : null;

  const calculatedAge = React.useMemo(() => {
    if (!fechaNacimiento) return null;
    const birth = new Date(fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [fechaNacimiento]);

  const resetForm = () => {
    setNombreCompleto('');
    setRut('');
    setTelefono('+56 9 ');
    setEmail('');
    setFechaNacimiento('');
    setPrevision('Particular');
    setMotivoConsulta('');
    setDiagnosticoPrincipal('');
    setAntecedentesMorbidos('');
    setAlertasSeguridad('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!supabase) throw new Error('Supabase no inicializado');
      // Validar que al menos haya un nombre
      if (!nombreCompleto?.trim()) {
        toast.error('El nombre completo es obligatorio');
        setIsSubmitting(false);
        return;
      }

      // Normalizar teléfono a formato chileno si existe
      let telLimpio: string | null = null;
      if (telefono?.trim()) {
        const digitos = telefono.replace(/\D/g, '');
        telLimpio = digitos.length >= 9 ? `+56${digitos.slice(-9)}` : telefono.trim();
      }

      const payload = {
        nombre_completo: nombreCompleto.trim(),
        rut: rut?.trim() || null,
        telefono: telLimpio,
        email: email?.trim().toLowerCase() || null,
        fecha_nacimiento: fechaNacimiento || null,
        prevision: prevision || 'Particular',
        prevision_salud: prevision || 'Particular',
        motivo_consulta: motivoConsulta?.trim() || null,
        diagnostico_principal: diagnosticoPrincipal?.trim() || null,
        antecedentes_morbidos: antecedentesMorbidos?.trim() || null,
        alertas_seguridad: alertasSeguridad?.trim() || null,
        estado: 'activo'
      };

      console.log('Enviando payload a Supabase:', payload);
      
      const isEditing = Boolean(patientToEdit?.id);
      let resultData;

      if (isEditing && patientToEdit?.id) {
        const { data, error } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('id', patientToEdit.id)
          .select()
          .single();

        if (error) {
          console.error('Error al actualizar paciente:', error);
          toast.error(`No se pudo actualizar el paciente: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
        resultData = data;
        toast.success('¡Paciente actualizado exitosamente!');
      } else {
        const { data, error } = await supabase
          .from('pacientes')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Error de Supabase al insertar paciente:', error);
          // MOSTRAR EL ERROR EXACTO EN PANTALLA
          toast.error(`Error al registrar paciente: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
        console.log('Paciente creado exitosamente:', data);
        toast.success('¡Paciente registrado exitosamente!');
        resultData = data;
      }

      if (onPatientSaved && resultData) {
        onPatientSaved(resultData);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error('Excepción al registrar paciente:', err);
      toast.error(err.message || 'Error inesperado en el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-2xl">
      {/* 1. Header Fijo */}
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
                : 'Ingresa los datos para registrar la ficha médica en Kiromov Core.'}
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
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="bg-white rounded-xl text-sm font-medium"
                />
              </div>

              {/* RUT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    RUT
                  </label>
                  {isRutValid !== null && rut.trim() !== '' && (
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
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={handleRutChange}
                  className={`bg-white rounded-xl text-sm font-mono ${
                    isRutValid === false && rut.trim() !== '' ? 'border-rose-400 focus:ring-rose-400' : ''
                  }`}
                />
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="+56 9 8765 4321"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
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
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Previsión y Motivo */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
              2. Previsión y Motivo de Consulta
            </span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Previsión de Salud</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Particular', 'Fonasa', 'Isapre', 'Convenio'] as HealthInsurance[]).map((prev) => (
                    <button
                      key={prev}
                      type="button"
                      onClick={() => setPrevision(prev)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        prevision === prev
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {prev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Motivo de Consulta Inicial
                </label>
                <Input
                  placeholder="Ej: Dolor cervical irradiado a hombro tras sobrecarga deportiva"
                  value={motivoConsulta}
                  onChange={(e) => setMotivoConsulta(e.target.value)}
                  className="bg-white rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Diagnóstico y Antecedentes */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
              3. Diagnóstico Clínico y Antecedentes
            </span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-800">
                  Diagnóstico Principal / Hipótesis Kinésica (Para Certificados)
                </label>
                <Input
                  placeholder="Ej: Lumbago Mecánico Agudo L5-S1 / Tendinopatía Manguito Rotador"
                  value={diagnosticoPrincipal}
                  onChange={(e) => setDiagnosticoPrincipal(e.target.value)}
                  className="bg-white border-blue-200 focus:border-blue-500 rounded-xl text-sm font-medium text-blue-950"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Antecedentes Mórbidos / Quirúrgicos
                </label>
                <Textarea
                  rows={2}
                  placeholder="Ej: Cirugía meniscal 2024, Hipertensión controlada, medicamentos..."
                  value={antecedentesMorbidos}
                  onChange={(e) => setAntecedentesMorbidos(e.target.value)}
                  className="bg-white rounded-xl text-xs resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Alertas de Seguridad / Banderas Rojas
                </label>
                <Input
                  placeholder="Ej: Marcapasos, fiebre, dolor nocturno inexplicable..."
                  value={alertasSeguridad}
                  onChange={(e) => setAlertasSeguridad(e.target.value)}
                  className="bg-white border-rose-200 focus:border-rose-400 rounded-xl text-xs text-rose-900"
                />
              </div>
            </div>
          </div>
        </DialogBody>

        {/* 3. Footer Fijo */}
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
