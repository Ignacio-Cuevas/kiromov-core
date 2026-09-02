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

interface SesionImprimible {
  id: string;
  numero: number;
  fecha: string;
  hora: string;
  prestacion: string;
}

export function ReimbursementCertificate({
  isOpen,
  onClose,
  patient,
}: ReimbursementCertificateProps) {
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados Locales Editables
  const [sesionesCertificado, setSesionesCertificado] = useState<SesionImprimible[]>([]);
  const [boleta1, setBoleta1] = useState('');
  const [boleta2, setBoleta2] = useState('');
  const [diagnosticoEditable, setDiagnosticoEditable] = useState('');
  const [planNombreEditable, setPlanNombreEditable] = useState('');

  // Helper robusto para obtener URLs públicas de Supabase Storage
  const obtenerUrlAsset = (nombrePrimario: string, nombreSecundario: string) => {
    if (!supabase) return '';
    const url1 = supabase.storage.from('branding').getPublicUrl(nombrePrimario).data?.publicUrl;
    const url2 = supabase.storage.from('branding').getPublicUrl(nombreSecundario).data?.publicUrl;
    return url1 || url2 || '';
  };

  const logoUrl = obtenerUrlAsset('logo.png', 'public:logo.png');
  const timbreUrl = obtenerUrlAsset('timbre.png', 'public:timbre.png');

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
        
        if (citasData && citasData.length > 0) {
          setSesionesCertificado(
            citasData.map((a, idx) => ({
              id: `sesion-${idx + 1}`,
              numero: idx + 1,
              fecha: a.fecha,
              hora: a.hora?.slice(0, 5) || '16:00',
              prestacion: idx === 0 
                ? 'Evaluación Kinésica Integral + TMO' 
                : 'Tratamiento Kinésico y Terapia Manual Ortopédica'
            }))
          );
        } else {
          // Si no hay asistencias previas, generar 1 fila de ejemplo
          setSesionesCertificado([{
            id: 'sesion-1',
            numero: 1,
            fecha: new Date().toISOString().split('T')[0],
            hora: '16:00',
            prestacion: 'Evaluación Kinésica Integral + TMO'
          }]);
        }

        // 2. Plan y Boleta
        const { data: planData } = await supabase
          .from('compras_planes')
          .select('nombre_plan, numero_boleta, monto_clp, metodo_pago, created_at')
          .eq('paciente_id', patient.id)
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        if (planData) {
          setPlanInfo(planData);
          setPlanNombreEditable(planData.nombre_plan || 'Tratamiento Kinésico Integral');
          setBoleta2(planData.numero_boleta || '');
        } else {
          setPlanNombreEditable('Tratamiento Kinésico Integral');
        }

        setDiagnosticoEditable(patient.diagnostico_principal || patient.motivo_consulta || 'Rehabilitación Musculoesquelética y TMO');

      } catch (err) {
        console.error("Error cargando datos para certificado", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, patient]);

  // --- Funciones de Edición Local ---
  const handleAgregarSesion = () => {
    const ultimoNumero = sesionesCertificado.length;
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + ultimoNumero * 2);

    setSesionesCertificado(prev => [
      ...prev,
      {
        id: `sesion-${Date.now()}`,
        numero: ultimoNumero + 1,
        fecha: nuevaFecha.toISOString().split('T')[0],
        hora: '16:00',
        prestacion: 'Tratamiento Kinésico y Terapia Manual Ortopédica'
      }
    ]);
  };

  const handleEditarSesion = (id: string, campo: keyof SesionImprimible, valor: any) => {
    setSesionesCertificado(prev =>
      prev.map(s => (s.id === id ? { ...s, [campo]: valor } : s))
    );
  };

  const handleEliminarSesion = (id: string) => {
    setSesionesCertificado(prev => 
      prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, numero: idx + 1 }))
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* Barra de Controles Superior Fija (No se imprime) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Vista Previa: Certificado de Reembolso</h3>
            <p className="text-xs text-slate-500">Puedes editar fechas y boletas antes de imprimir (cambios locales)</p>
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
            <div id="documento-imprimible" className="bg-white p-8 sm:p-12 max-w-3xl mx-auto shadow-sm border border-slate-200 print:shadow-none print:border-none print:max-w-full font-serif text-slate-900">
              
              {/* Encabezado con Logo Oficial de Supabase */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt="Kiromov Centro Clínico" 
                      className="h-16 w-auto object-contain print:h-16"
                      crossOrigin="anonymous"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans leading-none mb-1">KIROMOV CENTRO CLÍNICO</h1>
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

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans text-xs space-y-2 my-3 print:bg-white print:border-2">
                  <p><strong>Paciente:</strong> {patient.nombre_completo}</p>
                  <p><strong>Cédula de Identidad (RUT):</strong> {patient.rut || 'No especificado'}</p>
                  
                  {/* Diagnóstico Editable */}
                  <div className="flex gap-1.5 items-center">
                    <strong className="shrink-0">Diagnóstico / Hipótesis Kinésica:</strong>
                    <input
                      type="text"
                      value={diagnosticoEditable}
                      onChange={(e) => setDiagnosticoEditable(e.target.value)}
                      className="w-full border-b border-dashed border-slate-300 p-0 bg-transparent text-xs text-slate-900 focus:ring-0 focus:border-blue-500 outline-none print:hidden"
                    />
                    <span className="hidden print:inline">{diagnosticoEditable}</span>
                  </div>

                  {/* Plan Editable */}
                  <div className="flex gap-1.5 items-center">
                    <strong className="shrink-0">Programa Adquirido:</strong>
                    <input
                      type="text"
                      value={planNombreEditable}
                      onChange={(e) => setPlanNombreEditable(e.target.value)}
                      className="w-full border-b border-dashed border-slate-300 p-0 bg-transparent text-xs text-slate-900 focus:ring-0 focus:border-blue-500 outline-none print:hidden"
                    />
                    <span className="hidden print:inline">{planNombreEditable}</span>
                  </div>

                  <p><strong>Monto Total Referencial del Tratamiento:</strong> ${(planInfo?.monto_clp || 0).toLocaleString('es-CL')} CLP</p>
                </div>

                <p>
                  Ha asistido y completado efectivamente las siguientes sesiones presenciales en este centro clínico, bajo evaluación constante y en conformidad a los protocolos terapéuticos:
                </p>
              </div>

              {/* Tabla de Sesiones Editable en Memoria */}
              <div className="my-6">
                <table className="w-full text-left text-[11px] sm:text-xs border border-slate-300 font-sans">
                  <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-800 print:bg-slate-200">
                    <tr>
                      <th className="p-2 border-r border-slate-300 text-center w-8">N°</th>
                      <th className="p-2 border-r border-slate-300 w-28">Fecha</th>
                      <th className="p-2 border-r border-slate-300 w-16">Hora</th>
                      <th className="p-2 border-r border-slate-300">Prestación / Tratamiento</th>
                      <th className="p-2 print:hidden w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sesionesCertificado.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600">{s.numero}</td>
                        
                        {/* Fecha */}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={s.fecha}
                            onChange={(e) => handleEditarSesion(s.id, 'fecha', e.target.value)}
                            className="w-full border-none p-0 bg-transparent text-[11px] sm:text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 rounded print:hidden"
                          />
                          <span className="hidden print:inline">{s.fecha}</span>
                        </td>

                        {/* Hora */}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="time"
                            value={s.hora}
                            onChange={(e) => handleEditarSesion(s.id, 'hora', e.target.value)}
                            className="w-full border-none p-0 bg-transparent text-[11px] sm:text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 rounded print:hidden"
                          />
                          <span className="hidden print:inline">{s.hora}</span>
                        </td>

                        {/* Prestación */}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={s.prestacion}
                            onChange={(e) => handleEditarSesion(s.id, 'prestacion', e.target.value)}
                            className="w-full border-none p-0 bg-transparent text-[11px] sm:text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 rounded print:hidden"
                          />
                          <span className="hidden print:inline">{s.prestacion}</span>
                        </td>

                        {/* Botón Borrar (No se imprime) */}
                        <td className="p-2 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleEliminarSesion(s.id)}
                            className="text-slate-400 hover:text-red-600 font-bold px-2 py-0.5"
                            title="Quitar sesión"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sesionesCertificado.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic font-sans">Ninguna sesión agregada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Botón para agregar sesión en pantalla (Oculto al imprimir) */}
                <div className="flex justify-end mt-2 print:hidden">
                  <button
                    type="button"
                    onClick={handleAgregarSesion}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                  >
                    + Agregar Fila (Para calzar orden médica)
                  </button>
                </div>
              </div>

              {/* Sección Doble Boleta y Cláusula */}
              <div className="my-6 space-y-2 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-2">
                <p className="font-semibold text-slate-800 mb-2">Documentos Tributarios Asociados a este Programa:</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-2">
                  <div className="flex-1 flex gap-2 items-center">
                    <span className="font-medium text-slate-600">Boleta Evaluación: N°</span>
                    <input
                      type="text"
                      placeholder="Ej: 1459"
                      value={boleta1}
                      onChange={(e) => setBoleta1(e.target.value)}
                      className="w-24 border-b border-slate-300 p-0 bg-transparent font-bold focus:ring-0 focus:border-blue-500 outline-none print:hidden text-center"
                    />
                    <span className="hidden print:inline font-bold border-b border-slate-800 min-w-[60px] text-center px-2">{boleta1 || '____'}</span>
                  </div>
                  <div className="flex-1 flex gap-2 items-center">
                    <span className="font-medium text-slate-600">Boleta Tratamiento: N°</span>
                    <input
                      type="text"
                      placeholder="Ej: 1460"
                      value={boleta2}
                      onChange={(e) => setBoleta2(e.target.value)}
                      className="w-24 border-b border-slate-300 p-0 bg-transparent font-bold focus:ring-0 focus:border-blue-500 outline-none print:hidden text-center"
                    />
                    <span className="hidden print:inline font-bold border-b border-slate-800 min-w-[60px] text-center px-2">{boleta2 || '____'}</span>
                  </div>
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-500 text-justify leading-tight italic border-t border-slate-200 pt-2 mt-2">
                  Nota Clínica: Se emiten documentos tributarios separados para la evaluación kinesiológica inicial y el tratamiento seriado subsecuente en correspondencia a los códigos Fonasa/Isapre. Este certificado agrupa ambas prestaciones en el mismo periodo clínico garantizando la continuidad terapéutica y la no duplicidad de cobro de sesiones.
                </p>
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
                        className="absolute h-28 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none mx-auto"
                        crossOrigin="anonymous"
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
        <style jsx global>{`
          @media print {
            /* 1. Ocultar fondo de pantalla y layouts */
            body * {
              visibility: hidden !important;
            }

            /* 2. Mostrar únicamente el certificado en la página 1 */
            #documento-imprimible,
            #documento-imprimible * {
              visibility: visible !important;
            }

            #documento-imprimible {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 8mm 12mm !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }

            /* Ajustes para inputs editables en impresion */
            #documento-imprimible input, #documento-imprimible textarea {
              border: none !important;
              background: transparent !important;
              resize: none !important;
            }

            @page {
              size: letter portrait;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default ReimbursementCertificate;
"""
with open('src/components/clinical/ReimbursementCertificate.tsx', 'w') as f:
    f.write(content)
print("Updated ReimbursementCertificate.tsx v3")
