'use client';

import React, { useState, useEffect } from 'react';
import { Printer, FileText, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getChileanDate, formatRut } from '@/lib/utils';

interface DischargeReportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  patient: any;
  soaps?: any[];
  citas?: any[];
}

export function DischargeReportModal({
  isOpen,
  onClose,
  patient,
  soaps,
  citas,
}: DischargeReportModalProps) {
  const [loading, setLoading] = useState(true);

  // Datos clínicos derivados / editables
  const [diagnosticoIngreso, setDiagnosticoIngreso] = useState('');
  const [dolorIngreso, setDolorIngreso] = useState<number>(7);
  const [dolorAlta, setDolorAlta] = useState<number>(0);
  const [totalSesiones, setTotalSesiones] = useState<number>(0);
  const [fechaIngreso, setFechaIngreso] = useState<string>('');
  const [fechaAlta, setFechaAlta] = useState<string>(() => getChileanDate());
  const [tecnicasAplicadas, setTecnicasAplicadas] = useState(
    'Manipulación de Alta Velocidad y Baja Amplitud (HVLA), Movilización Articular Grado III-IV de Kaltenborn/Maitland, Terapia de Tejidos Blandos e Inhibición Miofascial, Ejercicio Terapéutico Específico y Control Motor Lumbopélvico/Cervical.'
  );
  const [pautaDomiciliaria, setPautaDomiciliaria] = useState(
    'Programa de ejercicios domiciliarios de estabilización activa, reeducación postural ergonómica en puesto laboral, pausas activas cada 2 horas y mantención de caminata diaria de 30 minutos.'
  );
  const [condicionEgreso, setCondicionEgreso] = useState(
    'Alta Kinésica con Reintegro Funcional Completo. Paciente asintomático, sin restricciones en actividades de la vida diaria ni deportivas.'
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const logoSrc = "/branding/logo.png";
  const timbreSrc = "/branding/timbre.png";

  useEffect(() => {
    if (!isOpen || !patient?.id) return;

    const fetchClinicalData = async () => {
      setLoading(true);
      try {
        let soapList = soaps || [];
        let citasList = citas || [];

        // 1. Cargar SOAP si no vienen provistos
        if (!soaps && supabase) {
          const { data: soapData } = await supabase
            .from('evoluciones_soap')
            .select('*')
            .eq('paciente_id', patient.id)
            .order('fecha', { ascending: true });
          if (soapData) soapList = soapData;
        }

        // 2. Cargar Citas/Asistencias si no vienen provistas
        if (!citas && supabase) {
          const { data: citasData } = await supabase
            .from('citas_atenciones')
            .select('*')
            .eq('paciente_id', patient.id)
            .in('estado', ['asistio', 'asistió', 'atendido', 'completada'])
            .order('fecha', { ascending: true });
          if (citasData) citasList = citasData;
        }

        // 3. Cargar Evaluación Inicial TMO si existe
        let evalTmo: any = null;
        if (supabase) {
          const { data: evalData } = await supabase
            .from('evaluaciones_iniciales_tmo')
            .select('*')
            .eq('paciente_id', patient.id)
            .order('fecha_evaluacion', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (evalData) evalTmo = evalData;
        }

        // Diagnóstico
        const diag = evalTmo?.hipotesis_diagnostica_tmo ||
          patient.diagnostico_principal ||
          patient.diagnostico_medico ||
          patient.motivo_consulta ||
          'Disfunción Musculoesquelética y Síndrome Doloroso Lumbar/Cervical';
        setDiagnosticoIngreso(diag);

        // Conteo de sesiones
        const numSesiones = citasList.length > 0 ? citasList.length : (soapList.length > 0 ? soapList.length : 1);
        setTotalSesiones(numSesiones);

        // Fechas
        const primeraFecha = citasList[0]?.fecha || soapList[0]?.fecha || patient.created_at?.slice(0, 10) || getChileanDate();
        setFechaIngreso(primeraFecha);
        setFechaAlta(getChileanDate());

        // Dolor de ingreso (primer ENA registrado)
        let primerDolor = 7;
        if (evalTmo?.dolor_inicial_ena !== undefined && evalTmo?.dolor_inicial_ena !== null) {
          primerDolor = evalTmo.dolor_inicial_ena;
        } else if (soapList.length > 0) {
          const primerSoap = soapList[0];
          primerDolor = primerSoap.nivel_dolor_ena ?? primerSoap.ena_dolor ?? primerSoap.ena ?? 7;
        }
        setDolorIngreso(primerDolor);

        // Dolor al alta (último ENA registrado)
        let ultimoDolor = 0;
        if (soapList.length > 0) {
          const ultimoSoap = soapList[soapList.length - 1];
          ultimoDolor = ultimoSoap.nivel_dolor_ena ?? ultimoSoap.ena_dolor ?? ultimoSoap.ena ?? 0;
        }
        setDolorAlta(ultimoDolor);

      } catch (err) {
        console.error('Error cargando datos para informe de alta:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClinicalData();
  }, [isOpen, patient, soaps, citas]);

  // Función de Impresión Aislada (1 Hoja Carta sin fondos grises)
  const handleImprimir = () => {
    const contenido = document.getElementById('informe-alta-imprimible');
    if (!contenido) return;

    const clon = contenido.cloneNode(true) as HTMLElement;
    clon.querySelectorAll('.print-hide, button').forEach(el => el.remove());

    // Convertir inputs y textareas a texto plano
    clon.querySelectorAll('input, textarea').forEach(input => {
      const span = document.createElement('span');
      span.textContent = (input as HTMLInputElement | HTMLTextAreaElement).value;
      span.className = 'font-bold text-slate-900';
      if (input.parentNode) {
        input.parentNode.replaceChild(span, input);
      }
    });

    const ventanaImpresion = window.open('', '_blank', 'width=850,height=1000');
    if (!ventanaImpresion) {
      window.print();
      return;
    }

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <title>Informe de Alta Kinésica - Kiromov Centro Clínico</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: letter portrait;
              margin: 8mm 12mm 8mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-size: 11px;
              line-height: 1.35;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 5px 8px;
              text-align: left;
            }
            th {
              background-color: #f8fafc !important;
              font-weight: 700;
              color: #1e293b;
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div style="width: 100%; max-width: 750px; margin: 0 auto; background: white; padding: 10px 15px;">
            ${clon.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* Barra de Controles Superior Fija */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Informe de Alta Kinésica & Reintegro Funcional</h3>
              <p className="text-xs text-slate-500">Documento oficial de egreso médico-legal y evolución funcional</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar en PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg text-sm font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hoja de Alta Imprimible Centrada */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm font-semibold animate-pulse">
              Generando informe de alta médica...
            </div>
          ) : (
            <div
              id="informe-alta-imprimible"
              className="bg-white p-8 sm:p-10 max-w-3xl mx-auto shadow-sm border border-slate-200 font-sans text-slate-900 text-xs leading-relaxed"
            >
              {/* 1. Membrete Oficial */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
                <div className="flex items-center gap-4">
                  {logoSrc && (
                    <img 
                      src={logoSrc} 
                      alt="Kiromov Centro Clínico" 
                      className="h-14 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `${supabaseUrl}/storage/v1/object/public/branding/public%3Alogo.png`;
                      }}
                    />
                  )}
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none mb-1">
                      KIROMOV CENTRO CLÍNICO
                    </h1>
                    <p className="text-[11px] text-slate-700 font-medium">
                      Terapia Manual Ortopédica & Kinesiología Avanzada
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Bulnes 470, Of. 75 (Edificio Aranjuez) • Chillán, Región de Ñuble
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-600">
                  <p className="font-bold text-slate-800 text-xs">INFORME DE ALTA</p>
                  <p>Fecha emisión: {new Date().toLocaleDateString('es-CL')}</p>
                  <p>contacto@kiromov.cl • +56 9 8276 2103</p>
                </div>
              </div>

              {/* Título Central */}
              <div className="text-center my-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-300 inline-block pb-0.5">
                  CERTIFICADO DE ALTA KINÉSICA Y REINTEGRO FUNCIONAL
                </h2>
              </div>

              {/* Párrafo de Certificación */}
              <p className="text-justify text-[11px] mb-3">
                El profesional que suscribe, <strong>Klgo. Ignacio Cuevas Silva</strong>, Magíster en Terapia Manual Ortopédica (UNAB) y registrado en la Superintendencia de Salud bajo el N° <strong>396889</strong>, certifica que el/la paciente ha culminado satisfactoriamente su programa de rehabilitación kinésica especializada:
              </p>

              {/* 2. Datos del Paciente */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1.5 mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">Paciente:</span>{' '}
                    <strong className="text-slate-900">{patient.nombre_completo || patient.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">RUT:</span>{' '}
                    <strong className="text-slate-900 font-mono">{formatRut(patient.rut)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Previsión:</span>{' '}
                    <strong className="text-slate-900">{patient.prevision || patient.prevision_salud || 'Particular'}</strong>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <span className="text-slate-500 font-medium shrink-0">Diagnóstico de Ingreso:</span>
                  <input
                    type="text"
                    value={diagnosticoIngreso}
                    onChange={(e) => setDiagnosticoIngreso(e.target.value)}
                    className="w-full border-b border-dashed border-slate-300 p-0 bg-transparent text-[11px] font-bold text-slate-900 focus:ring-0 outline-none"
                  />
                </div>
              </div>

              {/* 3. Cuadro Comparativo de Evolución Funcional */}
              <div className="mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Cuadro Comparativo de Evolución y Respuesta Terapéutica
                </h3>
                
                <table className="w-full border border-slate-200 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-2 border border-slate-200">Parámetro Clínico</th>
                      <th className="p-2 border border-slate-200 text-center w-36">Estado de Ingreso</th>
                      <th className="p-2 border border-slate-200 text-center w-36 bg-emerald-50 text-emerald-900 font-bold">Estado al Alta</th>
                      <th className="p-2 border border-slate-200 text-center w-36">Variación / Logro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-200 font-semibold text-slate-800">
                        Intensidad del Dolor (Escala ENA 0-10)
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-rose-700">
                        <div className="flex items-center justify-center gap-1">
                          <span>ENA</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={dolorIngreso}
                            onChange={(e) => setDolorIngreso(Number(e.target.value))}
                            className="w-10 text-center border-b border-slate-300 bg-transparent font-bold text-rose-700"
                          />
                          <span>/ 10</span>
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/50">
                        <div className="flex items-center justify-center gap-1">
                          <span>ENA</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={dolorAlta}
                            onChange={(e) => setDolorAlta(Number(e.target.value))}
                            className="w-10 text-center border-b border-slate-300 bg-transparent font-bold text-emerald-700"
                          />
                          <span>/ 10</span>
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-emerald-700">
                        ↓ Reducción {Math.max(0, dolorIngreso - dolorAlta)} pts (Alivio 100%)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-semibold text-slate-800">
                        Sesiones Clínicas Completadas
                      </td>
                      <td className="p-2 border border-slate-200 text-center text-slate-600 font-medium">
                        Fecha: {fechaIngreso}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-slate-900 bg-emerald-50/50">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={totalSesiones}
                            onChange={(e) => setTotalSesiones(Number(e.target.value))}
                            className="w-10 text-center border-b border-slate-300 bg-transparent font-bold"
                          />
                          <span>sesiones totales</span>
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-semibold text-slate-700">
                        Fecha Alta: {fechaAlta}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-semibold text-slate-800">
                        Capacidad Funcional y Rango Articular
                      </td>
                      <td className="p-2 border border-slate-200 text-center text-slate-600">
                        Restricción moderada / dolor al movimiento
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-emerald-800 bg-emerald-50/50">
                        Rango completo sin dolor
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-semibold text-emerald-700">
                        ✓ Movilidad 100% Recuperada
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Técnicas de TMO Aplicadas */}
              <div className="mb-3 space-y-1">
                <span className="font-bold text-slate-800 text-[11px] block">
                  Resumen de Técnicas de TMO y Terapias Aplicadas:
                </span>
                <textarea
                  rows={2}
                  value={tecnicasAplicadas}
                  onChange={(e) => setTecnicasAplicadas(e.target.value)}
                  className="w-full text-[11px] p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-snug outline-none focus:border-blue-500"
                />
              </div>

              {/* Condición de Egreso y Pauta Domiciliaria */}
              <div className="mb-3 space-y-2">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="font-bold text-emerald-950 text-[11px] block mb-0.5">
                    Condición de Egreso:
                  </span>
                  <input
                    type="text"
                    value={condicionEgreso}
                    onChange={(e) => setCondicionEgreso(e.target.value)}
                    className="w-full bg-transparent border-b border-emerald-300 text-emerald-900 font-bold text-[11px] outline-none"
                  />
                </div>

                <div>
                  <span className="font-bold text-slate-800 text-[11px] block mb-0.5">
                    Pauta Domiciliaria y Autocuidado Asignado:
                  </span>
                  <textarea
                    rows={2}
                    value={pautaDomiciliaria}
                    onChange={(e) => setPautaDomiciliaria(e.target.value)}
                    className="w-full text-[11px] p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-snug outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 4. Timbre y Firma Oficial */}
              <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end break-inside-avoid">
                <div className="text-[10px] text-slate-500 font-sans max-w-xs space-y-0.5">
                  <p className="font-bold text-slate-700">KIROMOV CENTRO CLÍNICO</p>
                  <p>Documento médico-legal extendido para el paciente y médico tratante.</p>
                  <p>Certifica cumplimiento de objetivos del tratamiento kinésico.</p>
                </div>

                <div className="text-center font-sans">
                  {/* Timbre Clínico */}
                  <div className="h-16 flex items-center justify-center relative mb-1">
                    {timbreSrc && (
                      <img 
                        src={timbreSrc} 
                        alt="Timbre Profesional SIS N° 396889" 
                        className="absolute h-24 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `${supabaseUrl}/storage/v1/object/public/branding/public%3Atimbre.png`;
                        }}
                      />
                    )}
                  </div>

                  <div className="w-56 border-b-2 border-slate-900 mb-1 mx-auto relative z-10" />
                  <p className="font-bold text-xs text-slate-900 uppercase relative z-10">Klgo. Ignacio Cuevas Silva</p>
                  <p className="text-[11px] font-semibold text-blue-700 relative z-10">Magíster en Terapia Manual Ortopédica (UNAB)</p>
                  <p className="text-[10px] font-mono font-bold text-slate-800 mt-0.5 relative z-10">Registro SIS N° 396889</p>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default DischargeReportModal;
