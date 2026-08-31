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
  } | null;
  citasAsistidas?: Array<{
    fecha: string;
    estado: string;
  }>;
  citas?: Array<{
    fecha: string;
    estado: string;
  }>;
}

export function ClinicalCertificateDialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  patient,
  citasAsistidas,
  citas,
}: ClinicalCertificateDialogProps) {
  const isModalOpen = isOpen ?? open ?? false;
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const rawCitas = citasAsistidas || citas || [];

  const [diagnostico, setDiagnostico] = useState('Tratamiento Kinésico Integral y Terapia Manual Ortopédica (TMO)');
  const [codigoPrestacion, setCodigoPrestacion] = useState('Código Fonasa 06-01-105 (Kinesiterapia)');
  const [observacion, setObservacion] = useState('Paciente completa plan terapéutico con adecuada respuesta clínica y tolerancia funcional.');

  if (!isModalOpen || !patient) return null;

  // Filtrar solo fechas con estado 'Asistió' y formatear a DD/MM/AAAA
  const fechas = rawCitas
    .filter((c) => c.estado === 'Asistió')
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Certificado Kinésico - ${patient.nombre_completo}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 18mm 18mm 18mm 18mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .clinic-name {
            font-size: 20px;
            font-weight: 800;
            color: #0369a1;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .clinic-sub {
            font-size: 11.5px;
            color: #475569;
            margin-top: 3px;
            font-weight: 600;
          }
          .clinic-contact {
            font-size: 10.5px;
            color: #64748b;
            margin-top: 3px;
          }
          .doc-title {
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 18px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .patient-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 16px;
            font-size: 12.5px;
            line-height: 1.6;
          }
          .content {
            font-size: 13px;
            text-align: justify;
            margin-bottom: 14px;
            line-height: 1.6;
          }
          .dates-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .dates-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 14px;
          }
          .date-badge {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            color: #334155;
          }
          .date-location {
            text-align: right;
            font-size: 11.5px;
            color: #64748b;
            margin-top: 18px;
          }
          .signature-section {
            margin-top: 35px;
            text-align: center;
          }
          .sig-line {
            width: 250px;
            border-top: 1.5px solid #0f172a;
            margin: 0 auto 6px auto;
          }
          .sig-name {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }
          .sig-title {
            font-size: 11px;
            color: #475569;
          }
          .sig-reg {
            font-size: 10.5px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img 
            src="https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/public:logo.png" 
            alt="Kiromov Logo" 
            style="max-height: 55px; margin: 0 auto 10px auto; display: block;" 
          />
          <div class="clinic-name">KIROMOV CENTRO CLÍNICO</div>
          <div class="clinic-sub">Kinesiología Especializada & Terapia Manual Ortopédica</div>
          <div class="clinic-contact">Bulnes 470, Oficina 75 (7° Piso, Edificio Aranjuez), Chillán | Tel / WhatsApp: +56 9 3949 9906</div>
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
          ${fechas.map(f => `<span class="date-badge">${f}</span>`).join('')}
        </div>

        ${observacion ? `<div class="content"><strong>Observaciones Clínicas:</strong> ${observacion}</div>` : ''}

        <div class="date-location">
          Chillán, ${fechaHoy}
        </div>

        <div class="signature-section">
          <img 
            src="https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/public:timbre.png" 
            alt="Timbre Profesional Klgo. Ignacio Cuevas" 
            style="max-height: 85px; margin: 0 auto -25px auto; display: block; position: relative; z-index: 10;" 
          />
          <div class="sig-line"></div>
          <div class="sig-name">Klgo. Ignacio Cuevas Silva</div>
          <div class="sig-title">Kinesiólogo — Magíster en Terapia Manual Ortopédica (UNAB)</div>
          <div class="sig-reg">Registro Superintendencia de Salud (SIS) N° 396889</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
            disabled={totalSesiones === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Imprimir / Guardar PDF (1 pág)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClinicalCertificateDialog;
