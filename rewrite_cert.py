content = """'use client';

import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
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

  // Helper para obtener URLs públicas de Supabase Storage
  const getStorageAssetUrl = (fileName: string) => {
    if (!supabase) return '';
    const { data } = supabase.storage.from('branding').getPublicUrl(fileName);
    return data?.publicUrl || '';
  };

  const logoUrl = getStorageAssetUrl('logo.png');
  const timbreUrl = getStorageAssetUrl('timbre.png');

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
          .in('estado', ['asistio', 'atendido', 'completada', 'confirmada'])
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* Barra de Controles Superior Fija (No se imprime) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Vista Previa: Certificado de Reembolso</h3>
            <p className="text-xs text-slate-500">Documento médico oficial para Isapres y Seguros</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar en PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo Scrolleable con Hoja A4 / Carta Centrada */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-0 print:overflow-visible">
          
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm font-semibold animate-pulse print:hidden">
              Recolectando datos del paciente...
            </div>
          ) : (
            /* Hoja de Certificado Oficial */
            <div className="bg-white p-8 sm:p-12 max-w-3xl mx-auto shadow-sm border border-slate-200 print:shadow-none print:border-none print:max-w-full font-serif text-slate-900">
              
              {/* Encabezado con Logo Oficial de Supabase */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt="Kiromov Centro Clínico" 
                      className="h-16 w-auto object-contain print:h-16"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans leading-none">KIROMOV CENTRO CLÍNICO</h1>
                    <p className="text-xs text-slate-700 font-sans font-medium mt-1">Terapia Manual Ortopédica & Rehabilitación Funcional</p>
                    <p className="text-[11px] text-slate-500 font-sans">Bulnes 470, Of. 75 (Edificio Aranjuez) • Chillán, Región de Ñuble</p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-sans text-slate-600">
                  <p className="font-semibold text-slate-800">Fecha: {new Date().toLocaleDateString('es-CL')}</p>
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

              {/* Cierre: Membrete Legal y Firma con Timbre Oficial */}
              <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end break-inside-avoid">
                
                {/* Membrete legal */}
                <div className="text-[10px] text-slate-500 font-sans max-w-xs space-y-1">
                  <p className="font-bold text-slate-700 text-xs">KIROMOV CENTRO CLÍNICO</p>
                  <p>Documento médico-legal emitido conforme a la Ley N° 20.584 y D.S. N° 41/2012 del MINSAL.</p>
                  <p>Válido para trámites de reembolso en Isapres, Fonasa y Seguros de Salud Complementarios.</p>
                </div>

                {/* Timbre y Firma Profesional */}
                <div className="text-center font-sans">
                  {/* Imagen del Timbre Clínico desde Supabase */}
                  <div className="h-20 flex items-center justify-center mb-1 relative">
                    {timbreUrl ? (
                      <img 
                        src={timbreUrl} 
                        alt="Timbre Profesional SIS N° 396889" 
                        className="absolute h-24 w-auto object-contain mix-blend-multiply opacity-90 -top-2"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-300 italic">Firma y Timbre</span>
                    )}
                  </div>

                  <div className="w-56 border-b-2 border-slate-900 mb-1 mx-auto relative z-10" />
                  
                  <p className="font-bold text-xs text-slate-900 uppercase relative z-10">Klgo. Ignacio Cuevas Silva</p>
                  <p className="text-[11px] font-semibold text-blue-700 relative z-10">Magíster en Terapia Manual Ortopédica</p>
                  <p className="text-[10px] text-slate-600 relative z-10">Universidad Andrés Bello</p>
                  <p className="text-[11px] font-mono font-bold text-slate-800 mt-0.5 relative z-10">Registro SIS N° 396889</p>
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
            /* Make the fixed wrapper position relative and visible */
            .fixed.inset-0.z-50 {
              position: absolute !important;
              left: 0;
              top: 0;
              margin: 0;
              padding: 0;
              background: transparent !important;
            }
            .fixed.inset-0.z-50, .fixed.inset-0.z-50 * {
              visibility: visible;
            }
            /* Hide the grey background wrapper */
            .bg-slate-100 {
              background: transparent !important;
            }
            /* Hide the preview padding */
            .p-4.sm\\:p-8 {
              padding: 0 !important;
            }
          }
        `}} />
      </div>
    </div>
  );
}

export default ReimbursementCertificate;
"""
with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)
