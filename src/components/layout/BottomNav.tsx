'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Pacientes', href: '/pacientes', icon: '📋' },
    { label: 'Agenda', href: '/agenda', icon: '📅' },
    { label: 'Finanzas', href: '/finanzas', icon: '📊' },
    { label: 'Planes', href: '/planes', icon: '⚙️' },
  ];

  // No mostrar la barra en la pantalla de login
  if (pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden pb-[env(safe-area-inset-bottom,8px)] shadow-lg print:hidden">
      <div className="grid grid-cols-4 h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/pacientes' && pathname === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive 
                  ? 'text-blue-600 font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
