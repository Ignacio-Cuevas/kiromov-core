-- ====================================================================
-- MIGRACIÓN: ARQUITECTURA MULTI-SEDE (CHILLÁN Y CONCEPCIÓN)
-- ====================================================================

-- 1. Agregar columnas de sede y profesional_email
ALTER TABLE IF EXISTS public.citas_atenciones
  ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'chillan',
  ADD COLUMN IF NOT EXISTS profesional_email VARCHAR(255) DEFAULT 'ignacio@kiromov.cl';

ALTER TABLE IF EXISTS public.bloqueos_agenda
  ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'chillan';

ALTER TABLE IF EXISTS public.pacientes
  ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'chillan';

ALTER TABLE IF EXISTS public.egresos_caja
  ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'chillan';

ALTER TABLE IF EXISTS public.pagos_pacientes
  ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'chillan';

ALTER TABLE IF EXISTS public.compras_planes
  ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'chillan';

-- 2. Índices de alto rendimiento para filtrado por sede
CREATE INDEX IF NOT EXISTS idx_citas_sede ON public.citas_atenciones(sede);
CREATE INDEX IF NOT EXISTS idx_bloqueos_sede ON public.bloqueos_agenda(sede);
CREATE INDEX IF NOT EXISTS idx_pacientes_sede ON public.pacientes(sede);
CREATE INDEX IF NOT EXISTS idx_egresos_sede ON public.egresos_caja(sede);
CREATE INDEX IF NOT EXISTS idx_pagos_sede ON public.pagos_pacientes(sede);
CREATE INDEX IF NOT EXISTS idx_compras_planes_sede ON public.compras_planes(sede);

-- 3. Actualizar vista_resumen_pacientes para incluir sede
DROP VIEW IF EXISTS public.vista_resumen_pacientes CASCADE;

CREATE OR REPLACE VIEW public.vista_resumen_pacientes AS
WITH ultimas_atenciones AS (
    SELECT 
        paciente_id,
        MAX(fecha) AS ultima_atencion,
        COUNT(*) FILTER (WHERE estado IN ('Asistió', 'asistio', 'asistió', 'Atendido', 'atendido', 'Inasistencia (Descuenta Sesión)')) AS total_asistencias,
        COUNT(*) FILTER (WHERE estado IN ('Inasistencia (Descuenta Sesión)', 'No Asistió', 'no_asistio')) AS inasistencias_acumuladas
    FROM public.citas_atenciones
    GROUP BY paciente_id
),
resumen_planes AS (
    SELECT 
        paciente_id,
        COALESCE(SUM(total_sesiones), 0) AS total_sesiones_compradas,
        COUNT(*) FILTER (WHERE estado = 'activo') AS planes_activos_count
    FROM public.compras_planes
    GROUP BY paciente_id
)
SELECT 
    p.id,
    p.codigo_paciente,
    p.nombre_completo,
    p.rut,
    p.telefono,
    p.email,
    p.fecha_nacimiento,
    p.prevision_salud,
    p.motivo_consulta,
    p.diagnostico_medico,
    p.diagnostico_principal,
    p.antecedentes_medicos,
    p.banderas_rojas,
    p.estado AS estado_paciente,
    COALESCE(p.sede, 'chillan') AS sede,
    COALESCE(rp.total_sesiones_compradas, 0)::INTEGER AS total_sesiones,
    COALESCE(ua.total_asistencias, 0)::INTEGER AS sesiones_consumidas,
    GREATEST(0, (COALESCE(rp.total_sesiones_compradas, 0) - COALESCE(ua.total_asistencias, 0)))::INTEGER AS sesiones_restantes,
    COALESCE(ua.inasistencias_acumuladas, 0)::INTEGER AS inasistencias_acumuladas,
    ua.ultima_atencion,
    CASE 
        WHEN ua.ultima_atencion IS NOT NULL THEN (CURRENT_DATE - ua.ultima_atencion)::INTEGER
        ELSE NULL
    END AS dias_sin_atencion,
    CASE
        WHEN COALESCE(rp.total_sesiones_compradas, 0) = 0 THEN 'Sin Plan Activo'
        WHEN (COALESCE(rp.total_sesiones_compradas, 0) - COALESCE(ua.total_asistencias, 0)) <= 0 THEN 'Plan Finalizado'
        WHEN (COALESCE(rp.total_sesiones_compradas, 0) - COALESCE(ua.total_asistencias, 0)) = 1 THEN 'Por Renovar (1 restante)'
        ELSE 'Plan Vigente'
    END AS estado_plan
FROM public.pacientes p
LEFT JOIN resumen_planes rp ON p.id = rp.paciente_id
LEFT JOIN ultimas_atenciones ua ON p.id = ua.paciente_id
ORDER BY p.nombre_completo ASC;
