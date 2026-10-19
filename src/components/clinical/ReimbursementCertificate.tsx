'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getChileanDate } from '@/lib/utils';

export interface ReimbursementCertificateProps {
  isOpen?: boolean;
  onClose?: () => void;
  patient: any;
  evoluciones?: any;
  citas?: any;
  numeroBoleta?: any;
  planActivo?: any;
}

export interface SesionImprimible {
  id: string;
  numero: number;
  fecha: string;
  hora: string;
  prestacion: string;
  valorUnitario: number;
}

function parseMonto(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9]/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

function formatMonedaCLP(num: number): string {
  return `$${Number(num || 0).toLocaleString('es-CL')} CLP`;
}

export function ReimbursementCertificate({
  isOpen,
  onClose,
  patient,
  numeroBoleta,
  planActivo,
}: ReimbursementCertificateProps) {
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados Locales Editables
  const [sesionesCertificado, setSesionesCertificado] = useState<SesionImprimible[]>([]);
  const [boleta1, setBoleta1] = useState(() => numeroBoleta || planActivo?.numero_boleta || '');
  const [boleta2, setBoleta2] = useState('');
  const [montoReferencial, setMontoReferencial] = useState<string>(() => {
    const montoNum = planActivo?.valor_total || planActivo?.monto_clp || 75000;
    return formatMonedaCLP(montoNum);
  });
  const [medicoDerivador, setMedicoDerivador] = useState('');
  const [diagnosticoEditable, setDiagnosticoEditable] = useState('');
  const [planNombreEditable, setPlanNombreEditable] = useState('');

  // Control de edición en celda de Valor Unitario
  const [editingUnitarioId, setEditingUnitarioId] = useState<string | null>(null);
  const [unitarioInputText, setUnitarioInputText] = useState<string>('');

  // Total acumulado sincronizado en tiempo real
  const montoTotalCalculado = useMemo(() => {
    return sesionesCertificado.reduce((acc, s) => acc + (s.valorUnitario || 0), 0);
  }, [sesionesCertificado]);

  // Helper de URL de imágenes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const logoSrc = "/branding/logo.png";
  const timbreSrc = "/branding/timbre.png";

  useEffect(() => {
    if (!isOpen || !patient?.id) return;

    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        // 1. Diagnóstico CIE-10 / Hipótesis Kinésica
        const { data: evalData } = await supabase
          .from('evaluaciones_iniciales_tmo')
          .select('cie10_codigo, cie10_glosa, diagnostico_tmo')
          .eq('paciente_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let diagStr = patient.diagnostico_principal || patient.motivo_consulta || 'Rehabilitación Musculoesquelética y TMO';
        let codigoStr = '';
        if (evalData) {
           diagStr = evalData.cie10_glosa || evalData.diagnostico_tmo || diagStr;
           codigoStr = evalData.cie10_codigo ? `(${evalData.cie10_codigo})` : '';
           setDiagnosticoEditable(`${diagStr} ${codigoStr}`.trim());
        } else {
           setDiagnosticoEditable(diagStr);
        }

        // 2. Plan contratado (determina valor total y nombre del plan)
        const { data: planData } = await supabase
          .from('compras_planes')
          .select('nombre_plan, numero_boleta, valor_total, metodo_pago, created_at')
          .eq('paciente_id', patient.id)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        const montoTotalInicial = planData?.valor_total || planActivo?.valor_total || planActivo?.monto_clp || 75000;
        setMontoReferencial(formatMonedaCLP(montoTotalInicial));

        if (planData) {
          setPlanInfo(planData);
          setPlanNombreEditable(planData.nombre_plan || 'Tratamiento Kinésico Integral');
        } else {
          setPlanNombreEditable('Tratamiento Kinésico Integral');
        }

        // 3. Asistencias para la tabla de atenciones
        const { data: citasData } = await supabase
          .from('citas_atenciones')
          .select('fecha, hora, motivo_consulta')
          .eq('paciente_id', patient.id)
          .in('estado', ['asistio', 'atendido', 'completada', 'confirmada'])
          .order('fecha', { ascending: true });
        
        if (citasData && citasData.length > 0) {
          const valorUnitarioBase = Math.round(montoTotalInicial / citasData.length);
          setSesionesCertificado(
            citasData.map((a, idx) => ({
              id: `sesion-${idx + 1}`,
              numero: idx + 1,
              fecha: a.fecha,
              hora: a.hora?.slice(0, 5) || '16:00',
              prestacion: 'Atención Kinesiológica Integral Ambulatoria (Código Fonasa 06-01-105)',
              valorUnitario: valorUnitarioBase,
            }))
          );
        } else {
          // Si no hay asistencias previas, generar 1 fila inicial
          setSesionesCertificado([{
            id: 'sesion-1',
            numero: 1,
            fecha: getChileanDate(),
            hora: '16:00',
            prestacion: 'Atención Kinesiológica Integral Ambulatoria (Código Fonasa 06-01-105)',
            valorUnitario: montoTotalInicial,
          }]);
        }

        // 4. Pagos del paciente para autocompletar boleta
        const { data: pagosData } = await supabase
          .from('pagos_pacientes')
          .select('id, fecha, monto, metodo_pago, numero_boleta')
          .eq('paciente_id', patient.id)
          .order('fecha', { ascending: false });

        const boletaSugerida = pagosData?.find((p: any) => p.numero_boleta || p.n_boleta)?.numero_boleta || '';

        // Asignar boleta sugerida del último pago o del plan
        const boletaFinal1 = boletaSugerida || planData?.numero_boleta || numeroBoleta || planActivo?.numero_boleta || '';
        if (boletaFinal1) {
          setBoleta1(boletaFinal1);
        }

        // Asignar segunda boleta si hay otro pago o el plan tiene otra boleta
        const pagosConBoletaAdicional = (pagosData || []).filter(
          (p: any) => (p.numero_boleta || (p as any).n_boleta) && (p.numero_boleta || (p as any).n_boleta) !== boletaFinal1
        );
        const boletaFinal2 = pagosConBoletaAdicional.length > 0
          ? (pagosConBoletaAdicional[0].numero_boleta || (pagosConBoletaAdicional[0] as any).n_boleta)
          : (planData?.numero_boleta && planData.numero_boleta !== boletaFinal1 ? planData.numero_boleta : '');
        if (boletaFinal2) {
          setBoleta2(boletaFinal2);
        }

      } catch (err) {
        console.error("Error cargando datos para certificado", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, patient, planActivo, numeroBoleta]);

  // --- Funciones de Prorrateo y Edición Bidireccional ---
  const handleMontoTotalChange = (nuevoTexto: string) => {
    setMontoReferencial(nuevoTexto);
    const nuevoTotal = parseMonto(nuevoTexto);
    if (sesionesCertificado.length > 0) {
      const unitarioBase = Math.round(nuevoTotal / sesionesCertificado.length);
      setSesionesCertificado(prev =>
        prev.map(s => ({
          ...s,
          valorUnitario: unitarioBase
        }))
      );
    }
  };

  const handleMontoTotalBlur = () => {
    const total = parseMonto(montoReferencial);
    setMontoReferencial(formatMonedaCLP(total));
  };

  const handleEditarSesionValorUnitario = (id: string, nuevoUnitario: number) => {
    setSesionesCertificado(prev => {
      const updated = prev.map(s => (s.id === id ? { ...s, valorUnitario: nuevoUnitario } : s));
      const nuevoTotal = updated.reduce((acc, s) => acc + (s.valorUnitario || 0), 0);
      setMontoReferencial(formatMonedaCLP(nuevoTotal));
      return updated;
    });
  };

  const handleAgregarSesion = () => {
    const ultimoNumero = sesionesCertificado.length;
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + ultimoNumero * 2);

    const fechaStr = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(nuevaFecha).split('-').reverse().join('-');

    const montoTotalNum = parseMonto(montoReferencial);
    const nuevoTotalSesiones = ultimoNumero + 1;
    const nuevoValorUnitario = nuevoTotalSesiones > 0 ? Math.round(montoTotalNum / nuevoTotalSesiones) : 0;

    setSesionesCertificado(prev => [
      ...prev.map(s => ({ ...s, valorUnitario: nuevoValorUnitario })),
      {
        id: `sesion-${Date.now()}`,
        numero: nuevoTotalSesiones,
        fecha: fechaStr,
        hora: '16:00',
        prestacion: 'Atención Kinesiológica Integral Ambulatoria (Código Fonasa 06-01-105)',
        valorUnitario: nuevoValorUnitario
      }
    ]);
  };

  const handleEditarSesion = (id: string, campo: keyof SesionImprimible, valor: any) => {
    setSesionesCertificado(prev =>
      prev.map(s => (s.id === id ? { ...s, [campo]: valor } : s))
    );
  };

  const handleEliminarSesion = (id: string) => {
    setSesionesCertificado(prev => {
      const filtradas = prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, numero: idx + 1 }));
      const nuevoTotal = filtradas.reduce((acc, s) => acc + (s.valorUnitario || 0), 0);
      setMontoReferencial(formatMonedaCLP(nuevoTotal));
      return filtradas;
    });
  };

  // --- Función de Impresión Aislada con Preservación de Colores ---
  const handleImprimir = () => {
    const contenido = document.getElementById('documento-imprimible');
    if (!contenido) return;

    setEditingUnitarioId(null);

    // Clonar el contenido y remover los elementos no imprimibles (botones de edición, inputs auxiliares)
    const clon = contenido.cloneNode(true) as HTMLElement;
    clon.querySelectorAll('.print-hide, .print\\:hidden, button').forEach(el => el.remove());

    // Mostrar spans de impresión que estaban ocultos con print:block
    clon.querySelectorAll('.hidden.print\\:block, [class*="hidden print:block"]').forEach(el => {
      el.classList.remove('hidden');
      (el as HTMLElement).style.display = 'block';
    });

    // Convertir cualquier textarea remanente a span
    clon.querySelectorAll('textarea').forEach(ta => {
      const span = document.createElement('span');
      span.textContent = (ta as HTMLTextAreaElement).value;
      span.className = 'text-xs sm:text-sm text-slate-900 leading-snug break-words whitespace-normal block';
      if (ta.parentNode) {
        ta.parentNode.replaceChild(span, ta);
      }
    });

    // Convertir los inputs a texto plano para impresión nítida
    clon.querySelectorAll('input').forEach(input => {
      const span = document.createElement('span');
      const isValor = input.getAttribute('data-field') === 'valor-unitario';
      const valText = isValor
        ? (input.getAttribute('data-formatted') || input.value)
        : input.value;
      span.textContent = valText;

      const isCentered = input.classList.contains('text-center');
      const isRight = input.classList.contains('text-right');
      if (isRight) {
        span.className = 'font-bold font-mono text-slate-900 text-xs text-right block w-full tabular-nums';
        span.style.textAlign = 'right';
        span.style.display = 'block';
        span.style.width = '100%';
      } else if (isCentered) {
        span.className = 'font-bold text-slate-800 text-xs text-center min-w-[60px] inline-block';
        span.style.textAlign = 'center';
      } else {
        span.className = 'font-medium text-slate-800 text-xs inline-block';
      }

      if (input.parentNode) {
        input.parentNode.replaceChild(span, input);
      }
    });

    // Abrir ventana limpia de impresión
    const ventanaImpresion = window.open('', '_blank', 'width=900,height=1000');
    if (!ventanaImpresion) {
      window.print(); // Fallback si el navegador bloquea popups
      return;
    }

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <title>Certificado de Asistencia y Tratamiento Kinésico - Kiromov</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: letter portrait;
              margin: 10mm 15mm 10mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background: #ffffff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              font-size: 11px;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            thead th {
              background-color: #0f172a !important;
              color: #ffffff !important;
              font-weight: 600 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            tfoot tr td {
              background-color: #f1f5f9 !important;
              font-weight: 700 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .break-words { word-break: break-word !important; }
            .whitespace-normal { white-space: normal !important; }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div style="width: 100%; max-width: 820px; margin: 0 auto; background: white; padding: 20px;">
            ${clon.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full w-[95vw] lg:max-w-5xl max-h-[94vh] flex flex-col bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* Barra de Controles Superior Fija (No se imprime) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Vista Previa: Certificado de Reembolso</h3>
            <p className="text-xs text-slate-500">Puedes editar montos unitarios, prestaciones, fechas y boletas antes de imprimir</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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

        {/* Cuerpo Scrolleable con Hoja A4 / Carta Centrada */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
          
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm font-semibold animate-pulse">
              Recolectando datos del paciente...
            </div>
          ) : (
            /* Hoja de Certificado Oficial */
            <div id="documento-imprimible" className="bg-white p-6 sm:p-10 max-w-4xl w-full mx-auto shadow-sm border border-slate-200 font-serif text-slate-900">
              
              {/* Encabezado con Logo Oficial */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  {logoSrc && (
                    <img 
                      src={logoSrc} 
                      alt="Kiromov Centro Clínico" 
                      className="h-16 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `${supabaseUrl}/storage/v1/object/public/branding/public%3Alogo.png`;
                      }}
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
                  <p className="text-xs text-slate-600">
                    ignacio@kiromov.cl · +56 9 3949 9906
                  </p>
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

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans text-xs space-y-2 my-3">
                  <p><strong>Paciente:</strong> {patient.nombre_completo}</p>
                  <p><strong>Cédula de Identidad (RUT):</strong> {patient.rut || 'No especificado'}</p>
                  
                  {/* Diagnóstico Editable */}
                  <div className="flex gap-1.5 items-center">
                    <strong className="shrink-0">Diagnóstico / Hipótesis Kinésica:</strong>
                    <input
                      type="text"
                      value={diagnosticoEditable}
                      onChange={(e) => setDiagnosticoEditable(e.target.value)}
                      className="w-full border-b border-dashed border-slate-300 p-0 bg-transparent text-xs text-slate-900 focus:ring-0 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Plan Editable */}
                  <div className="flex gap-1.5 items-center">
                    <strong className="shrink-0">Programa Adquirido:</strong>
                    <input
                      type="text"
                      value={planNombreEditable}
                      onChange={(e) => setPlanNombreEditable(e.target.value)}
                      className="w-full border-b border-dashed border-slate-300 p-0 bg-transparent text-xs text-slate-900 focus:ring-0 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Monto Total Referencial con Prorrateo Automático */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-800">
                    <span className="font-semibold text-slate-900 shrink-0">
                      Monto Total Referencial del Tratamiento:
                    </span>
                    <input
                      type="text"
                      value={montoReferencial}
                      onChange={(e) => handleMontoTotalChange(e.target.value)}
                      onBlur={handleMontoTotalBlur}
                      className="flex-1 px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:outline-none print:border-none print:p-0 print:text-black tabular-nums"
                      title="Haz clic para editar el monto total referencial; se prorrateará automáticamente en las sesiones"
                    />
                  </div>
                </div>

                <p>
                  Ha asistido y completado efectivamente las siguientes sesiones presenciales en este centro clínico, bajo evaluación constante y en conformidad a los protocolos terapéuticos:
                </p>
              </div>

              {/* Tabla de Sesiones Editable con Valor Unitario y Total */}
              <div className="my-6">
                <table className="w-full text-left text-[11px] sm:text-xs border border-slate-300 font-sans">
                  {/* Encabezado: Fondo Azul Marino Oscuro Institucional (#0f172a) con Texto Blanco en Negrita */}
                  <thead
                    className="bg-[#0f172a] text-white font-semibold text-xs sm:text-sm tracking-wide border-b border-slate-900"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  >
                    <tr>
                      <th
                        className="p-2.5 border-r border-slate-800 text-center w-10 shrink-0"
                        style={{ width: '40px', textAlign: 'center', backgroundColor: '#0f172a', color: '#ffffff' }}
                      >
                        N°
                      </th>
                      <th
                        className="p-2.5 border-r border-slate-800 text-center w-28 shrink-0"
                        style={{ width: '110px', textAlign: 'center', backgroundColor: '#0f172a', color: '#ffffff' }}
                      >
                        Fecha
                      </th>
                      <th
                        className="p-2.5 border-r border-slate-800 text-center w-24 shrink-0"
                        style={{ width: '90px', textAlign: 'center', backgroundColor: '#0f172a', color: '#ffffff' }}
                      >
                        Hora
                      </th>
                      <th
                        className="p-2.5 border-r border-slate-800 text-left w-auto min-w-[340px] whitespace-normal break-words"
                        style={{ minWidth: '340px', textAlign: 'left', backgroundColor: '#0f172a', color: '#ffffff' }}
                      >
                        Prestación / Tratamiento
                      </th>
                      <th
                        className="p-2.5 border-r border-slate-800 text-right w-32 shrink-0"
                        style={{ width: '130px', textAlign: 'right', backgroundColor: '#0f172a', color: '#ffffff' }}
                      >
                        Valor Unitario
                      </th>
                      <th
                        className="p-2.5 print-hide print:hidden w-8 text-center border-none shrink-0"
                        style={{ width: '32px', backgroundColor: '#0f172a', color: '#ffffff' }}
                      ></th>
                    </tr>
                  </thead>

                  {/* Cuerpo de la Tabla */}
                  <tbody className="divide-y divide-slate-200">
                    {sesionesCertificado.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                        {/* 1. N° */}
                        <td
                          className="p-2 border-r border-slate-200 text-center font-bold text-slate-700 tabular-nums w-10 align-top pt-2.5"
                          style={{ width: '40px', textAlign: 'center' }}
                        >
                          {s.numero}
                        </td>
                        
                        {/* 2. Fecha */}
                        <td
                          className="p-2 border-r border-slate-200 text-center tabular-nums w-28 align-top pt-2.5"
                          style={{ width: '110px', textAlign: 'center' }}
                        >
                          <input
                            type="date"
                            value={s.fecha}
                            onChange={(e) => handleEditarSesion(s.id, 'fecha', e.target.value)}
                            className="w-full border-none p-0 bg-transparent text-[11px] sm:text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 rounded text-center font-medium tabular-nums"
                          />
                        </td>

                        {/* 3. Hora */}
                        <td
                          className="p-2 border-r border-slate-200 text-center tabular-nums w-24 align-top pt-2.5"
                          style={{ width: '90px', textAlign: 'center' }}
                        >
                          <input
                            type="time"
                            value={s.hora}
                            onChange={(e) => handleEditarSesion(s.id, 'hora', e.target.value)}
                            className="w-full border-none p-0 bg-transparent text-[11px] sm:text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 rounded text-center font-medium tabular-nums"
                          />
                        </td>

                        {/* 4. Prestación / Tratamiento (Multilínea con Textarea) */}
                        <td className="p-2 border-r border-slate-200 text-left w-auto min-w-[340px] whitespace-normal break-words align-top">
                          <textarea
                            rows={2}
                            value={s.prestacion}
                            onChange={(e) => handleEditarSesion(s.id, 'prestacion', e.target.value)}
                            className="w-full text-xs sm:text-sm bg-transparent border-0 hover:bg-slate-100/70 focus:bg-white focus:ring-1 focus:ring-slate-400 rounded px-1.5 py-1 leading-snug resize-none overflow-hidden text-slate-800 font-normal transition-colors print:hidden"
                          />
                          {/* Renderizado exclusivo para impresión limpia sin cajas de formulario */}
                          <span className="hidden print:block text-xs sm:text-sm text-slate-900 leading-snug break-words">
                            {s.prestacion}
                          </span>
                        </td>

                        {/* 5. Valor Unitario Editable */}
                        <td
                          className="p-2 border-r border-slate-200 text-right tabular-nums w-32 align-top pt-2.5"
                          style={{ width: '130px', textAlign: 'right' }}
                        >
                          <input
                            type="text"
                            data-field="valor-unitario"
                            data-formatted={formatMonedaCLP(s.valorUnitario)}
                            value={editingUnitarioId === s.id ? unitarioInputText : formatMonedaCLP(s.valorUnitario)}
                            onFocus={() => {
                              setEditingUnitarioId(s.id);
                              setUnitarioInputText(s.valorUnitario ? String(s.valorUnitario) : '');
                            }}
                            onChange={(e) => {
                              setUnitarioInputText(e.target.value);
                              const valNum = parseMonto(e.target.value);
                              handleEditarSesionValorUnitario(s.id, valNum);
                            }}
                            onBlur={() => {
                              setEditingUnitarioId(null);
                            }}
                            className="w-full border-none p-0 bg-transparent text-[11px] sm:text-xs text-slate-900 font-bold font-mono text-right focus:ring-1 focus:ring-blue-500 rounded tabular-nums"
                            title="Haz clic para editar el valor unitario de esta sesión"
                          />
                        </td>

                        {/* Botón Borrar (No se imprime) */}
                        <td className="p-2 text-center print-hide print:hidden w-8 align-top pt-2.5" style={{ width: '32px' }}>
                          <button
                            type="button"
                            onClick={() => handleEliminarSesion(s.id)}
                            className="text-slate-400 hover:text-red-600 font-bold px-2 py-0.5 cursor-pointer"
                            title="Quitar sesión"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sesionesCertificado.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 italic font-sans">Ninguna sesión agregada.</td>
                      </tr>
                    )}
                  </tbody>

                  {/* Fila de Cierre / Pie de Tabla (tfoot): Fondo Tenue Distintivo (#f1f5f9) */}
                  <tfoot
                    className="bg-slate-50 border-t-2 border-slate-300 font-sans"
                    style={{ backgroundColor: '#f1f5f9' }}
                  >
                    <tr>
                      <td
                        colSpan={4}
                        className="p-2.5 text-right font-bold text-slate-800 border-r border-slate-200 text-xs sm:text-sm whitespace-normal"
                        style={{ textAlign: 'right', backgroundColor: '#f1f5f9' }}
                      >
                        Total Tratamiento ({sesionesCertificado.length} Sesiones):
                      </td>
                      <td
                        className="p-2.5 text-right font-bold font-mono text-slate-900 border-r border-slate-200 tabular-nums whitespace-nowrap text-xs sm:text-sm w-32"
                        style={{ width: '130px', textAlign: 'right', backgroundColor: '#f1f5f9' }}
                      >
                        {formatMonedaCLP(montoTotalCalculado)}
                      </td>
                      <td className="p-2 print-hide print:hidden border-none w-8" style={{ width: '32px', backgroundColor: '#f1f5f9' }}></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Botón para agregar sesión en pantalla (Oculto al imprimir) */}
                <div className="flex justify-end mt-2 print-hide">
                  <button
                    type="button"
                    onClick={handleAgregarSesion}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                  >
                    + Agregar Fila (Para calzar orden médica)
                  </button>
                </div>
              </div>

              {/* Sección Doble Boleta y Cláusula */}
              <div className="my-6 space-y-2 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-800 mb-2">Documentos Tributarios Asociados a este Programa:</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-2">
                  <div className="flex-1 flex gap-2 items-center">
                    <span>Boleta: N°</span>
                    <input
                      type="text"
                      placeholder="Ej: 1459"
                      value={boleta1}
                      onChange={(e) => setBoleta1(e.target.value)}
                      className="w-24 border-b border-slate-300 p-0 bg-transparent font-bold focus:ring-0 focus:border-blue-500 outline-none text-center"
                    />
                  </div>
                  <div className="flex-1 flex gap-2 items-center">
                    <span className="font-medium text-slate-600">N° Adicional: N°</span>
                    <input
                      type="text"
                      placeholder="Ej: 1460"
                      value={boleta2}
                      onChange={(e) => setBoleta2(e.target.value)}
                      className="w-24 border-b border-slate-300 p-0 bg-transparent font-bold focus:ring-0 focus:border-blue-500 outline-none text-center"
                    />
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
                  {/* Imagen del Timbre Clínico */}
                  <div className="h-20 flex items-center justify-center mb-1 relative">
                    {timbreSrc && (
                      <img 
                        src={timbreSrc} 
                        alt="Timbre Profesional SIS N° 396889" 
                        className="absolute h-28 w-auto object-contain mix-blend-multiply opacity-90 -top-4 pointer-events-none mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `${supabaseUrl}/storage/v1/object/public/branding/public%3Atimbre.png`;
                        }}
                      />
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
      </div>
    </div>
  );
}

export default ReimbursementCertificate;
