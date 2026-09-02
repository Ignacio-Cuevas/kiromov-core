"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "right",
  className,
}: SheetProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet Content */}
      <div
        className={cn(
          "relative z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-right sm:border-l border-slate-200",
          side === "right" && "inset-y-0 right-0",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 border-b border-slate-100 p-6 pb-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SheetTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn("text-xl font-bold tracking-tight text-slate-900", className)}
    >
      {children}
    </h2>
  );
}

export function SheetDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-sm text-slate-500", className)}>{children}</p>
  );
}

export function SheetClose({
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
        "absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-clinic-500",
        className
      )}
    >
      <X className="h-5 w-5" />
      <span className="sr-only">Cerrar</span>
    </button>
  );
}

export function SheetBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-6 pt-4 focus-visible:outline-none",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SheetFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-slate-100 p-4 bg-slate-50/50",
        className
      )}
    >
      {children}
    </div>
  );
}
