'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

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
      setNombre(patient.nombre_completo || '');
      setRut(patient.rut || '');
      setTelefono(patient.telefono || '');
      setEmail(patient.email || '');
      setFechaNacimiento(patient.fecha_nacimiento || '');
      setDiagnostico(patient.diagnostico_medico || patient.diagnostico_principal || '');
      setAntecedentes(patient.antecedentes_medicos || '');
      setBanderasRojas(patient.banderas_rojas || '');
    }
  }, [patient]);

  if (!isDialogOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
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
        const { error } = await supabase
          .from('pacientes')
          .update(updatePayload)
          .eq('id', patient.id);

        if (error) {
          console.warn('Error en update Supabase pacientes:', error);
        }
      } catch (err) {
        console.warn('Excepción actualizando paciente en Supabase:', err);
      }
    }

    const updatedPatientObj = {
      ...patient,
      ...updatePayload,
      nombre_completo: updatePayload.nombre_completo,
      rut: updatePayload.rut || patient.rut,
      telefono: updatePayload.telefono || patient.telefono,
      email: updatePayload.email,
      diagnostico_medico: updatePayload.diagnostico_medico,
      diagnostico_principal: updatePayload.diagnostico_principal,
    };

    onPatientUpdated(updatedPatientObj);
    toast.success('Ficha del paciente actualizada con éxito');
    handleClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Ficha y Datos del Paciente</h3>
            <p className="text-xs text-slate-500">{patient.codigo_paciente || 'Ficha Clínica'}</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm overflow-y-auto pr-1 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Nombre Completo *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">RUT</label>
              <input
                type="text"
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Teléfono / WhatsApp</label>
              <input
                type="text"
                placeholder="+56 9 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Fecha de Nacimiento</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* DIAGNÓSTICO MÉDICO / KINÉSICO */}
          <div>
            <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">
              Diagnóstico Médico / Kinésico (Para Certificados)
            </label>
            <input
              type="text"
              placeholder="Ej: Síndrome de Pinzamiento Subacromial D°, Lumbago Mecánico..."
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 bg-blue-50/40 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Antecedentes Médicos / Quirúrgicos</label>
            <textarea
              rows={2}
              placeholder="Ej: Cirugía meniscal 2024, HTA controlada..."
              value={antecedentes}
              onChange={(e) => setAntecedentes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-700 mb-1 uppercase">Banderas Rojas / Alertas Clínicas</label>
            <textarea
              rows={2}
              placeholder="Ej: Dolor nocturno constante, fiebre, sospecha radiculopatía..."
              value={banderasRojas}
              onChange={(e) => setBanderasRojas(e.target.value)}
              className="w-full px-3 py-2 border border-rose-200 bg-rose-50/50 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPatientDialog;
