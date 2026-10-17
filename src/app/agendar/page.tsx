'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  MapPin, 
  ShieldCheck, 
  ArrowLeft, 
  Download, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Loader2,
  CalendarCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRut } from '@/lib/utils';

interface ServiceOption {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  price: string;
  priceNum: number;
  description: string;
}

const SERVICES: ServiceOption[] = [
  {
    id: 'evaluacion',
    title: 'Evaluación Inicial + TMO',
    subtitle: 'Primera consulta clínica especializada',
    duration: '60 min',
    price: '$28.000',
    priceNum: 28000,
    description: 'Diagnóstico funcional biomecánico, test ortopédicos avanzados y primera sesión de terapia manual específica.',
  },
  {
    id: 'tratamiento',
    title: 'Sesión de Tratamiento TMO',
    subtitle: 'Rehabilitación & Terapia Manual Ortopédica',
    duration: '60 min',
    price: '$28.000',
    priceNum: 28000,
    description: 'Sesión de seguimiento continuo o pacientes con derivación médica previa. Técnicas articulares y miofasciales.',
  },
];

const PREVISIONES = [
  'Particular',
  'Fonasa',
  'Isapre Colmena',
  'Isapre Banmédica',
  'Isapre Consalud',
  'Isapre Cruz Blanca',
  'Isapre Nueva Masvida',
  'Isapre Vida Tres',
  'Convenio / Seguro Complementario',
];

export default function AgendarOnlinePage() {
  // Pasos: 1 = Servicio, 2 = Fecha y Hora, 3 = Datos Paciente, 4 = Éxito
  const [paso, setPaso] = useState<number>(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServiceOption>(SERVICES[0]);

  // Fecha y Slots
  const [fecha, setFecha] = useState<string>(() => {
    // Inicializar con la fecha de hoy
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('');

  // Fechas límites: min = hoy, max = 8 días hacia adelante
  const { minDate, maxDate } = React.useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const min = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const maxD = new Date();
    maxD.setDate(maxD.getDate() + 8);
    const max = `${maxD.getFullYear()}-${pad(maxD.getMonth() + 1)}-${pad(maxD.getDate())}`;
    return { minDate: min, maxDate: max };
  }, []);

  // Formulario de Paciente
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [prevision, setPrevision] = useState('Particular');
  const [motivo, setMotivo] = useState('');

  // Estado de Reserva
  const [submitting, setSubmitting] = useState(false);
  const [reservaExitosa, setReservaExitosa] = useState<{
    citaId: string;
    fecha: string;
    hora: string;
    nombre: string;
    servicio: string;
  } | null>(null);

  // Cargar slots al cambiar la fecha
  useEffect(() => {
    if (!fecha) return;

    let isMounted = true;
    setLoadingSlots(true);
    setHoraSeleccionada('');

    fetch(`/api/public/slots?fecha=${fecha}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.slots && Array.isArray(data.slots)) {
          setSlots(data.slots);
        } else {
          setSlots([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error cargando horarios:', err);
        setSlots([]);
        toast.error('No se pudieron cargar los horarios disponibles');
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fecha]);

  // Formatear RUT reactivamente
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setRut('');
      return;
    }
    setRut(formatRut(val));
  };

  // Enviar Reserva
  const handleReservar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error('Por favor ingresa tu nombre completo');
      return;
    }
    if (!telefono.trim()) {
      toast.error('Por favor ingresa tu teléfono o WhatsApp');
      return;
    }
    if (!fecha || !horaSeleccionada) {
      toast.error('Por favor selecciona una fecha y hora disponible');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          rut: rut.trim() || undefined,
          telefono: telefono.trim(),
          email: email.trim() || undefined,
          prevision,
          motivo: `${servicioSeleccionado.title} (${servicioSeleccionado.duration})${motivo ? ` - ${motivo.trim()}` : ''}`,
          fecha,
          hora: horaSeleccionada,
          tipo_motivo: servicioSeleccionado.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar tu reserva');
      }

      setReservaExitosa({
        citaId: data.cita_id,
        fecha,
        hora: horaSeleccionada,
        nombre: nombre.trim(),
        servicio: servicioSeleccionado.title,
      });
      setPaso(4);
      toast.success('¡Cita reservada con éxito!');
    } catch (err: any) {
      console.error('Error al reservar:', err);
      toast.error(err.message || 'No se pudo completar la reserva. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generador de enlace a WhatsApp para guardar comprobante
  const generarEnlaceWhatsAppPaciente = () => {
    if (!reservaExitosa) return '#';
    const fechaLegible = formatFechaLegible(reservaExitosa.fecha);

    const mensaje = 
      `*Comprobante de Reserva · KIROMOV Centro Clínico*\n\n` +
      `¡Hola *${reservaExitosa.nombre}*! Tu cita ha sido agendada con éxito:\n\n` +
      `📋 *Servicio:* ${reservaExitosa.servicio}\n` +
      `📅 *Fecha:* ${fechaLegible}\n` +
      `⏰ *Horario:* ${reservaExitosa.hora} hrs\n` +
      `👨‍⚕️ *Profesional:* Klgo. Ignacio Cuevas Silva\n\n` +
      `*Indicaciones importantes para tu atención presencial:*\n` +
      `📍 *Ubicación:* Edificio Aranjuez / Piso 7, Of. 75 (Bulnes 470, Chillán)\n` +
      `⏰ *Puntualidad:* Llegar 5-10 min antes\n` +
      `👟 *Vestimenta:* Ropa cómoda o deportiva\n` +
      `📑 *Exámenes:* Traer radiografías o resonancias si tienes\n` +
      `⏳ *Cancelaciones:* Con al menos 24 hrs de anticipación\n\n` +
      `¡Te esperamos! ✨`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
  };

  // Generador de enlace a Google Calendar
  const getGoogleCalendarUrl = () => {
    if (!reservaExitosa) return '#';
    const cleanFecha = reservaExitosa.fecha.replace(/-/g, '');
    const cleanHora = reservaExitosa.hora.replace(/:/g, '').slice(0, 4);
    
    // 60 minutos después
    const [h, m] = reservaExitosa.hora.split(':').map(Number);
    const endMinutes = h * 60 + m + 60;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const cleanEndHora = `${endH}${endM}`;

    const title = encodeURIComponent(`Kiromov: ${reservaExitosa.servicio}`);
    const details = encodeURIComponent(
      `Cita confirmada en Kiromov Centro Clínico.\n` +
      `Profesional: Klgo. Ignacio Cuevas Silva\n` +
      `Paciente: ${reservaExitosa.nombre}\n` +
      `Servicio: ${reservaExitosa.servicio}\n\n` +
      `📍 Ubicación: Edificio Aranjuez / Piso 7, Of. 75 (Bulnes 470, Chillán)\n` +
      `⏰ Puntualidad: Llegar 5-10 min antes\n` +
      `👟 Vestimenta: Ropa cómoda o deportiva\n` +
      `📑 Exámenes: Traer radiografías o resonancias si tienes\n` +
      `⏳ Cancelaciones: Con al menos 24 hrs de anticipación`
    );
    const location = encodeURIComponent('Bulnes 470, Piso 7, Of. 75 (Edificio Aranjuez), Chillán');
    const dates = `${cleanFecha}T${cleanHora}00/${cleanFecha}T${cleanEndHora}00`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  // Descarga de archivo .ics para Apple Calendar / Outlook
  const handleDownloadIcs = () => {
    if (!reservaExitosa) return;
    const cleanFecha = reservaExitosa.fecha.replace(/-/g, '');
    const cleanHora = reservaExitosa.hora.replace(/:/g, '').slice(0, 4);

    const [h, m] = reservaExitosa.hora.split(':').map(Number);
    const endMinutes = h * 60 + m + 60;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const cleanEndHora = `${endH}${endM}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kiromov Centro Clinico//Reserva Online//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART:${cleanFecha}T${cleanHora}00`,
      `DTEND:${cleanFecha}T${cleanEndHora}00`,
      `SUMMARY:Kiromov: ${reservaExitosa.servicio}`,
      `DESCRIPTION:Atención Kinésica y TMO con Klgo. Ignacio Cuevas Silva\\nPaciente: ${reservaExitosa.nombre}\\nServicio: ${reservaExitosa.servicio}\\n\\n📍 Ubicación: Edificio Aranjuez / Piso 7, Of. 75 (Bulnes 470, Chillán)\\n⏰ Puntualidad: Llegar 5-10 min antes\\n👟 Vestimenta: Ropa cómoda o deportiva\\n📑 Exámenes: Traer radiografías o resonancias si tienes\\n⏳ Cancelaciones: Con al menos 24 hrs de anticipación`,
      'LOCATION:Bulnes 470, Piso 7, Of. 75, Edificio Aranjuez, Chillán',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cita-kiromov-${reservaExitosa.fecha}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formato de fecha chilena legible
  const formatFechaLegible = (fechaStr: string) => {
    try {
      const [y, m, d] = fechaStr.split('-').map(Number);
      const date = new Date(y, m - 1, d, 12, 0, 0);
      return date.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col justify-between selection:bg-orange-600 selection:text-white">
      {/* Contenedor Principal */}
      <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        
        {/* Cabecera Institucional (Luminosa) */}
        <header className="text-center mb-8 sm:mb-10">
          <Image
            src="/branding/logo.png"
            alt="Kiromov Centro Clínico"
            width={240}
            height={70}
            className="w-52 h-auto object-contain mx-auto mb-2"
            priority
          />
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
            Reserva de Hora Online
          </h1>
          <p className="text-xs font-semibold text-slate-600 max-w-md mx-auto">
            Quiropraxia y Terapia Manual de Alta Especialización
          </p>
          <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-500 mt-2">
            <MapPin className="w-3.5 h-3.5 text-[#c2410c] shrink-0" />
            <span>Bulnes 470, Of. 75, Chillán</span>
          </div>
        </header>

        {/* Indicador de Pasos (1 - 2 - 3) */}
        {paso < 4 && (
          <div className="flex items-center justify-between mb-8 px-4 max-w-md mx-auto">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  paso === 1
                    ? 'bg-slate-900 text-white ring-4 ring-slate-900/10 shadow-sm'
                    : paso > 1
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                1
              </div>
              <span className={`text-[11px] mt-1.5 ${paso === 1 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                Servicio
              </span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-2.5 ${paso > 1 ? 'bg-slate-900' : 'bg-slate-200'}`} />

            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  paso === 2
                    ? 'bg-slate-900 text-white ring-4 ring-slate-900/10 shadow-sm'
                    : paso > 2
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                2
              </div>
              <span className={`text-[11px] mt-1.5 ${paso === 2 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                Horario
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-2.5 ${paso > 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />

            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  paso === 3
                    ? 'bg-slate-900 text-white ring-4 ring-slate-900/10 shadow-sm'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                3
              </div>
              <span className={`text-[11px] mt-1.5 ${paso === 3 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                Tus Datos
              </span>
            </div>
          </div>
        )}

        {/* Tarjeta Contenedora Central del Flujo (Luminosa) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 md:p-8 max-w-2xl mx-auto">
          
          {/* ======================================================== */}
          {/* PASO 1: SELECCIÓN DE SERVICIO                            */}
          {/* ======================================================== */}
          {paso === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                  Paso 1: Selecciona el Tipo de Atención
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Ambas prestaciones son realizadas por el Klgo. Ignacio Cuevas Silva (Registro SIS N° 396889).
                </p>
              </div>

              <div className="space-y-4">
                {SERVICES.map((servicio) => {
                  const seleccionado = servicioSeleccionado.id === servicio.id;
                  return (
                    <div
                      key={servicio.id}
                      onClick={() => setServicioSeleccionado(servicio)}
                      className={`rounded-2xl p-5 cursor-pointer transition-all relative ${
                        seleccionado
                          ? 'bg-slate-50/80 border-2 border-slate-900 shadow-md'
                          : 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {servicio.title}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {servicio.duration}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {servicio.subtitle}
                          </p>
                          <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                            {servicio.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xl font-bold text-slate-900 font-mono">
                            {servicio.price}
                          </span>
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            CLP
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          Reembolsable Isapre / Seguros Complementarios
                        </span>
                        <span className={`text-xs font-semibold ${seleccionado ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                          {seleccionado ? '✓ Seleccionado' : 'Elegir'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="w-full sm:w-auto bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-sm"
                >
                  Continuar a Selección de Fecha
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 2: SELECCIÓN DE FECHA Y HORARIO LIBRE               */}
          {/* ======================================================== */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                    Paso 2: Fecha y Bloque Horario
                  </h2>
                  <p className="text-xs text-slate-500">
                    Servicio: <strong className="text-slate-900">{servicioSeleccionado.title}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>

              {/* Selector de Fecha */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#c2410c]" />
                  Selecciona el día de tu atención:
                </label>
                <input
                  type="date"
                  value={fecha}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-medium text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-xs"
                />
                <p className="text-[11px] text-slate-500 capitalize">
                  {fecha ? formatFechaLegible(fecha) : ''}
                </p>
              </div>

              {/* Bloques Horarios Disponibles */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#c2410c]" />
                  Horarios disponibles en box para este día:
                </label>

                {slots.length > 0 && (
                  <div className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 mb-3 w-fit">
                    <span>⚡ Alta demanda: Solo {slots.length} {slots.length === 1 ? 'cupo disponible' : 'cupos disponibles'} para esta fecha</span>
                  </div>
                )}

                {loadingSlots ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-[#c2410c]" />
                    <span className="text-xs font-medium">Consultando agenda en tiempo real...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-10 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto opacity-90" />
                    <p className="text-sm font-semibold text-slate-800">No hay horas disponibles para este día</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Martes y domingos el centro permanece cerrado o todos los cupos han sido completados. Por favor selecciona otra fecha dentro de los próximos 8 días.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {slots.map((s) => {
                      const seleccionado = horaSeleccionada === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setHoraSeleccionada(s)}
                          className={`py-3 px-3 rounded-xl font-mono font-bold text-sm border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                            seleccionado
                              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-md'
                              : 'bg-white border border-slate-200 hover:border-slate-900 hover:text-slate-900 text-slate-800 shadow-xs'
                          }`}
                        >
                          <span>{s} hrs</span>
                          <span className={`text-[10px] font-normal ${seleccionado ? 'text-slate-300' : 'text-slate-500'}`}>
                            Disponible
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones de Navegación */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  ← Cambiar Servicio
                </button>

                <button
                  type="button"
                  onClick={() => setPaso(3)}
                  disabled={!horaSeleccionada}
                  className="bg-[#c2410c] hover:bg-[#9a3412] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-3.5 px-6 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 text-sm"
                >
                  Continuar con Mis Datos
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 3: FORMULARIO DEL PACIENTE Y CONFIRMACIÓN            */}
          {/* ======================================================== */}
          {paso === 3 && (
            <form onSubmit={handleReservar} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                    Paso 3: Tus Datos de Contacto
                  </h2>
                  <p className="text-xs text-slate-500">
                    Necesarios para registrar tu ficha clínica oficial y enviarte la confirmación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>

              {/* Resumen del Horario Escogido */}
              <div className="p-4 bg-orange-50 border border-orange-200/80 rounded-2xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block capitalize">
                    📅 {formatFechaLegible(fecha)}
                  </span>
                  <span className="text-[#c2410c] font-semibold block">
                    ⏰ {horaSeleccionada} hrs · {servicioSeleccionado.title}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-900 font-mono block">
                    {servicioSeleccionado.price}
                  </span>
                  <span className="text-[10px] text-slate-500">Pago en consulta</span>
                </div>
              </div>

              {/* Inputs del Paciente */}
              <div className="space-y-4">
                {/* Nombre Completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#c2410c]" />
                    Nombre y Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez González"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 shadow-xs"
                  />
                </div>

                {/* RUT y Previsión */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      RUT (Cédula de Identidad)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 12.345.678-9"
                      value={rut}
                      onChange={handleRutChange}
                      className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Previsión de Salud *
                    </label>
                    <select
                      value={prevision}
                      onChange={(e) => setPrevision(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-2.5 text-sm shadow-xs h-[42px]"
                    >
                      {PREVISIONES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teléfono / WhatsApp y Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#c2410c]" />
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+56 9 1234 5678"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#c2410c]" />
                      Correo Electrónico (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="nombre@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>

                {/* Motivo o Síntomas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#c2410c]" />
                    Motivo de Consulta o Molestia Principal
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Dolor lumbar agudo hace 3 días, molestia en cuello o rodilla..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 shadow-xs resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Botón Final */}
              <div className="pt-4 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  ← Cambiar Horario
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold py-3.5 px-8 rounded-2xl shadow-md w-full sm:w-auto transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirmando Reserva...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      Confirmar Cita · {servicioSeleccionado.price}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* PANTALLA DE ÉXITO                                        */}
          {/* ======================================================== */}
          {paso === 4 && reservaExitosa && (
            <div className="text-center py-2 sm:py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">
                  ¡Tu cita ha sido reservada con éxito!
                </h2>
                <p className="text-sm text-slate-600">
                  Hemos agendado tu atención clínica en Kiromov Centro Clínico.
                </p>
              </div>

              {/* Tarjeta de Resumen Final */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3 max-w-lg mx-auto shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                    Paciente
                  </span>
                  <p className="text-base font-bold text-slate-900">{reservaExitosa.nombre}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                      Fecha
                    </span>
                    <p className="text-sm font-semibold text-slate-800 capitalize">
                      {formatFechaLegible(reservaExitosa.fecha)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                      Horario
                    </span>
                    <p className="text-sm font-bold text-[#c2410c]">
                      {reservaExitosa.hora} hrs
                    </p>
                  </div>
                </div>

                <div className="border-b border-slate-200 pb-3">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                    Servicio
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{reservaExitosa.servicio}</p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">
                    Ubicación del Centro
                  </span>
                  <p className="text-sm text-slate-700">
                    Edificio Aranjuez / Piso 7, Of. 75 (Bulnes 470, Chillán)
                  </p>
                </div>
              </div>

              {/* Tarjeta de Información Importante y Políticas */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-800 shadow-sm max-w-lg mx-auto text-left space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    📍 Información importante para tu cita presencial:
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-2 list-none pl-1">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span><strong className="text-slate-900">Ubicación:</strong> Edificio Aranjuez / Piso 7, Of. 75 (Bulnes 470, Chillán).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span><strong className="text-slate-900">Puntualidad:</strong> Te solicitamos llegar con 5 a 10 minutos de anticipación para iniciar a la hora programada y aprovechar al máximo tu tiempo de atención.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span><strong className="text-slate-900">Vestimenta:</strong> Asiste con ropa cómoda o deportiva que permita evaluar y trabajar fácilmente la zona a tratar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span><strong className="text-slate-900">Exámenes previos:</strong> Si cuentas con radiografías, ecografías, resonancias u otros exámenes médicos recientes, por favor tráelos a la consulta.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-1.5">
                    ⏳ Políticas de cambio y cancelación:
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Si necesitas cancelar o reprogramar tu sesión, por favor hazlo con al menos <strong className="text-slate-900">24 horas de anticipación</strong> para liberar el cupo a otro paciente que lo requiera.
                  </p>
                </div>

                <p className="text-xs font-semibold text-center text-slate-800 pt-2 border-t border-slate-200">
                  ¡Nos vemos en la consulta!
                </p>
              </div>

              {/* Botones de Acción: WhatsApp y Calendario */}
              <div className="space-y-3 max-w-lg mx-auto pt-2">
                <a
                  href={generarEnlaceWhatsAppPaciente()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all w-full cursor-pointer active:scale-95"
                >
                  <span>💬 Guardar Comprobante en mi WhatsApp</span>
                </a>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-300 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-[#c2410c]" />
                    Guardar en Google Calendar
                  </a>

                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="w-full sm:flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-300 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#c2410c]" />
                    Descargar (.ics)
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setReservaExitosa(null);
                    setPaso(1);
                    setNombre('');
                    setRut('');
                    setTelefono('');
                    setEmail('');
                    setMotivo('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Agendar otra cita
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Informativo */}
        <footer className="text-center mt-8 text-xs text-slate-500 space-y-1">
          <p>© {new Date().getFullYear()} Kiromov Centro Clínico · Todos los derechos reservados.</p>
          <p>
            Atención profesional certificada · Dudas o urgencias al WhatsApp{' '}
            <a
              href="https://wa.me/56939499906"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c2410c] hover:underline font-medium"
            >
              +56 9 3949 9906
            </a>
          </p>
        </footer>

      </div>
    </div>
  );
}
