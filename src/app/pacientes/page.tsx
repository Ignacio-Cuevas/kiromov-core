'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { PatientModal } from '@/components/patients/PatientModal';
import { SaleModal } from '@/components/sales/SaleModal';
import { Patient, Sale } from '@/types/clinical';
import { getPatients } from '@/actions/patients';
import { formatRut, formatCLP, formatDateChile } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Search,
  ShoppingCart,
  Calendar,
  Phone,
  Mail,
  Edit2,
  RefreshCw,
  FolderOpen,
  CalendarDays,
  ShieldCheck,
  Tag,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [patientTargetSale, setPatientTargetSale] = useState<Patient | null>(null);

  const loadData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await getPatients(searchQuery);
      setPatients(data);
      if (showToast) toast.success('Directorio de pacientes actualizado');
    } catch (err) {
      toast.error('Error al cargar pacientes');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setPatientToEdit(null);
    setIsPatientModalOpen(true);
  };

  const handleOpenEdit = (p: Patient) => {
    setPatientToEdit(p);
    setIsPatientModalOpen(true);
  };

  const handleOpenSale = (p: Patient) => {
    setPatientTargetSale(p);
    setIsSaleModalOpen(true);
  };

  const handlePatientSaved = () => {
    loadData();
  };

  const handleSaleCompleted = () => {
    loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSupabaseOnline={true}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Directorio Clínico de Pacientes</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/70 border border-blue-300/60 px-2.5 py-0.5 rounded-full">
                {patients.length} Registrados
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestión de fichas, saldo de sesiones adquiridas y emisión de ventas clínicas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span>Actualizar</span>
            </Button>

            <Button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Nuevo Paciente</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nombre, RUT o Teléfono..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Mostrando <strong className="text-slate-800">{patients.length}</strong> pacientes encontrados
          </div>
        </div>

        {/* Patients Grid */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold text-slate-700">Cargando directorio de pacientes...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">No se encontraron pacientes</h4>
              <p className="text-xs text-slate-500 mt-1">
                Registra el primer paciente con el botón superior para comenzar.
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold">
              <UserPlus className="h-4 w-4" />
              <span>Registrar Paciente</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => {
              const total = p.total_sessions || 0;
              const used = p.used_sessions || 0;
              const remaining = p.remaining_sessions ?? Math.max(0, total - used);
              const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Name and Prevision */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {p.full_name}
                        </h3>
                        <span className="text-xs font-mono text-slate-500">
                          RUT: {formatRut(p.rut)}
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {p.health_insurance || 'Particular'}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-xs text-slate-600">
                      {p.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Medical Diagnosis if available */}
                    {p.medical_notes && (
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 line-clamp-2">
                        <strong className="block text-[11px] text-blue-700 uppercase font-bold">
                          Diagnóstico / Motivo:
                        </strong>
                        {p.medical_notes}
                      </div>
                    )}

                    {/* Session Balance Card */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Saldo de Sesiones:</span>
                        <span
                          className={`font-bold ${
                            remaining <= 1 ? 'text-amber-600' : 'text-emerald-700'
                          }`}
                        >
                          {remaining} disponibles
                        </span>
                      </div>
                      <Progress value={percent} className="h-2" />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Realizadas: {used}</span>
                        <span>Total: {total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenSale(p)}
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 rounded-xl shadow-2xs"
                      title="Vender o asignar sesiones a este paciente"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Venta</span>
                    </Button>

                    <Link
                      href={`/agenda?pacienteId=${p.id}`}
                      className="h-8 inline-flex items-center justify-center bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-bold text-xs gap-1 rounded-xl transition-colors shadow-2xs"
                      title="Agendar cita en el calendario"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Agendar</span>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(p)}
                      className="h-8 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-1 rounded-xl shadow-2xs"
                      title="Editar datos del paciente"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Editar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Patient Create / Edit Modal */}
      <PatientModal
        open={isPatientModalOpen}
        onOpenChange={setIsPatientModalOpen}
        patientToEdit={patientToEdit}
        onPatientSaved={handlePatientSaved}
      />

      {/* Sale / Billing Modal */}
      <SaleModal
        open={isSaleModalOpen}
        onOpenChange={setIsSaleModalOpen}
        initialPatient={patientTargetSale}
        onSaleCompleted={handleSaleCompleted}
      />
    </div>
  );
}
