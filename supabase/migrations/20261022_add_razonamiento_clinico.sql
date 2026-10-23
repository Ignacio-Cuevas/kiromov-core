-- Migración: Agregar columna para Razonamiento Clínico Biomecánico y pruebas estructuradas
ALTER TABLE IF EXISTS public.evaluaciones_iniciales_tmo 
  ADD COLUMN IF NOT EXISTS razonamiento_clinico TEXT;
