'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Paciente, PrevisionSalud } from '@/types/database';
import { crearNuevoPaciente } from '@/lib/supabase';
import { formatRut, validateRut } from '@/lib/utils';
import { toast } from 'sonner';
import {
  UserPlus,
  User,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  Stethoscope,
  Save,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated: (newPatient: Paciente) => void;
}

export function CreatePatientDialog({
  open,
  onOpenChange,
  onPatientCreated,
}: CreatePatientDialogProps) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('+56 9 ');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [prevision, setPrevision] = useState<PrevisionSalud>('Particular');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [antecedentes, setAntecedentes] = useState('');
  const [banderasRojas, setBanderasRojas] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNombre('');
      setRut('');
      setTelefono('+56 9 ');
      setEmail('');
      setFechaNacimiento('');
      setPrevision('Particular');
      setMotivoConsulta('');
      setDiagnostico('');
      setAntecedentes('');
      setBanderasRojas('');
    }
  }, [open]);

  // RUT formatting and validation
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRut(raw);
    setRut(formatted);
  };

  const isRutValid = rut.length >= 8 ? validateRut(rut) : null;

  // Calculate age
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error('El nombre completo es obligatorio');
      return;
    }

    if (!rut.trim()) {
      toast.error('El RUT es obligatorio');
      return;
    }

    if (!validateRut(rut)) {
      toast.error('El RUT ingresado no es válido', {
        description: 'Verifica el número y dígito verificador.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await crearNuevoPaciente({
        codigo_paciente: '',
        nombre_completo: nombre.trim().toUpperCase(),
        rut: rut.trim(),
        telefono: telefono.trim(),
        email: email.trim().toLowerCase() || null,
        fecha_nacimiento: fechaNacimiento || null,
        prevision_salud: prevision,
        motivo_consulta: motivoConsulta.trim() || null,
        diagnostico_medico: diagnostico.trim() || null,
        diagnostico_principal: diagnostico.trim() || null,
        antecedentes_medicos: antecedentes.trim() || null,
        banderas_rojas: banderasRojas.trim() || null,
        estado: 'active',
      });

      if (result.success && result.data) {
        toast.success('¡Paciente registrado con éxito!', {
          description: `${result.data.nombre_completo} (${result.data.codigo_paciente})`,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        });
        onPatientCreated(result.data);
        onOpenChange(false);
      } else {
        toast.error('No se pudo registrar el paciente: ' + (result.error || ''));
      }
    } catch (err: any) {
      toast.error('Error de conexión al registrar paciente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2.5 text-slate-800">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700 border border-blue-100">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Registrar Nuevo Paciente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ingresa los datos personales, previsión y antecedentes clínicos para abrir su ficha.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Sección: Datos Personales */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
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
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>

            {/* RUT con validación */}
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
              <div className="relative">
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

            {/* Fecha de Nacimiento */}
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

        {/* Sección: Previsión y Consulta */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
            2. Previsión de Salud y Motivo Clínico
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Previsión */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Previsión de Salud</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Particular', 'Fonasa', 'Isapre', 'Convenio'] as PrevisionSalud[]).map((prev) => (
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

            {/* Motivo de Consulta Inicial */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Motivo de Consulta Inicial
              </label>
              <Input
                placeholder="Ej: Dolor lumbar irradiado a pierna derecha tras cargar peso"
                value={motivoConsulta}
                onChange={(e) => setMotivoConsulta(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>

            {/* Diagnóstico Médico Inicial */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Diagnóstico Médico / Hipótesis Kinésica
              </label>
              <Input
                placeholder="Ej: Lumbago Mecánico Agudo / Radiculopatía L5"
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                className="bg-white rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Sección: Antecedentes y Banderas Rojas */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-amber-600" />
            3. Antecedentes Médicos y Alertas
          </span>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Antecedentes Mórbidos / Cirugías Previas
              </label>
              <Textarea
                rows={2}
                placeholder="Hipertensión, diabetes, cirugías previas, medicamentos habituales..."
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
                className="bg-white rounded-xl text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Banderas Rojas / Alertas de Seguridad
              </label>
              <Input
                placeholder="Ej: Marcapasos, fractura reciente, pérdida inexplicable de peso, fiebre..."
                value={banderasRojas}
                onChange={(e) => setBanderasRojas(e.target.value)}
                className="bg-white border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl text-xs text-rose-900"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Guardando...' : 'Crear Paciente'}</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default CreatePatientDialog;
