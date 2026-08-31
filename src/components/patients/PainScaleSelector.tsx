"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Smile, Meh, Frown, AlertCircle, Flame } from "lucide-react";

interface PainScaleSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function PainScaleSelector({
  value,
  onChange,
  disabled = false,
}: PainScaleSelectorProps) {
  const getPainLevelInfo = (score: number) => {
    if (score === 0) {
      return {
        label: "Sin Dolor (0)",
        color: "text-emerald-700 bg-emerald-50 border-emerald-300",
        barColor: "bg-emerald-500",
        icon: <Smile className="h-4 w-4 text-emerald-600" />,
        desc: "Sin molestias.",
      };
    }
    if (score <= 3) {
      return {
        label: `Dolor Leve (${score})`,
        color: "text-teal-700 bg-teal-50 border-teal-300",
        barColor: "bg-teal-500",
        icon: <Smile className="h-4 w-4 text-teal-600" />,
        desc: "Molestia tolerable que no interfiere con actividades diarias.",
      };
    }
    if (score <= 6) {
      return {
        label: `Dolor Moderado (${score})`,
        color: "text-amber-800 bg-amber-50 border-amber-300",
        barColor: "bg-amber-500",
        icon: <Meh className="h-4 w-4 text-amber-600" />,
        desc: "Interfiere con la concentración o actividades habituales.",
      };
    }
    if (score <= 9) {
      return {
        label: `Dolor Severo (${score})`,
        color: "text-orange-800 bg-orange-50 border-orange-300",
        barColor: "bg-orange-500",
        icon: <Frown className="h-4 w-4 text-orange-600" />,
        desc: "Incapacitante, impide realizar actividades básicas.",
      };
    }
    return {
      label: `Dolor Máximo Insuperable (${score})`,
      color: "text-red-800 bg-red-50 border-red-400",
      barColor: "bg-red-600",
      icon: <Flame className="h-4 w-4 text-red-600" />,
      desc: "El peor dolor imaginable o experimentado.",
    };
  };

  const currentInfo = getPainLevelInfo(value);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-clinic-600" />
          Escala Numérica de Dolor (ENA 0 - 10)
        </label>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
            currentInfo.color
          )}
        >
          {currentInfo.icon}
          <span>{currentInfo.label}</span>
        </div>
      </div>

      {/* Grid of 0-10 Buttons */}
      <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSelected = value === num;
          let btnClass = "bg-white text-slate-700 hover:bg-slate-100 border-slate-200";

          if (isSelected) {
            if (num === 0) btnClass = "bg-emerald-600 text-white border-emerald-600 shadow-md font-bold scale-105";
            else if (num <= 3) btnClass = "bg-teal-600 text-white border-teal-600 shadow-md font-bold scale-105";
            else if (num <= 6) btnClass = "bg-amber-500 text-white border-amber-500 shadow-md font-bold scale-105";
            else if (num <= 9) btnClass = "bg-orange-600 text-white border-orange-600 shadow-md font-bold scale-105";
            else btnClass = "bg-red-600 text-white border-red-600 shadow-md font-bold scale-105";
          }

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => onChange(num)}
              className={cn(
                "flex h-9 sm:h-10 items-center justify-center rounded-lg border text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-clinic-500",
                btnClass
              )}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Slider Helper */}
      <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
        <span>0 (Sin Dolor)</span>
        <span>5 (Moderado)</span>
        <span>10 (Insuperable)</span>
      </div>

      <p className="text-xs text-slate-500 italic bg-white p-2 rounded-md border border-slate-100">
        💡 {currentInfo.desc}
      </p>
    </div>
  );
}
