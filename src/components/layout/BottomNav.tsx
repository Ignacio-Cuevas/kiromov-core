'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, DollarSign, Globe } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Agenda', href: '/agenda', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Pacientes', href: '/pacientes', icon: <Users className="w-5 h-5" /> },
    { label: 'Finanzas', href: '/finanzas', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Agendar Web', href: '/agendar', icon: <Globe className="w-5 h-5" /> },
  ];

  // No mostrar la barra en la pantalla de login ni agendamiento público
  if (pathname === '/login' || pathname.startsWith('/agendar')) return null;

  return (
    <nav className="bg-white/95 backdrop-blur border-t border-slate-200 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] h-[60px] md:hidden shadow-lg print:hidden">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === '/pacientes' && pathname === '/') ||
          (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 text-[11px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="leading-none">{item.icon}</span>
            <span className="truncate max-w-[70px]">{item.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
