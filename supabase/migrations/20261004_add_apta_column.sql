ALTER TABLE IF EXISTS public.evaluaciones_iniciales_tmo 
  ADD COLUMN IF NOT EXISTS diagnostico_apta TEXT;
