content = """'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Header() {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.storage.from('branding').getPublicUrl('logo.png');
    if (data?.publicUrl) {
      setLogoUrl(data.publicUrl);
    }
  }, []);

  // No renderizar en el login
  if (pathname === '/login') return null;

  const isActive = (path: string) => {
    if (path === '/pacientes' && (pathname === '/' || pathname === '/pacientes')) return true;
    return pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Pacientes', href: '/pacientes' },
    { name: 'Agenda', href: '/agenda' },
    { name: 'Finanzas & Caja', href: '/finanzas' },
    { name: 'Tarifas & Planes', href: '/planes' },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md bg-white/90 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Navegación */}
        <div className="flex items-center gap-8">
          <Link href="/pacientes" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 flex items-center justify-center bg-blue-600 rounded-lg shadow-sm group-hover:shadow-md transition-all">
              {/* Fallback de texto SVG por si no existe la imagen */}
              <span className="text-white font-bold text-sm">K</span>
              <img 
                src={logoUrl} 
                alt="Kiromov Logo" 
                className="absolute inset-0 w-full h-full object-contain p-0.5 rounded-lg bg-white" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none group-hover:text-blue-600 transition-colors">KIROMOV</span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Centro Clínico</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm transition-all ${
                    active 
                      ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' 
                      : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Perfil Profesional */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-sm font-bold text-slate-900">Klgo. Ignacio Cuevas Silva</span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Director Clínico — TMO</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
            <img 
              src="https://ui-avatars.com/api/?name=Ignacio+Cuevas&background=0D8ABC&color=fff&bold=true" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <button 
            onClick={() => {/* logout logic if any */}}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
"""
with open('src/components/layout/Header.tsx', 'w') as f:
    f.write(content)
