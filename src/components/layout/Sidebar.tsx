'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, CreditCard, ClipboardList, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  emoji: string;
}

const navItems: NavItem[] = [
  {
    name: 'Agenda de Box',
    href: '/agenda',
    icon: <Calendar className="w-4 h-4" />,
    emoji: '📅',
  },
  {
    name: 'Fichas & Pacientes',
    href: '/pacientes',
    icon: <Users className="w-4 h-4" />,
    emoji: '👥',
  },
  {
    name: 'Caja & Finanzas',
    href: '/finanzas',
    icon: <CreditCard className="w-4 h-4" />,
    emoji: '💳',
  },
  {
    name: 'Tarifas & Catálogo',
    href: '/planes',
    icon: <ClipboardList className="w-4 h-4" />,
    emoji: '📋',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // No renderizar en la vista de login
  if (pathname === '/login') return null;

  const isActive = (href: string) => {
    if (href === '/pacientes') {
      return pathname === '/' || pathname === '/pacientes' || pathname.startsWith('/pacientes/');
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-300 hidden md:flex flex-col flex-shrink-0 border-r border-slate-800 sticky top-0 h-screen select-none z-20">
      {/* Cabecera del Sidebar */}
      <div className="p-5 border-b border-slate-800/80">
        <Link href="/agenda" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-600/30 ring-1 ring-blue-400/30 group-hover:bg-blue-500 transition-all shrink-0">
            K
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-white text-sm tracking-tight leading-none group-hover:text-blue-400 transition-colors">
              KIROMOV <span className="font-medium text-slate-300">Centro Clínico</span>
            </span>
            <span className="text-[11px] font-semibold text-blue-400 mt-1 tracking-tight">
              Kinesiología & TMO
            </span>
          </div>
        </Link>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Atención & Gestión
        </div>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className="text-base leading-none shrink-0">{item.emoji}</span>
              <span className="tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pie del Sidebar: Recuadro del Profesional & Cerrar Sesión */}
      <div className="p-3.5 border-t border-slate-800/90 bg-slate-950/40 mt-auto">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              IC
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">
                Klgo. Ignacio Cuevas Silva
              </p>
              <p className="text-[10px] font-medium text-blue-400/90 truncate leading-tight mt-0.5">
                Director Clínico • SIS N° 396889
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            type="button"
            className="w-full mt-3 py-1.5 px-2.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Cerrar Sesión Segura"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
