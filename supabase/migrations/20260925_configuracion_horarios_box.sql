-- ====================================================================
-- Migración: Tabla Independiente de Configuración de Horarios de Box
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.configuracion_horarios_box (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia_semana INT NOT NULL, -- 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 0=Domingo
    activo BOOLEAN NOT NULL DEFAULT true,
    manana_inicio TIME NOT NULL DEFAULT '09:00',
    manana_fin TIME NOT NULL DEFAULT '13:00',
    colacion_activa BOOLEAN NOT NULL DEFAULT true,
    colacion_inicio TIME NOT NULL DEFAULT '13:00',
    colacion_fin TIME NOT NULL DEFAULT '14:00',
    tarde_inicio TIME NOT NULL DEFAULT '14:00',
    tarde_fin TIME NOT NULL DEFAULT '20:00',
    duracion_bloque_min INT NOT NULL DEFAULT 45,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_horarios_box_dia UNIQUE (dia_semana)
);

ALTER TABLE public.configuracion_horarios_box ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Disponibilidad gestionable por autenticados" ON public.configuracion_horarios_box;
CREATE POLICY "Disponibilidad gestionable por autenticados"
ON public.configuracion_horarios_box FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Insertar configuración inicial por defecto de Kiromov si no existe
INSERT INTO public.configuracion_horarios_box 
  (dia_semana, activo, manana_inicio, manana_fin, colacion_activa, colacion_inicio, colacion_fin, tarde_inicio, tarde_fin, duracion_bloque_min)
VALUES 
  (1, true,  '09:00', '13:00', true,  '13:00', '14:00', '14:00', '20:00', 45), -- Lunes
  (2, false, '09:00', '13:00', true,  '13:00', '14:00', '14:00', '20:00', 45), -- Martes
  (3, true,  '09:00', '13:00', true,  '13:00', '14:00', '14:00', '20:00', 45), -- Miércoles
  (4, true,  '10:00', '14:00', false, '14:00', '15:00', '14:00', '14:00', 45), -- Jueves
  (5, true,  '09:00', '13:00', true,  '13:00', '14:00', '14:00', '20:00', 45), -- Viernes
  (6, true,  '10:00', '14:00', false, '14:00', '15:00', '14:00', '14:00', 45), -- Sábado
  (0, false, '10:00', '14:00', false, '14:00', '15:00', '14:00', '14:00', 45)  -- Domingo
ON CONFLICT (dia_semana) DO NOTHING;
