'use client';

import React, { useRef, useState, useEffect } from 'react';

interface PainMapCanvasProps {
  onSaveMap?: (dataUrl: string) => void;
  onChange?: (dataUrl: string | null) => void;
  initialImage?: string | null;
  value?: string | null;
  readOnly?: boolean;
}

const BODY_IMAGE_URL = "https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/mapa_cuerpo.png";

export function PainMapCanvas({
  onSaveMap,
  onChange,
  initialImage,
  value,
  readOnly = false,
}: PainMapCanvasProps) {
  const activeInitial = value || initialImage || null;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState<'#ef4444' | '#3b82f6' | '#f59e0b'>('#ef4444');
  const [imageLoaded, setImageLoaded] = useState(false);

  const triggerSave = (dataUrl: string) => {
    if (onSaveMap) onSaveMap(dataUrl);
    if (onChange) onChange(dataUrl || null);
  };

  // Helper para dibujar silueta vectorial de respaldo si la imagen remota tarda o falla
  const drawFallbackSilhouette = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#f8fafc';

    const halfW = w / 2;

    const drawSilhouette = (centerX: number, label: string) => {
      ctx.save();
      ctx.translate(centerX, 0);

      // Cabeza
      ctx.beginPath();
      ctx.ellipse(0, 45, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cuello
      ctx.beginPath();
      ctx.moveTo(-9, 70);
      ctx.lineTo(-10, 88);
      ctx.lineTo(10, 88);
      ctx.lineTo(9, 70);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tronco y extremidades
      ctx.beginPath();
      ctx.moveTo(-10, 88);
      ctx.bezierCurveTo(-30, 92, -60, 100, -68, 120);
      ctx.lineTo(-76, 200);
      ctx.lineTo(-80, 250);
      ctx.bezierCurveTo(-82, 270, -70, 272, -68, 260);
      ctx.lineTo(-60, 210);
      ctx.lineTo(-48, 150);
      ctx.bezierCurveTo(-42, 170, -36, 190, -40, 210);
      ctx.bezierCurveTo(-42, 225, -45, 240, -40, 250);
      ctx.lineTo(-36, 325);
      ctx.lineTo(-34, 395);
      ctx.bezierCurveTo(-36, 412, -25, 418, -22, 407);
      ctx.lineTo(-20, 330);
      ctx.lineTo(-7, 260);
      ctx.lineTo(0, 250);
      ctx.lineTo(7, 260);
      ctx.lineTo(20, 330);
      ctx.bezierCurveTo(25, 418, 36, 412, 34, 395);
      ctx.lineTo(36, 325);
      ctx.bezierCurveTo(45, 240, 42, 225, 40, 210);
      ctx.bezierCurveTo(36, 190, 42, 170, 48, 150);
      ctx.lineTo(60, 210);
      ctx.lineTo(68, 260);
      ctx.bezierCurveTo(70, 272, 82, 270, 80, 250);
      ctx.lineTo(76, 200);
      ctx.lineTo(68, 120);
      ctx.bezierCurveTo(60, 100, 30, 92, 10, 88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, h - 12);

      ctx.restore();
    };

    drawSilhouette(halfW * 0.5, 'VISTA ANTERIOR (FRENTE)');
    drawSilhouette(halfW * 1.5, 'VISTA POSTERIOR (ESPALDA)');

    // Divisor central
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(halfW, 15);
    ctx.lineTo(halfW, h - 15);
    ctx.stroke();
  };

  // Cargar y dibujar la imagen base de fondo
  const drawBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImageLoaded(true);

      // Si hay una imagen previa guardada, dibujarla encima
      if (activeInitial) {
        const prevImg = new Image();
        prevImg.crossOrigin = 'anonymous';
        prevImg.onload = () => ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
        prevImg.src = activeInitial;
      }
    };
    img.onerror = () => {
      // Fallback a silueta vectorial generada
      drawFallbackSilhouette(ctx, canvas.width, canvas.height);
      setImageLoaded(true);

      if (activeInitial) {
        const prevImg = new Image();
        prevImg.crossOrigin = 'anonymous';
        prevImg.onload = () => ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
        prevImg.src = activeInitial;
      }
    };
    img.src = BODY_IMAGE_URL;
  };

  useEffect(() => {
    drawBackground();
  }, [activeInitial]);

  // Manejo de trazos (Mouse y Touch para Tablet)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    // Dibujar punto de impacto
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        triggerSave(dataUrl);
      } catch (err) {
        console.error('Error al exportar mapa de dolor:', err);
      }
    }
  };

  const handleClear = () => {
    if (readOnly) return;
    drawBackground();
    triggerSave('');
  };

  return (
    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          🗺️ Mapa de Dolor Anatómico
        </span>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            {/* Selector de tipo de dolor */}
            <button
              type="button"
              onClick={() => setColor('#ef4444')}
              className={`w-5 h-5 rounded-full bg-rose-500 border-2 transition-all ${
                color === '#ef4444' ? 'border-slate-800 scale-110 shadow-xs' : 'border-white opacity-60'
              }`}
              title="Dolor Agudo / Inflamación"
            />
            <button
              type="button"
              onClick={() => setColor('#3b82f6')}
              className={`w-5 h-5 rounded-full bg-blue-500 border-2 transition-all ${
                color === '#3b82f6' ? 'border-slate-800 scale-110 shadow-xs' : 'border-white opacity-60'
              }`}
              title="Parestesia / Irradiación"
            />
            <button
              type="button"
              onClick={() => setColor('#f59e0b')}
              className={`w-5 h-5 rounded-full bg-amber-500 border-2 transition-all ${
                color === '#f59e0b' ? 'border-slate-800 scale-110 shadow-xs' : 'border-white opacity-60'
              }`}
              title="Tensión / Fatiga Muscular"
            />
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 transition-colors shadow-2xs"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Contenedor del Canvas */}
      <div className="relative w-full aspect-[4/3] max-h-64 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-full object-contain touch-none ${
            readOnly ? 'cursor-default' : 'cursor-crosshair'
          }`}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-xs text-slate-400">
            Cargando esquema anatómico...
          </div>
        )}
      </div>
      {!readOnly && (
        <p className="text-[10px] text-slate-400 text-center">
          Toca o arrastra sobre la silueta para marcar los puntos de dolor (Rojo: Dolor | Azul: Parestesia | Amarillo: Tensión)
        </p>
      )}
    </div>
  );
}

export default PainMapCanvas;
