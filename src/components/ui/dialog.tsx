"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string; // e.g. "max-w-2xl", "max-w-xl", "max-w-lg"
}

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  maxWidth = "max-w-2xl",
}: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Modal Card Container with bounded max-height and flex-col layout (Bottom Sheet en móvil, Centrado en Desktop) */}
      <div
        className={cn(
          "relative z-50 w-full max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-100 overflow-hidden transform transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95",
          maxWidth,
          className
        )}
      >
        {/* Tirador táctil visual para móvil (Bottom Sheet Touch Handle) */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50/90 shrink-0 border-b border-slate-100/60">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/90 backdrop-blur-xs sticky top-0 z-10 shrink-0",
        className
      )}
    >
      <div className="flex-1 pr-3 min-w-0">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={cn(
        "text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-xs text-slate-500 mt-0.5 leading-normal", className)}>
      {children}
    </p>
  );
}

export function DialogClose({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors shrink-0 cursor-pointer",
        className
      )}
      aria-label="Cerrar modal"
    >
      <X className="h-5 w-5 sm:h-4 sm:w-4" />
    </button>
  );
}

export function DialogBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 min-h-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2.5 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs sticky bottom-0 z-20 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5",
        className
      )}
    >
      {children}
    </div>
  );
}
