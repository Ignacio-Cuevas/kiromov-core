import React, { useState } from 'react';
import { Dialog, DialogBody, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageCircle, X } from 'lucide-react';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  paciente: any;
  evoluciones: any[];
  citasAsistidas: number;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  isOpen,
  onClose,
  paciente,
  evoluciones,
  citasAsistidas
}) => {
  // Calculos de Fechas y Evolución
  const fechaInicio = evoluciones.length > 0 ? evoluciones[evoluciones.length - 1]?.fecha : null;
  const fechaAlta = evoluciones.length > 0 ? evoluciones[0]?.fecha : new Date().toISOString().split('T')[0];
  
  const dolorInicial = evoluciones.length > 0 ? Number(evoluciones[evoluciones.length - 1]?.nivel_dolor_ena) : 0;
  const dolorFinal = evoluciones.length > 0 ? Number(evoluciones[0]?.nivel_dolor_ena) : 0;
  
  const mejoraAbsoluta = dolorInicial - dolorFinal;
  const porcentajeMejora = dolorInicial > 0 ? Math.round((mejoraAbsoluta / dolorInicial) * 100) : 0;

  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState('Deslizamiento Neural Ciático');

  const pautas = {
    'Deslizamiento Neural Ciático': {
      objetivo: 'Mejorar el deslizamiento del nervio ciático y reducir la mecanosensibilidad neural.',
      dosificacion: '3 series de 10-15 repeticiones (lentas y suaves)',
      puntos: ['Mantener la columna neutra.', 'El movimiento debe ser fluido, como un hilo que tiran de ambos lados.', 'No llegar a rango de dolor máximo (solo sentir tirantez leve).'],
      videoId: 'Kz1k1X4N1yA' // Ejemplo
    },
    'Control Motor Cervical': {
      objetivo: 'Activar estabilizadores profundos del cuello y reducir hipertonía.',
      dosificacion: '4 series de 10 segundos de contracción isométrica',
      puntos: ['Realizar un movimiento de "doble mentón" muy sutil.', 'No generar fuerza bruta, solo control.', 'Respiración fluida, no aguantar el aire.'],
      videoId: 'O2aE8iE8Dvw'
    },
    'Estabilización Lumbopélvica': {
      objetivo: 'Activar el core y estabilizar la pelvis durante el movimiento de extremidades.',
      dosificacion: '3 series de 12 repeticiones por lado',
      puntos: ['Mantener la curvatura lumbar neutra (no aplastar ni arquear de más).', 'Movimiento lento de las piernas.', 'Activar el abdomen (como si fueras a toser) antes de mover.'],
      videoId: '8W1iK0J6ZKs'
    }
  };
  
  const pautaActual = pautas[ejercicioSeleccionado as keyof typeof pautas];

  const handleImprimir = () => {
    const printContent = document.getElementById('pasaporte-clinico');
    if (!printContent) return;

    const popupWin = window.open('', '_blank', 'width=900,height=800');
    if (!popupWin) return;

    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>Pasaporte de Salud Articular - ${paciente?.nombre_completo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: portrait; margin: 10mm; }
            }
          </style>
        </head>
        <body class="p-8 bg-white font-sans text-slate-800" onload="setTimeout(() => { window.print(); window.close(); }, 500)">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    popupWin.document.close();
  };

  const handleWhatsApp = () => {
    const msg = `¡Felicitaciones ${paciente?.nombre_completo?.split(' ')[0]} por completar tu tratamiento en Kiromov Centro Clínico! 🎉 Te compartimos tu Pasaporte de Salud Articular con tu evolución de dolor, tu pauta de ejercicios con video y tu pase preferencial de regalo. ¡Ha sido un gusto acompañarte en tu recuperación! 💪`;
    const url = `https://wa.me/56${(paciente?.telefono || '').replace(/\D/g, '').slice(-9)}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} maxWidth="max-w-4xl">

        
      <DialogBody className="p-0">
        {/* HEADER FIJO */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-100 px-6 py-4">
          <div>
            <DialogTitle className="text-xl font-black text-slate-900">Pasaporte de Salud Articular</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">Documento clínico de alta y mantención.</DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleImprimir} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm h-9">
              <Printer className="w-4 h-4 mr-2" /> Imprimir PDF
            </Button>
            <Button onClick={handleWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm h-9">
              <MessageCircle className="w-4 h-4 mr-2" /> Enviar Wsp
            </Button>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO IMPRIMIBLE */}
        <div className="p-8 bg-slate-50">
          <div id="pasaporte-clinico" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl mx-auto">
            
            {/* 1. BANNER E IDENTIDAD */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-8 text-white relative">
              <div className="absolute top-8 right-8">
                <img src="/branding/logo.png" alt="Kiromov" className="h-12 brightness-0 invert opacity-90" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <h1 className="text-2xl font-black mb-1">🏅 Pasaporte de Salud Articular</h1>
              <h2 className="text-lg font-bold opacity-90">{paciente?.nombre_completo}</h2>
              <p className="text-xs font-medium opacity-75 mt-4">Kiromov Centro Clínico — Kinesiología & Terapia Manual Ortopédica | Chillán</p>
            </div>

            {/* 2. CAJA RESUMEN Y ALTA */}
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Resumen del Proceso Clínico</h3>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
                  ✅ Alta Kinésica Funcional
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Inicio</p>
                  <p className="text-sm font-bold text-slate-900">{fechaInicio || '—'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Alta</p>
                  <p className="text-sm font-bold text-slate-900">{fechaAlta || '—'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Sesiones</p>
                  <p className="text-sm font-bold text-slate-900">{citasAsistidas}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Diagnóstico</p>
                  <p className="text-sm font-bold text-slate-900 truncate" title={paciente?.diagnostico}>{paciente?.diagnostico || 'Evaluación Kinésica'}</p>
                </div>
              </div>

              {/* Evolución ENA */}
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-900 mb-1">Evolución del Dolor (Escala ENA)</p>
                  <p className="text-sm text-blue-800 font-medium">Dolor Inicial: <span className="font-black text-rose-600">{dolorInicial}/10</span> ➔ Dolor al Alta: <span className="font-black text-emerald-600">{dolorFinal}/10</span></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">↓ {porcentajeMejora}%</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Reducción del Dolor</p>
                </div>
              </div>
            </div>

            {/* 3. PAUTA DE MANTENCIÓN */}
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900">Pauta de Mantención Domiciliaria</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">8 a 10 min • 2x semana</span>
              </div>
              
              <div className="mb-4 print:hidden">
                <label className="text-xs font-bold text-slate-700 block mb-1">Seleccionar Pauta Clínica:</label>
                <select 
                  className="w-full max-w-xs p-2 text-sm border border-slate-300 rounded-xl bg-white"
                  value={ejercicioSeleccionado}
                  onChange={(e) => setEjercicioSeleccionado(e.target.value)}
                >
                  {Object.keys(pautas).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-base font-bold text-slate-900 mb-2">{ejercicioSeleccionado}</h4>
                <p className="text-xs text-slate-600 italic mb-4">{pautaActual.objetivo}</p>
                
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dosificación</p>
                      <p className="text-sm font-bold text-blue-900">{pautaActual.dosificacion}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Puntos Clave</p>
                      <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-4">
                        {pautaActual.puntos.map((pt, i) => <li key={i}>{pt}</li>)}
                      </ul>
                    </div>
                  </div>
                  {/* Video Thumbnail Falso para impresión/visual */}
                  <div className="w-full sm:w-48 aspect-video bg-slate-200 rounded-xl overflow-hidden relative border border-slate-300 flex-shrink-0">
                    <img src={`https://img.youtube.com/vi/${pautaActual.videoId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80 mix-blend-multiply" alt="Video cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. GUIA VISUAL DE SENSACIONES */}
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-4">Guía Semáforo durante Ejercicios</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">🟢 Normal</p>
                    <p className="text-[10px] text-emerald-800 leading-tight mt-0.5">Fatiga muscular o estiramiento progresivo propio del trabajo activo.</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-amber-900">🟡 Monitorear</p>
                    <p className="text-[10px] text-amber-800 leading-tight mt-0.5">Tirantez leve (hasta 3/10) que cede a los 5 minutos de terminar.</p>
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 mt-0.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-rose-900">🔴 Pausar</p>
                    <p className="text-[10px] text-rose-800 leading-tight mt-0.5">Pinchazo agudo o dolor punzante articular. Consultar a tu kinesiólogo.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. FIDELIZACIÓN */}
            <div className="p-8 bg-slate-50 flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 bg-white border-2 border-dashed border-amber-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="text-4xl">🎁</div>
                <div>
                  <p className="text-xs font-black text-amber-900">Tu Pase Preferencial de Regalo</p>
                  <p className="text-[10px] text-amber-800 leading-tight">Regala 1 Evaluación Kinésica Gratuita (Valor $20.000) a un familiar o amigo mencionando tu nombre.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto text-center sm:text-left print:hidden">
                <a href="https://g.page/r/your-google-link/review" target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">⭐ Dejar Reseña en Google</a>
                <a href={`https://wa.me/56900000000`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline">💬 Contactar a Kinesiólogo</a>
              </div>
            </div>

          </div>
        </div>
      </DialogBody>
    </Dialog>
  );
};
