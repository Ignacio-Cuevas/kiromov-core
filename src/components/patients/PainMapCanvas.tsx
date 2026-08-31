"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { RotateCcw, Paintbrush, CircleDot, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PainMapCanvasProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  readOnly?: boolean;
}

export function PainMapCanvas({
  value,
  onChange,
  readOnly = false,
}: PainMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#dc2626"); // Red
  const [brushSize, setBrushSize] = useState<number>(8);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Dibuja las siluetas corporales anatómicas (Vista Anterior y Posterior)
  const drawBaseSilhouette = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Fondo blanco limpio
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Estilos de la silueta base
    ctx.strokeStyle = "#cbd5e1"; // Slate 300
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "#f8fafc"; // Slate 50
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const halfW = width / 2;

    // Helper para dibujar un cuerpo (anterior o posterior)
    const drawBody = (centerX: number, isBack: boolean) => {
      ctx.save();
      ctx.translate(centerX, 0);

      // 1. Cabeza
      ctx.beginPath();
      ctx.ellipse(0, 32, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Cuello
      ctx.beginPath();
      ctx.moveTo(-6, 50);
      ctx.lineTo(-7, 62);
      ctx.lineTo(7, 62);
      ctx.lineTo(6, 50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Tronco, Hombros y Brazos
      ctx.beginPath();
      // Hombro izquierdo
      ctx.moveTo(-7, 62);
      ctx.bezierCurveTo(-22, 64, -42, 70, -48, 85);
      // Brazo izquierdo exterior
      ctx.lineTo(-54, 140);
      ctx.lineTo(-56, 175);
      // Mano izquierda
      ctx.bezierCurveTo(-58, 190, -50, 192, -48, 182);
      // Brazo izquierdo interior
      ctx.lineTo(-42, 145);
      ctx.lineTo(-34, 105);
      // Tórax / Cintura izquierda
      ctx.bezierCurveTo(-30, 120, -26, 135, -28, 150);
      // Cadera izquierda
      ctx.bezierCurveTo(-30, 160, -32, 170, -28, 178);
      // Pierna izquierda exterior
      ctx.lineTo(-26, 230);
      ctx.lineTo(-24, 280);
      // Pie izquierdo
      ctx.bezierCurveTo(-26, 292, -18, 296, -16, 288);
      // Pierna izquierda interior
      ctx.lineTo(-14, 235);
      ctx.lineTo(-5, 185);
      // Entrepierna
      ctx.lineTo(0, 178);
      // Pierna derecha interior
      ctx.lineTo(5, 185);
      ctx.lineTo(14, 235);
      // Pie derecho
      ctx.bezierCurveTo(18, 296, 26, 292, 24, 280);
      // Pierna derecha exterior
      ctx.lineTo(26, 230);
      // Cadera derecha
      ctx.bezierCurveTo(32, 170, 30, 160, 28, 150);
      // Tórax / Cintura derecha
      ctx.bezierCurveTo(26, 135, 30, 120, 34, 105);
      // Brazo derecho interior
      ctx.lineTo(42, 145);
      ctx.lineTo(48, 182);
      // Mano derecha
      ctx.bezierCurveTo(50, 192, 58, 190, 56, 175);
      // Brazo derecho exterior
      ctx.lineTo(54, 140);
      ctx.lineTo(48, 85);
      // Hombro derecho
      ctx.bezierCurveTo(42, 70, 22, 64, 7, 62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Detalles anatómicos tenues
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;

      if (!isBack) {
        // Clavículas
        ctx.beginPath();
        ctx.moveTo(-18, 68);
        ctx.lineTo(-2, 72);
        ctx.moveTo(2, 72);
        ctx.lineTo(18, 68);
        ctx.stroke();

        // Esternón
        ctx.beginPath();
        ctx.moveTo(0, 75);
        ctx.lineTo(0, 105);
        ctx.stroke();

        // Rótulas (Rodillas)
        ctx.beginPath();
        ctx.arc(-20, 235, 4, 0, Math.PI * 2);
        ctx.arc(20, 235, 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Columna vertebral
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(0, 64);
        ctx.lineTo(0, 165);
        ctx.stroke();
        ctx.setLineDash([]);

        // Escápulas
        ctx.beginPath();
        ctx.arc(-16, 92, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(16, 92, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Dibujar Anterior (Izquierda)
    drawBody(halfW * 0.5, false);

    // Dibujar Posterior (Derecha)
    drawBody(halfW * 1.5, true);

    // Separador central y títulos
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW, 10);
    ctx.lineTo(halfW, height - 10);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VISTA ANTERIOR (FRENTE)", halfW * 0.5, height - 8);
    ctx.fillText("VISTA POSTERIOR (ESPALDA)", halfW * 1.5, height - 8);

    ctx.restore();
  }, []);

  // Inicializar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw base
    drawBaseSilhouette(ctx, canvas.width, canvas.height);

    // Si viene un valor previo guardado (DataURL), cargarlo encima
    if (value) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value, drawBaseSilhouette]);

  // Manejo de coordenadas normalizadas para touch y mouse
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Pintar punto inmediato con efecto de dolor (halo)
    ctx.fillStyle = selectedColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 1.5, 0, Math.PI * 2);
    ctx.fill();

    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();

    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const handleClear = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawBaseSilhouette(ctx, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      {/* Controles de Dibujo (Ocultos en solo lectura) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
              <CircleDot className="h-3.5 w-3.5 text-rose-600" />
              Intensidad/Tipo:
            </span>
            <button
              type="button"
              onClick={() => setSelectedColor("#dc2626")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition-all ${
                selectedColor === "#dc2626"
                  ? "bg-rose-100 text-rose-800 border-rose-400 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              Dolor Agudo / Gatillo
            </button>

            <button
              type="button"
              onClick={() => setSelectedColor("#f59e0b")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition-all ${
                selectedColor === "#f59e0b"
                  ? "bg-amber-100 text-amber-800 border-amber-400 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Dolor Moderado / Tensión
            </button>

            <button
              type="button"
              onClick={() => setSelectedColor("#2563eb")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition-all ${
                selectedColor === "#2563eb"
                  ? "bg-blue-100 text-blue-800 border-blue-400 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              Irradiación / Parestesia
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Puntura:</span>
              <button
                type="button"
                onClick={() => setBrushSize(5)}
                className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  brushSize === 5 ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Pincel fino (punto localizado)"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => setBrushSize(9)}
                className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  brushSize === 9 ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Pincel mediano"
              >
                M
              </button>
              <button
                type="button"
                onClick={() => setBrushSize(14)}
                className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  brushSize === 14 ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Pincel grueso (zona amplia)"
              >
                L
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasDrawn}
              className="h-7 text-xs font-semibold gap-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpiar Mapa</span>
            </Button>
          </div>
        </div>
      )}

      {/* Contenedor del Canvas Anatómico */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={380}
          height={315}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full max-w-[380px] h-auto touch-none ${
            readOnly ? "cursor-default" : "cursor-crosshair"
          }`}
        />
        {!hasDrawn && !readOnly && (
          <div className="absolute inset-x-0 bottom-8 text-center pointer-events-none">
            <span className="text-[11px] font-bold text-slate-400 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
              👆 Haz clic o desliza para marcar los puntos de dolor
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PainMapCanvas;
