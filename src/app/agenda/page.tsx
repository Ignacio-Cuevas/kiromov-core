'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import PatientDrawer from '@/components/patients/PatientDrawer';
import { fetchVistaResumenPacientes } from '@/lib/supabase';
import { toast } from 'sonner';

type VistaAgenda = 'dia' | 'semana' | 'mes';

export default function AgendaPage() {
  const supabase = createClient();
  const [vista, setVista] = useState<VistaAgenda>('dia');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Control de WhatsApp Menu abierto
  const [openWhatsappId, setOpenWhatsappId] = useState<string | null>(null);

  // Drawer de paciente
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal nueva cita
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [fechaCita, setFechaCita] = useState(new Date().toISOString().split('T')[0]);
  const [horaCita, setHoraCita] = useState('09:00');
  const [motivo, setMotivo] = useState('');
  const [savingCita, setSavingCita] = useState(false);

  // Cargar citas del rango de fechas
  async function loadAgenda() {
    setLoading(true);
    let citasDataList: any[] = [];
    let pDataList: any[] = [];

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(y, m + 2, 0).toISOString().split('T')[0];

    if (supabase) {
      try {
        const { data: citasData } = await supabase
          .from('citas_atenciones')
          .select('*, pacientes(*)')
          .gte('fecha', startDate)
          .lte('fecha', endDate)
          .order('hora', { ascending: true });

        const { data: pData } = await supabase
          .from('vista_resumen_pacientes')
          .select('*')
          .order('nombre_completo', { ascending: true });

        if (citasData) citasDataList = citasData;
        if (pData) pDataList = pData;
      } catch (err) {
        console.warn('Supabase agenda load error:', err);
      }
    }

    if (pDataList.length === 0) {
      pDataList = await fetchVistaResumenPacientes();
    }

    // Fallback appointments generation for demo/local mode
    if (citasDataList.length === 0 && pDataList.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      citasDataList = [
        {
          id: 'cita-demo-1',
          paciente_id: pDataList[0]?.id,
          fecha: todayStr,
          hora: '09:00',
          profesional: 'Klgo. Ignacio Cuevas Silva',
          estado: 'Asistió',
          motivo_consulta: 'Rehabilitación Lumbar Fase II',
          pacientes: pDataList[0],
        },
        {
          id: 'cita-demo-2',
          paciente_id: pDataList[1]?.id,
          fecha: todayStr,
          hora: '10:30',
          profesional: 'Klgo. Ignacio Cuevas Silva',
          estado: 'En Sala',
          motivo_consulta: 'Control Tendinopatía Rotuliana',
          pacientes: pDataList[1],
        },
        {
          id: 'cita-demo-3',
          paciente_id: pDataList[2]?.id,
          fecha: todayStr,
          hora: '11:45',
          profesional: 'Klgo. Ignacio Cuevas Silva',
          estado: 'Pendiente',
          motivo_consulta: 'Terapia Manual Cervical',
          pacientes: pDataList[2],
        },
      ].filter((item) => item.pacientes);
    }

    setCitas(citasDataList);
    setPacientes(pDataList);
    setLoading(false);
  }

  useEffect(() => {
    loadAgenda();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  // Navegación de Fechas
  const handleNav = (direction: number) => {
    const d = new Date(currentDate);
    if (vista === 'dia') d.setDate(d.getDate() + direction);
    else if (vista === 'semana') d.setDate(d.getDate() + direction * 7);
    else if (vista === 'mes') d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const selectedDateStr = currentDate.toISOString().split('T')[0];

  // Citas del día seleccionado
  const citasDelDia = useMemo(() => {
    return citas.filter((c) => c.fecha === selectedDateStr);
  }, [citas, selectedDateStr]);

  // Citas de la semana actual (Lunes a Sábado)
  const diasSemana = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a Lunes
    const lunes = new Date(d.setDate(diff));

    const arr = [];
    for (let i = 0; i < 6; i++) {
      // Lunes a Sábado
      const dayDate = new Date(lunes);
      dayDate.setDate(lunes.getDate() + i);
      const dateStr = dayDate.toISOString().split('T')[0];
      arr.push({
        date: dayDate,
        dateStr,
        nombre: dayDate.toLocaleDateString('es-CL', { weekday: 'short' }),
        citas: citas.filter((c) => c.fecha === dateStr),
      });
    }
    return arr;
  }, [currentDate, citas]);

  // Citas del Mes (Días del calendario mensual)
  const diasDelMes = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const primerDiaMes = new Date(y, m, 1);
    const ultimoDiaMes = new Date(y, m + 1, 0);

    const arr = [];
    // Espacios vacíos antes del día 1
    const offset = primerDiaMes.getDay() === 0 ? 6 : primerDiaMes.getDay() - 1;
    for (let i = 0; i < offset; i++) {
      arr.push({ dayNumber: '', dateStr: '', citas: [], isCurrentMonth: false });
    }

    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
      const d = new Date(y, m, i);
      const dateStr = d.toISOString().split('T')[0];
      arr.push({
        dayNumber: i,
        dateStr,
        citas: citas.filter((c) => c.fecha === dateStr),
        isCurrentMonth: true,
      });
    }
    return arr;
  }, [currentDate, citas]);

  // Actualizar estado de cita con política de inasistencias
  const updateEstadoCita = async (citaId: string, nuevoEstado: string, pacienteInfo?: any) => {
    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c)));

    // Feedback y Alerta Visual con Sonner
    if (nuevoEstado === 'Inasistencia (Descuenta Sesión)') {
      const pData = pacienteInfo || pacientes.find((p) => p.id === pacienteInfo?.id);
      const tienePlan =
        pData &&
        (pData.total_sesiones > 0 || (pData.estado_plan && pData.estado_plan !== 'Sin Plan Activo'));

      if (tienePlan) {
        toast.error('Inasistencia registrada', {
          description:
            'Se ha descontado 1 sesión del plan del paciente según política clínica.',
          duration: 6000,
        });
      } else {
        toast.warning('Inasistencia registrada', {
          description: 'Inasistencia registrada en el historial del paciente.',
          duration: 5000,
        });
      }
    } else if (nuevoEstado === 'Asistió' || nuevoEstado === 'Atendido') {
      toast.success('Atención completada', {
        description: 'Sesión registrada como asistida en box (descuenta 1 sesión).',
      });
    } else if (nuevoEstado === 'Inasistencia Justificada') {
      toast.info('Inasistencia Justificada', {
        description: 'Inasistencia justificada registrada (NO descuenta sesión).',
      });
    } else if (nuevoEstado === 'Cancelado con Aviso') {
      toast.info('Cancelación Registrada', {
        description: 'Cita cancelada con aviso previo (NO descuenta sesión).',
      });
    }

    if (supabase) {
      try {
        await supabase.from('citas_atenciones').update({ estado: nuevoEstado }).eq('id', citaId);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      }
    }
  };

  // Crear nueva cita
  const handleCreateCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId || !horaCita) return;
    setSavingCita(true);

    const horaNormalizada = horaCita.length === 5 ? horaCita + ':00' : horaCita;
    const pSeleccionado = pacientes.find((p) => p.id === pacienteId);

    if (supabase) {
      try {
        const { error } = await supabase.from('citas_atenciones').insert({
          paciente_id: pacienteId,
          fecha: fechaCita,
          hora: horaNormalizada,
          profesional: 'Klgo. Ignacio Cuevas Silva',
          estado: 'Pendiente',
          motivo_consulta: motivo || 'Sesión de Tratamiento Kinésico',
        });

        if (!error) {
          setPacienteId('');
          setMotivo('');
          setShowNewCitaModal(false);
          await loadAgenda();
          setSavingCita(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase create cita error:', err);
      }
    }

    // Local in-memory fallback
    const nuevaCitaLocal = {
      id: 'cita-' + Date.now(),
      paciente_id: pacienteId,
      fecha: fechaCita,
      hora: horaNormalizada,
      profesional: 'Klgo. Ignacio Cuevas Silva',
      estado: 'Pendiente',
      motivo_consulta: motivo || 'Sesión de Tratamiento Kinésico',
      pacientes: pSeleccionado,
    };

    setCitas((prev) => [...prev, nuevaCitaLocal].sort((a, b) => a.hora.localeCompare(b.hora)));
    setPacienteId('');
    setMotivo('');
    setShowNewCitaModal(false);
    setSavingCita(false);
  };

  const handleOpenPatient = (p: any) => {
    const fullPatient = pacientes.find((item) => item.id === p.id) || p;
    setSelectedPatient(fullPatient);
    setIsDrawerOpen(true);
  };

  // Título del encabezado según vista
  const tituloFecha = useMemo(() => {
    if (vista === 'dia') {
      return currentDate.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } else if (vista === 'semana') {
      return `Semana del ${diasSemana[0]?.dateStr} al ${diasSemana[diasSemana.length - 1]?.dateStr}`;
    }
    return currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  }, [vista, currentDate, diasSemana]);

  return (
    <div className="min-h-screen bg-slate-50" onClick={() => setOpenWhatsappId(null)}>
      {/* Header Global */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-blue-700 font-bold text-lg tracking-tight">
            <span>KIROMOV</span>
            <span className="text-slate-400 font-normal text-sm">Core</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              📋 Pacientes
            </Link>
            <Link href="/agenda" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50">
              📅 Agenda
            </Link>
            <Link href="/finanzas" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              📊 Finanzas & Caja
            </Link>
            <Link href="/planes" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              ⚙️ Tarifas & Planes
            </Link>
          </nav>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
          Klgo. Ignacio Cuevas
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Barra Superior con Selector de Vistas y Fecha */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 capitalize">{tituloFecha}</h1>
            <p className="text-sm text-slate-500">Agenda médica, control de box y confirmaciones vía WhatsApp.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de Vistas (Día, Semana, Mes) */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => setVista('dia')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  vista === 'dia' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setVista('semana')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  vista === 'semana' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setVista('mes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  vista === 'mes' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mes
              </button>
            </div>

            {/* Controles de Navegación */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => handleNav(-1)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ◀ Ant
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={() => handleNav(1)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sig ▶
              </button>
            </div>

            <button
              onClick={() => {
                setFechaCita(selectedDateStr);
                setShowNewCitaModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Agendar Cita</span>
            </button>
          </div>
        </div>

        {/* VISTA 1: DÍA (DETALLADA) */}
        {vista === 'dia' && (
          <div className="space-y-6">
            {/* KPIs del Día */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-slate-400">Total Citados</span>
                <div className="text-xl font-bold text-slate-800 mt-0.5">{citasDelDia.length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-amber-500">En Sala</span>
                <div className="text-xl font-bold text-amber-600 mt-0.5">
                  {citasDelDia.filter((c) => c.estado === 'En Sala').length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-emerald-600">Atendidos</span>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">
                  {
                    citasDelDia.filter(
                      (c) => c.estado === 'Asistió' || c.estado === 'Atendido'
                    ).length
                  }
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-slate-400">Pendientes</span>
                <div className="text-xl font-bold text-slate-600 mt-0.5 flex items-center gap-2">
                  <span>{citasDelDia.filter((c) => c.estado === 'Pendiente').length}</span>
                  {citasDelDia.filter(
                    (c) =>
                      c.estado === 'Inasistencia (Descuenta Sesión)' ||
                      c.estado === 'No Asistió'
                  ).length > 0 && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      {
                        citasDelDia.filter(
                          (c) =>
                            c.estado === 'Inasistencia (Descuenta Sesión)' ||
                            c.estado === 'No Asistió'
                        ).length
                      }{' '}
                      falta(s)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Lista Horaria (SIN overflow-hidden para que flote el dropdown) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
                Horario de Atenciones ({citasDelDia.length})
              </div>

              {citasDelDia.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-3xl block mb-2">📅</span>
                  No hay citas programadas para este día.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {citasDelDia.map((cita) => {
                    const p = cita.pacientes;
                    const horaStr = cita.hora?.slice(0, 5) || '12:00';
                    const telClean = p?.telefono ? p.telefono.replace(/\D/g, '') : '';
                    const waPhone = telClean.startsWith('56') ? telClean : `56${telClean}`;

                    // 3 Plantillas de WhatsApp
                    const t1 = encodeURIComponent(
                      `Hola ${p?.nombre_completo || ''}, te confirmamos que tu próxima sesión en Kiromov Centro Clínico ha quedado agendada para el ${tituloFecha} a las ${horaStr} hrs con el Klgo. Ignacio Cuevas Silva.\n\n📍 Bulnes 470, Oficina 75 (7° Piso, Edificio Aranjuez), Chillán.\n¡Te esperamos!`
                    );
                    const t2 = encodeURIComponent(
                      `Hola ${p?.nombre_completo || ''}, te escribimos de Kiromov Centro Clínico para solicitar la confirmación de tu sesión de kinesiología agendada para el ${tituloFecha} a las ${horaStr} hrs.\n\nPor favor respóndenos con un "Confirmo" o avísanos si necesitas reagendar para liberar el cupo. ¡Muchas gracias!`
                    );
                    const t3 = encodeURIComponent(
                      `Hola ${p?.nombre_completo || ''}, te recordamos que hoy tienes tu sesión en Kiromov Centro Clínico a las ${horaStr} hrs con el Klgo. Ignacio Cuevas.\n\n📍 Bulnes 470, Of. 75, Chillán.\nTe sugerimos asistir con ropa cómoda para tu tratamiento. ¡Nos vemos pronto!`
                    );

                    const isMenuOpen = openWhatsappId === cita.id;

                    return (
                      <div
                        key={cita.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors relative"
                      >
                        {/* Paciente y Hora */}
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-extrabold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl min-w-[70px] text-center border border-blue-100">
                            {horaStr}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-base">{p?.nombre_completo || 'Paciente'}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                              <span>RUT: {p?.rut || 'Sin RUT'}</span>
                              {p?.telefono && <span>• Tel: {p.telefono}</span>}
                              {cita.motivo_consulta && <span className="italic text-slate-400">• {cita.motivo_consulta}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Botón WhatsApp Flotante */}
                          {telClean && (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setOpenWhatsappId(isMenuOpen ? null : cita.id)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors"
                              >
                                <span>💬</span>
                                <span>WhatsApp ▾</span>
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1.5 text-xs divide-y divide-slate-100">
                                  <div className="px-2.5 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                    Plantillas de WhatsApp
                                  </div>
                                  <div className="py-1 space-y-0.5">
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${t1}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg font-medium transition-colors"
                                    >
                                      <span>📩</span>
                                      <span>1. Confirmar Cita Agendada</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${t2}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-lg font-medium transition-colors"
                                    >
                                      <span>❓</span>
                                      <span>2. Solicitar Confirmación</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${t3}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg font-medium transition-colors"
                                    >
                                      <span>⏰</span>
                                      <span>3. Recordatorio de Hoy</span>
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Selector de Estado con Política de Inasistencias */}
                          <select
                            value={cita.estado}
                            onChange={(e) => updateEstadoCita(cita.id, e.target.value, p)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                              cita.estado === 'Asistió' || cita.estado === 'Atendido'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : cita.estado === 'Inasistencia (Descuenta Sesión)'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                                : cita.estado === 'En Sala'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : cita.estado === 'Inasistencia Justificada'
                                ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                                : cita.estado === 'Cancelado con Aviso' || cita.estado === 'Cancelado'
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="Asistió">✓ Atendido (Asistió)</option>
                            <option value="Inasistencia (Descuenta Sesión)">🔴 Inasistencia (Descuenta Sesión)</option>
                            <option value="En Sala">🛋️ En Sala de Espera</option>
                            <option value="Pendiente">⏳ Pendiente</option>
                            <option value="Cancelado con Aviso">⚪ Cancelado con Aviso</option>
                            <option value="Inasistencia Justificada">🟡 Inasistencia Justificada</option>
                          </select>

                          {/* Abrir Ficha */}
                          {p && (
                            <button
                              onClick={() => handleOpenPatient(p)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                            >
                              Ficha & SOAP →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: SEMANA */}
        {vista === 'semana' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {diasSemana.map((col, idx) => {
              const isToday = col.dateStr === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col min-h-[420px] ${
                    isToday ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="border-b pb-2 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400">{col.nombre}</span>
                      <div className="font-bold text-slate-800 text-sm">{col.date.getDate()}</div>
                    </div>
                    {isToday && <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Hoy</span>}
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {col.citas.length === 0 ? (
                      <span className="text-xs text-slate-300 block text-center py-8">Sin citas</span>
                    ) : (
                      col.citas.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => c.pacientes && handleOpenPatient(c.pacientes)}
                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 cursor-pointer transition-all text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-blue-700">
                            <span>{c.hora?.slice(0, 5)}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                c.estado === 'Asistió' || c.estado === 'Atendido'
                                  ? 'bg-emerald-100 text-emerald-700 font-bold'
                                  : c.estado === 'Inasistencia (Descuenta Sesión)'
                                  ? 'bg-rose-100 text-rose-700 font-bold'
                                  : c.estado === 'En Sala'
                                  ? 'bg-amber-100 text-amber-700'
                                  : c.estado === 'Inasistencia Justificada'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {c.estado === 'Inasistencia (Descuenta Sesión)' ? 'Inasistencia' : c.estado}
                            </span>
                          </div>
                          <div className="font-medium text-slate-800 mt-1 truncate">{c.pacientes?.nombre_completo}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VISTA 3: MES */}
        {vista === 'mes' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {diasDelMes.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return <div key={idx} className="h-24 bg-slate-50/50 rounded-xl border border-transparent"></div>;
                }
                const isSelected = cell.dateStr === selectedDateStr;
                const totalCitas = cell.citas.length;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCurrentDate(new Date(cell.dateStr + 'T12:00:00'));
                      setVista('dia');
                    }}
                    className={`h-24 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700">{cell.dayNumber}</span>
                    {totalCitas > 0 && (
                      <div className="space-y-1">
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full block text-center truncate">
                          {totalCitas} {totalCitas === 1 ? 'cita' : 'citas'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal Agendar Nueva Cita */}
      {showNewCitaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">Agendar Cita en Box</h3>
              <button onClick={() => setShowNewCitaModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateCita} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Paciente</label>
                <select
                  required
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Seleccionar paciente...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_completo} ({p.rut || 'Sin RUT'}) - {p.estado_plan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fechaCita}
                    onChange={(e) => setFechaCita(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={horaCita}
                    onChange={(e) => setHoraCita(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Motivo de Consulta / Zona (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Dolor cervical, Control motor rodilla..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewCitaModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCita}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                >
                  {savingCita ? 'Agendando...' : 'Confirmar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer de Ficha Rápida & SOAP */}
      {selectedPatient && (
        <PatientDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            loadAgenda();
          }}
          patient={selectedPatient}
        />
      )}
    </div>
  );
}
