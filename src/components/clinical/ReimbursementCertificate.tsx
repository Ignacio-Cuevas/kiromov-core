'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReimbursementCertificateProps {
  isOpen?: boolean;
  onClose?: () => void;
  patient: any;
  evoluciones?: any;
  citas?: any;
  numeroBoleta?: any;
}

export function ReimbursementCertificate({
  isOpen,
  onClose,
  patient,
}: ReimbursementCertificateProps) {
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !patient?.id) return;

    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        // 1. Asistencias
        const { data: citasData } = await supabase
          .from('citas_atenciones')
          .select('fecha, hora, motivo_consulta')
          .eq('paciente_id', patient.id)
          .in('estado', ['asistio', 'atendido', 'completada', 'confirmada']) // Incluí confirmada por si acaso
          .order('fecha', { ascending: true });
        
        if (citasData) setAsistencias(citasData);

        // 2. Plan y Boleta
        const { data: planData } = await supabase
          .from('compras_planes')
          .select('nombre_plan, numero_boleta, monto_clp, metodo_pago, created_at')
          .eq('paciente_id', patient.id)
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        if (planData) setPlanInfo(planData);
      } catch (err) {
        console.error("Error cargando datos para certificado", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-4xl bg-white p-6 shadow-2xl rounded-2xl print:p-0 print:shadow-none print:rounded-none">
        
        {/* Controles del Modal (No se imprimen) */}
        <div className="flex items-center justify-between mb-4 border-b pb-4 print:hidden">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Generador de Certificado de Reembolso</h3>
            <p className="text-xs text-slate-500">Imprime el documento formal para presentar a Isapres/Seguros.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm font-semibold animate-pulse">
            Recolectando datos del paciente...
          </div>
        ) : (
          /* Contenido del Certificado */
          <div className="bg-white px-2 py-4 max-w-3xl mx-auto text-slate-900 font-serif print:w-full print:max-w-none">
            {/* Encabezado con Logo */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                {/* Logo Oficial Kiromov */}
                <img 
                  src="/logo.png" 
                  alt="Kiromov Centro Clínico" 
                  className="h-14 w-auto object-contain print:h-14"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/logo.png';
                  }}
                />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans leading-none">KIROMOV CENTRO CLÍNICO</h1>
                  <p className="text-xs text-slate-700 font-sans font-medium mt-1">Terapia Manual Ortopédica & Rehabilitación Funcional</p>
                  <p className="text-[11px] text-slate-500 font-sans">Bulnes 470, Of. 75 (Edificio Aranjuez) • Chillán, Región de Ñuble</p>
                </div>
              </div>

              <div className="text-right text-[11px] font-sans text-slate-600">
                <p className="font-semibold text-slate-800">Fecha de Emisión: {new Date().toLocaleDateString('es-CL')}</p>
                <p>contacto@kiromov.cl</p>
                <p>+56 9 8276 2103</p>
              </div>
            </div>

            {/* Título */}
            <div className="text-center my-6">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 inline-block pb-1 font-sans">
                Certificado de Asistencia y Tratamiento Kinésico
              </h2>
            </div>

            {/* Cuerpo del Certificado */}
            <div className="space-y-4 text-sm leading-relaxed text-slate-800 text-justify">
              <p>
                El kinesiólogo que suscribe, <strong>Klgo. Ignacio Cuevas Silva</strong>, certificado bajo el Registro de Prestadores Individuales de Salud <strong>SIS N° 396889</strong>, certifica que el/la paciente:
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans text-xs space-y-1.5 my-3 print:bg-white print:border-2">
                <p><strong>Paciente:</strong> {patient.nombre_completo}</p>
                <p><strong>Cédula de Identidad (RUT):</strong> {patient.rut || 'No especificado'}</p>
                <p><strong>Diagnóstico / Hipótesis Kinésica:</strong> {patient.diagnostico_principal || patient.motivo_consulta || 'Rehabilitación Musculoesquelética y TMO'}</p>
                <p><strong>Plan Adquirido:</strong> {planInfo?.nombre_plan || 'Tratamiento Kinésico Integral'}</p>
                <p><strong>Documento Tributario Asociado:</strong> {planInfo?.numero_boleta ? `Boleta Electrónica N° ${planInfo.numero_boleta}` : 'En trámite / Boleta por emitir'} — <strong>Monto:</strong> ${(planInfo?.monto_clp || 0).toLocaleString('es-CL')} CLP</p>
              </div>

              <p>
                Ha asistido y completado efectivamente las siguientes sesiones de atención presencial individual en este centro clínico:
              </p>
            </div>

            {/* Tabla de Sesiones Asistidas */}
            <div className="my-6">
              <table className="w-full text-left text-xs border border-slate-300 font-sans">
                <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700 print:bg-slate-200">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-12">N°</th>
                    <th className="p-2 border-r border-slate-300">Fecha de Atención</th>
                    <th className="p-2 border-r border-slate-300">Hora</th>
                    <th className="p-2 border-r border-slate-300">Prestación / Tratamiento</th>
                    <th className="p-2">Profesional Tratante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {asistencias && asistencias.length > 0 ? (
                    asistencias.map((asist, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-medium">{asist.fecha}</td>
                        <td className="p-2 border-r border-slate-200">{asist.hora ? asist.hora.slice(0, 5) : '10:00'} hrs</td>
                        <td className="p-2 border-r border-slate-200">Atención Kinésica + TMO</td>
                        <td className="p-2 text-slate-600">Klgo. Ignacio Cuevas Silva</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic font-sans">No registra sesiones completadas a la fecha.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sección de Cierre y Firma Profesional */}
            <div className="mt-14 pt-6 border-t border-slate-200 flex justify-between items-end break-inside-avoid">
              
              {/* Membrete legal institucional (Izquierda) */}
              <div className="text-[10px] text-slate-500 font-sans max-w-sm space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <img src="/logo.png" alt="Kiromov" className="h-6 w-auto opacity-80" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.png'; }} />
                  <span className="font-bold text-slate-700 text-xs tracking-wider">KIROMOV CENTRO CLÍNICO</span>
                </div>
                <p>Documento médico-legal emitido conforme a la Ley N° 20.584 y D.S. N° 41/2012 del MINSAL.</p>
                <p>Válido para trámites de reembolso en Isapres (Colmena, Banmédica, Consalud, CruzBlanca, Vida Tres), Fonasa y Seguros Complementarios de Salud.</p>
                <p className="font-mono text-slate-400">Bulnes 470, Of. 75, Chillán • Reg. Prestador Institucional SIS</p>
              </div>

              {/* Timbre y Firma del Profesional (Derecha) */}
              <div className="text-center font-sans">
                {/* Espacio para firma manuscrita / digital */}
                <div className="h-16 flex items-end justify-center mb-1">
                  <span className="text-[11px] text-slate-300 italic">Firma Profesional</span>
                </div>
                
                <div className="w-56 border-b-2 border-slate-900 mb-1.5 mx-auto" />
                
                {/* Membrete del Kinesiólogo Tratante */}
                <p className="font-bold text-xs text-slate-900 uppercase">Klgo. Ignacio Cuevas Silva</p>
                <p className="text-[11px] font-semibold text-blue-700">Magíster en Terapia Manual Ortopédica</p>
                <p className="text-[10px] text-slate-600">Universidad Andrés Bello</p>
                <p className="text-[11px] font-mono font-bold text-slate-800 mt-0.5">Registro SIS N° 396889</p>
                <p className="text-[10px] text-slate-500">Director Clínico — Kiromov Centro Clínico</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global CSS for Print Mode overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .fixed.inset-0.z-\[100\] {
            position: absolute !important;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
          }
          .fixed.inset-0.z-\[100\], .fixed.inset-0.z-\[100\] * {
            visibility: visible;
          }
        }
      `}} />
    </div>
  );
}

export default ReimbursementCertificate;
