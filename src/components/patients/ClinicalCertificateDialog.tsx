'use client';

import React, { useState } from 'react';

interface ClinicalCertificateDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  patient: {
    nombre_completo: string;
    rut?: string;
  };
  citasAsistidas?: Array<{
    fecha: string;
    estado: string;
  }>;
  citas?: Array<{
    fecha: string;
    estado: string;
  }>;
  evoluciones?: any[];
}

const LOGO_URL = "https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/public:logo.png";
const TIMBRE_URL = "https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/public:timbre.png";

export function ClinicalCertificateDialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  patient,
  citasAsistidas,
  citas,
}: ClinicalCertificateDialogProps) {
  const isDialogOpen = isOpen ?? open ?? false;

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const initialDiagnostico =
    (patient as any)?.diagnostico_medico ||
    (patient as any)?.diagnostico_principal ||
    'Tratamiento Kinésico Integral y Terapia Manual Ortopédica (TMO)';

  const [diagnostico, setDiagnostico] = useState(initialDiagnostico);
  const [codigoPrestacion, setCodigoPrestacion] = useState('Código Fonasa 06-01-105 (Kinesiterapia)');
  const [observacion, setObservacion] = useState('Paciente completa plan terapéutico con adecuada respuesta clínica y tolerancia funcional.');
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if ((patient as any)?.diagnostico_medico || (patient as any)?.diagnostico_principal) {
      setDiagnostico((patient as any).diagnostico_medico || (patient as any).diagnostico_principal);
    }
  }, [patient]);

  if (!isDialogOpen) return null;

  const citasList = citasAsistidas || citas || [];

  const fechas = citasList
    .filter((c) => c.estado === 'Asistió' || (c.estado as string) === 'Atendido')
    .map((c) => {
      const parts = c.fecha.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return c.fecha;
    });

  const totalSesiones = fechas.length;
  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = async () => {
    setIsGenerating(true);

    const preloadImage = (url: string) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(url);
        img.onerror = () => resolve(url);
        img.src = url;
      });
    };

    await Promise.all([preloadImage(LOGO_URL), preloadImage(TIMBRE_URL)]);

    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      setIsGenerating(false);
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Certificado Kinésico - ${patient.nombre_completo}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 15mm 18mm 15mm 18mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            background: #fff;
            padding: 0;
          }
          /* MEMBRETE A 2 COLUMNAS */
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 22px;
          }
          .logo-box {
            display: flex;
            align-items: center;
          }
          .logo-img {
            max-height: 72px;
            width: auto;
            object-fit: contain;
          }
          .clinic-info {
            text-align: right;
          }
          .clinic-name {
            font-size: 17px;
            font-weight: 900;
            color: #0369a1;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .clinic-sub {
            font-size: 11px;
            color: #475569;
            font-weight: 700;
            margin-top: 1px;
          }
          .clinic-contact {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
            line-height: 1.3;
          }
          .doc-title {
            text-align: center;
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 18px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .patient-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            font-size: 12.5px;
            line-height: 1.7;
          }
          .content {
            font-size: 13px;
            text-align: justify;
            margin-bottom: 16px;
            line-height: 1.75;
          }
          .dates-title {
            font-size: 11.5px;
            font-weight: 800;
            color: #334155;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .dates-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 16px;
          }
          .date-badge {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2.5px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }
          .date-location {
            text-align: right;
            font-size: 12px;
            color: #475569;
            font-weight: 600;
            margin-top: 15px;
          }
          /* FIRMA Y TIMBRE */
          .signature-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-top: 25px;
          }
          .signature-box {
            text-align: center;
            width: 290px;
            position: relative;
          }
          .timbre-container {
            height: 75px;
            position: relative;
            margin-bottom: -15px;
          }
          .timbre-img {
            max-height: 90px;
            width: auto;
            position: absolute;
            left: 50%;
            top: -10px;
            transform: translateX(-50%);
            z-index: 10;
            object-fit: contain;
          }
          .sig-line {
            width: 100%;
            border-top: 1.5px solid #0f172a;
            margin-bottom: 6px;
            position: relative;
            z-index: 5;
          }
          .sig-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
          }
          .sig-title {
            font-size: 11px;
            color: #475569;
            font-weight: 600;
          }
          .sig-reg {
            font-size: 10.5px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo-box">
            <img src="${LOGO_URL}" alt="Kiromov Logo" class="logo-img" />
          </div>
          <div class="clinic-info">
            <div class="clinic-name">KIROMOV CENTRO CLÍNICO</div>
            <div class="clinic-sub">Kinesiología & Terapia Manual Ortopédica</div>
            <div class="clinic-contact">
              Bulnes 470, Of. 75 (7° Piso, Edif. Aranjuez), Chillán<br>
              Tel / WhatsApp: +56 9 3949 9906 • contacto@kiromov.cl
            </div>
          </div>
        </div>

        <div class="doc-title">CERTIFICADO DE ASISTENCIA Y TRATAMIENTO KINÉSICO</div>

        <div class="patient-box">
          <div><strong>Paciente:</strong> ${patient.nombre_completo}</div>
          <div><strong>RUT:</strong> ${patient.rut || 'No registrado'}</div>
          <div><strong>Diagnóstico Kinésico:</strong> ${diagnostico}</div>
          <div><strong>Prestación / Código:</strong> ${codigoPrestacion}</div>
        </div>

        <div class="content">
          Por medio del presente documento, se certifica que el/la paciente individualizado(a) ha realizado su programa de atención kinésica y rehabilitación funcional en nuestras dependencias, completando un total de <strong>${totalSesiones} ${totalSesiones === 1 ? 'sesión presencial' : 'sesiones presenciales'}</strong>.
        </div>

        <div class="dates-title">Fechas de Atenciones Registradas (${totalSesiones}):</div>
        <div class="dates-grid">
          ${fechas.map((f) => `<span class="date-badge">${f}</span>`).join('')}
        </div>

        ${observacion ? `<div class="content"><strong>Observaciones Clínicas:</strong> ${observacion}</div>` : ''}

        <div class="date-location">
          Chillán, ${fechaHoy}
        </div>

        <div class="signature-wrapper">
          <div class="signature-box">
            <div class="timbre-container">
              <img src="${TIMBRE_URL}" alt="Timbre Profesional" class="timbre-img" />
            </div>
            <div class="sig-line"></div>
            <div class="sig-name">Klgo. Ignacio Cuevas Silva</div>
            <div class="sig-title">Kinesiólogo — Magíster en Terapia Manual Ortopédica (UNAB)</div>
            <div class="sig-reg">Registro Superintendencia de Salud (SIS) N° 396889</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Certificado de Reembolso Médico</h3>
            <p className="text-xs text-slate-500">{patient.nombre_completo} • {totalSesiones} sesiones registradas</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Diagnóstico Clínico</label>
            <input
              type="text"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Código Prestación / Fonasa / Isapre</label>
            <input
              type="text"
              value={codigoPrestacion}
              onChange={(e) => setCodigoPrestacion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Observaciones / Evolución Final</label>
            <textarea
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Sesiones que se incluirán ({totalSesiones}):</span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {fechas.length === 0 ? (
                <span className="text-xs text-amber-600">Este paciente no registra atenciones con estado 'Asistió'.</span>
              ) : (
                fechas.map((f, i) => (
                  <span key={i} className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">
                    {f}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={totalSesiones === 0 || isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>{isGenerating ? 'Preparando...' : 'Imprimir / Guardar PDF (1 pág)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClinicalCertificateDialog;
