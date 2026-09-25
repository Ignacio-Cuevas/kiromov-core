-- ====================================================================
-- Migración: Evaluación TMO Expandida y Horarios de Box Día por Día
-- ====================================================================

-- 1. Nuevas columnas para Evaluación Inicial TMO (Anamnesis reciente y 3 segmentos de Joint Play)
ALTER TABLE IF EXISTS public.evaluaciones_iniciales_tmo 
  ADD COLUMN IF NOT EXISTS anamnesis_reciente TEXT,
  ADD COLUMN IF NOT EXISTS juego_articular_1_zona VARCHAR(255),
  ADD COLUMN IF NOT EXISTS juego_articular_1_grado VARCHAR(100),
  ADD COLUMN IF NOT EXISTS juego_articular_1_endfeel VARCHAR(100),
  ADD COLUMN IF NOT EXISTS juego_articular_2_zona VARCHAR(255),
  ADD COLUMN IF NOT EXISTS juego_articular_2_grado VARCHAR(100),
  ADD COLUMN IF NOT EXISTS juego_articular_2_endfeel VARCHAR(100),
  ADD COLUMN IF NOT EXISTS juego_articular_3_zona VARCHAR(255),
  ADD COLUMN IF NOT EXISTS juego_articular_3_grado VARCHAR(100),
  ADD COLUMN IF NOT EXISTS juego_articular_3_endfeel VARCHAR(100);

-- 2. Nueva columna JSONB para horarios flexibles día por día en la configuración de agenda
ALTER TABLE IF EXISTS public.configuracion_agenda 
  ADD COLUMN IF NOT EXISTS horarios_por_dia JSONB;
