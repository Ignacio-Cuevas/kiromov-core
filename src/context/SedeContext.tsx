'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SedeId, SedeConfig, SEDES_CONFIG, getSedeConfig } from '@/config/sedes';
import { createClient } from '@/utils/supabase/client';

interface SedeContextType {
  sedeActiva: SedeId;
  setSede: (sede: SedeId) => void;
  toggleSede: () => void;
  sedeConfig: SedeConfig;
  isLoading: boolean;
}

const SedeContext = createContext<SedeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'kiromov_sede_activa';

export function SedeProvider({ children }: { children: React.ReactNode }) {
  const [sedeActiva, setSedeActivaState] = useState<SedeId>('chillan');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inicializar sede desde localStorage o por detección de usuario Supabase
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const inicializarSede = async () => {
      try {
        const storedSede = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
        let detectedSede: SedeId | null = (storedSede === 'chillan' || storedSede === 'concepcion') ? storedSede : null;

        // Detección automática al iniciar sesión
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          const email = user?.email?.toLowerCase()?.trim();

          if (email === 'michael@kiromov.cl') {
            // Si el usuario autenticado es Michael Pinto, fijar por defecto concepcion
            detectedSede = 'concepcion';
          } else if (email && email.includes('ignacio')) {
            if (!storedSede) detectedSede = 'chillan';
          }
        }

        if (isMounted) {
          const finalSede = detectedSede || 'chillan';
          setSedeActivaState(finalSede);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, finalSede);
          }
        }
      } catch (err) {
        console.warn('Error inicializando sede en SedeContext:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    inicializarSede();

    // Escuchar cambios de estado de autenticación
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const email = session?.user?.email?.toLowerCase()?.trim();
        if (email === 'michael@kiromov.cl') {
          setSedeActivaState('concepcion');
          localStorage.setItem(LOCAL_STORAGE_KEY, 'concepcion');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const setSede = useCallback((nuevaSede: SedeId) => {
    setSedeActivaState(nuevaSede);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, nuevaSede);
      }
    } catch (e) {
      console.warn('No se pudo persistir sede en localStorage', e);
    }
  }, []);

  const toggleSede = useCallback(() => {
    setSede(sedeActiva === 'chillan' ? 'concepcion' : 'chillan');
  }, [sedeActiva, setSede]);

  const sedeConfig = useMemo(() => {
    return getSedeConfig(sedeActiva);
  }, [sedeActiva]);

  const value = useMemo(
    () => ({
      sedeActiva,
      setSede,
      toggleSede,
      sedeConfig,
      isLoading,
    }),
    [sedeActiva, setSede, toggleSede, sedeConfig, isLoading]
  );

  return <SedeContext.Provider value={value}>{children}</SedeContext.Provider>;
}

export function useSede() {
  const context = useContext(SedeContext);
  if (!context) {
    throw new Error('useSede debe ser utilizado dentro de un SedeProvider');
  }
  return context;
}
