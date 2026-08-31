"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Activity,
  User,
  Sparkles,
  X,
  Stethoscope,
  Users,
  Layers,
  Tag,
  BarChart3,
  Settings,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  isSupabaseOnline?: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  isSupabaseOnline = false,
}: HeaderProps) {
  const pathname = usePathname();

  const isPacientesActive = pathname === "/";
  const isAgendaActive = pathname === "/agenda" || pathname.startsWith("/agenda");
  const isFinanzasActive = pathname === "/finanzas" || pathname.startsWith("/finanzas");
  const isPlanesActive = pathname === "/planes" || pathname.startsWith("/planes");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {/* Brand / Logo + Navigation Links */}
        <div className="flex items-center justify-between sm:justify-start gap-3 lg:gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-clinic-600 to-teal-800 text-white shadow-md shadow-clinic-600/20 group-hover:scale-105 transition-transform">
              <Activity className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  KIROMOV
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-clinic-700 bg-clinic-50 border border-clinic-200 px-1.5 py-0.5 rounded">
                  Core
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Centro Clínico & Kinesiología
              </p>
            </div>
          </Link>

          {/* Navigation Links Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 ml-2">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPacientesActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5 text-clinic-600" />
              <span>📋 Pacientes</span>
            </Link>

            <Link
              href="/agenda"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isAgendaActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-clinic-600" />
              <span>📅 Agenda</span>
            </Link>

            <Link
              href="/finanzas"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isFinanzasActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-clinic-600" />
              <span>📊 Finanzas & Caja</span>
            </Link>

            <Link
              href="/planes"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPlanesActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Settings className="h-3.5 w-3.5 text-clinic-600" />
              <span>⚙️ Tarifas & Planes</span>
            </Link>
          </nav>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-sm w-full">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={
                isAgendaActive
                  ? "Buscar citas..."
                  : isFinanzasActive
                  ? "Buscar ventas o egresos..."
                  : isPlanesActive
                  ? "Buscar tarifas..."
                  : "Buscar por Nombre o RUT..."
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User Info & Mobile Nav Links */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Mobile Nav Links */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                isPacientesActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              Pacientes
            </Link>
            <Link
              href="/agenda"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                isAgendaActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              Agenda
            </Link>
            <Link
              href="/finanzas"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                isFinanzasActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              Finanzas
            </Link>
            <Link
              href="/planes"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                isPlanesActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              Tarifas
            </Link>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 shadow-2xs">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-clinic-600 text-white font-bold text-xs shadow-xs">
              IC
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">
                  Klgo. Ignacio Cuevas
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Activo" />
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Kinesiólogo Clínico
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
