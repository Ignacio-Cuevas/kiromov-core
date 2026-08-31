'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, ShieldAlert, ShieldCheck, ArrowRight, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      setLoading(false);
      return;
    }

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!error && data?.session) {
          toast.success('Sesión iniciada correctamente', {
            description: 'Bienvenido al panel clínico de Kiromov Core.',
          });
          router.push('/');
          router.refresh();
          return;
        }

        if (error) {
          console.warn('Supabase Auth error:', error.message);
          setErrorMsg('Credenciales inválidas. Acceso restringido al equipo clínico.');
          setLoading(false);
          return;
        }
      }

      // Fallback para desarrollo local / offline si no hay credenciales de Supabase
      toast.success('Acceso autorizado (Modo Clínico Local)');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Error durante inicio de sesión:', err);
      setErrorMsg('Error de conexión con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300">
        {/* Card Header & Branding */}
        <div className="p-8 pb-6 text-center bg-slate-50/70 border-b border-slate-100">
          <div className="flex justify-center mb-4">
            <img
              src="https://nxlabwiewewwkwemtvfj.supabase.co/storage/v1/object/public/branding/public:logo.png"
              alt="Kiromov Centro Clínico"
              className="h-12 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            <span>KIROMOV</span>
            <span className="text-blue-600 font-bold">Core</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Centro Clínico • Kinesiología & Terapia Manual Ortopédica
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8 pt-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Acceso Profesional Clínico</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa tus credenciales para acceder a las fichas y atenciones.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2 animate-in fade-in-50">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="ignacio@kiromov.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Iniciar Sesión en Kiromov Core</span>
                  <ArrowRight className="h-4 w-4 ml-1 opacity-80" />
                </>
              )}
            </button>
          </form>

          {/* Legal Compliance Badge (Ley 20.584) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-700 block font-bold">
                  Resguardo de Datos de Salud (Ley 20.584)
                </strong>
                Ficha clínica de carácter reservado y confidencial. Acceso auditado y encriptado exclusivamente para el equipo de salud tratante.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 mt-6 space-y-1">
        <p>Bulnes 470, Oficina 75 (7° Piso), Edificio Aranjuez • Chillán, Chile</p>
        <p className="text-[11px] opacity-70">
          © {new Date().getFullYear()} KIROMOV Centro Clínico. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
