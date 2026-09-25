-- ====================================================================
-- Migración: Tabla Independiente de Configuración de Horarios de Box
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.configuracion_horarios_box (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia_semana INT NOT NULL, -- 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 0=Domingo
    activo BOOLEAN NOT NULL DEFAULT true,
    manana_activa BOOLEAN NOT NULL DEFAULT true,
    manana_inicio TIME NOT NULL DEFAULT '09:00',
    manana_fin TIME NOT NULL DEFAULT '13:00',
    colacion_activa BOOLEAN NOT NULL DEFAULT true,
    colacion_inicio TIME NOT NULL DEFAULT '13:00',
    colacion_fin TIME NOT NULL DEFAULT '14:00',
    tarde_activa BOOLEAN NOT NULL DEFAULT true,
    tarde_inicio TIME NOT NULL DEFAULT '14:00',
    tarde_fin TIME NOT NULL DEFAULT '20:00',
    duracion_bloque_min INT NOT NULL DEFAULT 45,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_horarios_box_dia UNIQUE (dia_semana)
);

ALTER TABLE IF EXISTS public.configuracion_horarios_box
  ADD COLUMN IF NOT EXISTS manana_activa BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tarde_activa BOOLEAN DEFAULT true;

ALTER TABLE public.configuracion_horarios_box ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Disponibilidad gestionable por autenticados" ON public.configuracion_horarios_box;
CREATE POLICY "Disponibilidad gestionable por autenticados"
ON public.configuracion_horarios_box FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Insertar configuración inicial por defecto de Kiromov si no existe
INSERT INTO public.configuracion_horarios_box 
  (dia_semana, activo, manana_activa, manana_inicio, manana_fin, colacion_activa, colacion_inicio, colacion_fin, tarde_activa, tarde_inicio, tarde_fin, duracion_bloque_min)
VALUES 
  (1, true,  true,  '09:00', '13:00', true,  '13:00', '14:00', true,  '14:00', '20:00', 45), -- Lunes
  (2, false, true,  '09:00', '13:00', true,  '13:00', '14:00', true,  '14:00', '20:00', 45), -- Martes
  (3, true,  true,  '09:00', '13:00', true,  '13:00', '14:00', true,  '14:00', '20:00', 45), -- Miércoles
  (4, true,  true,  '10:00', '14:00', false, '14:00', '15:00', true,  '15:00', '19:00', 45), -- Jueves
  (5, true,  true,  '09:00', '13:00', true,  '13:00', '14:00', true,  '14:00', '20:00', 45), -- Viernes
  (6, true,  true,  '10:00', '14:00', false, '14:00', '15:00', false, '14:00', '14:00', 45), -- Sábado (Sólo Mañana)
  (0, false, false, '10:00', '14:00', false, '14:00', '15:00', false, '14:00', '14:00', 45)  -- Domingo
ON CONFLICT (dia_semana) DO NOTHING;
