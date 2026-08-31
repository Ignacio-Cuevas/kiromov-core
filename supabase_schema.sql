-- ==========================================================
-- KIROMOV CENTRO CLÍNICO - ESQUEMA DE BASE DE DATOS SUPABASE
-- Sistema de Gestión Clínica, Box, Pacientes, Tarifas y Ventas
-- ==========================================================

-- Extensión UUID si no está activada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------
-- 1. TABLA: catalogo_planes (Catálogo Maestro de Tarifas y Servicios)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_plan VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'General', -- 'General', 'Convenio', 'Promoción', 'Personalizado'
    tipo VARCHAR(50) NOT NULL DEFAULT 'plan',          -- 'plan', 'single_session', 'evaluation'
    total_sesiones INTEGER NOT NULL DEFAULT 1,
    precio_clp NUMERIC(12, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 2. TABLA: cupones_descuento (Códigos de Descuento y GiftCards)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cupones_descuento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'monto_fijo', -- 'monto_fijo' | 'porcentaje'
    valor_descuento NUMERIC(12, 2) NOT NULL DEFAULT 0,
    limite_usos INTEGER,
    usos_actuales INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_expiracion DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3. TABLA: egresos_caja (Flujo de Salidas y Gastos de Operación)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.egresos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concepto VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'Insumos Clínicos', -- 'Insumos Clínicos', 'Servicios Básicos', 'Arriendo', 'Marketing', 'Equipamiento', 'Otros'
    monto_clp NUMERIC(12, 2) NOT NULL DEFAULT 0,
    medio_pago VARCHAR(50) NOT NULL DEFAULT 'Transferencia', -- 'Transferencia', 'Efectivo', 'Débito / Transbank'
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    comprobante_ref VARCHAR(100),
    responsable VARCHAR(255) NOT NULL DEFAULT 'Klgo. Ignacio Cuevas Silva',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 4. TABLA: pacientes (Directorio de Pacientes y Ficha Médica)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_paciente VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    fecha_nacimiento DATE,
    prevision_salud VARCHAR(50) DEFAULT 'Particular', -- 'Particular', 'Fonasa', 'Isapre', 'Convenio'
    motivo_consulta TEXT,
    diagnostico_medico TEXT,
    diagnostico_principal TEXT,
    antecedentes_medicos TEXT,
    banderas_rojas TEXT,
    estado VARCHAR(30) DEFAULT 'active',              -- 'active', 'discharged', 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5. TABLA: compras_planes (Registro de Ventas y Compras de Planes)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    catalogo_plan_id UUID REFERENCES public.catalogo_planes(id) ON DELETE SET NULL,
    nombre_plan VARCHAR(150) NOT NULL,
    total_sesiones INTEGER NOT NULL DEFAULT 0,
    precio_base NUMERIC(12, 2) DEFAULT 0,
    descuento_clp NUMERIC(12, 2) DEFAULT 0,
    codigo_cupon VARCHAR(50),
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_final_clp NUMERIC(12, 2) DEFAULT 0,
    medio_pago VARCHAR(50) DEFAULT 'Transferencia',
    estado_pago VARCHAR(50) DEFAULT 'Pagado',          -- 'Pagado', 'Pendiente de Pago', 'Parcial / Cuotas'
    fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',      -- 'activo', 'finalizado', 'cancelado'
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 6. TABLA: citas_atenciones (Agenda y Registro de Asistencias)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.citas_atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    compra_plan_id UUID REFERENCES public.compras_planes(id) ON DELETE SET NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME WITHOUT TIME ZONE DEFAULT CURRENT_TIME,
    profesional VARCHAR(255) NOT NULL DEFAULT 'Klgo. Ignacio Cuevas Silva',
    estado VARCHAR(50) NOT NULL DEFAULT 'Asistió',     -- 'Asistió', 'Inasistencia (Descuenta Sesión)', 'Cancelado con Aviso', 'Inasistencia Justificada', 'En Sala', 'Pendiente'
    motivo_consulta TEXT,
    notas TEXT,
    google_event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 7. TABLA: evoluciones_soap (Ficha Clínica y Evolución SOAP)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evoluciones_soap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    cita_id UUID REFERENCES public.citas_atenciones(id) ON DELETE SET NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    profesional VARCHAR(255) NOT NULL DEFAULT 'Klgo. Ignacio Cuevas Silva',
    s_subjetivo TEXT,
    subjetivo TEXT,
    o_objetivo TEXT,
    objetivo TEXT,
    nivel_dolor_ena INTEGER CHECK (nivel_dolor_ena >= 0 AND nivel_dolor_ena <= 10),
    ena_dolor INTEGER CHECK (ena_dolor >= 0 AND ena_dolor <= 10),
    a_analisis TEXT,
    analisis TEXT,
    p_plan TEXT,
    plan TEXT,
    mapa_dolor_svg TEXT,
    hallazgos_frecuentes TEXT[],
    cuestionario_funcional TEXT,
    discapacidad_funcional_pct NUMERIC(5, 2),
    pronostico_sesiones_estimadas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- ÍNDICES PARA ALTO RENDIMIENTO
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_catalogo_activo ON public.catalogo_planes(activo, categoria);
CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON public.cupones_descuento(codigo);
CREATE INDEX IF NOT EXISTS idx_egresos_fecha ON public.egresos_caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pacientes_rut ON public.pacientes(rut);
CREATE INDEX IF NOT EXISTS idx_pacientes_codigo ON public.pacientes(codigo_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha ON public.citas_atenciones(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_evoluciones_paciente ON public.evoluciones_soap(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_planes_paciente ON public.compras_planes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_planes_fecha ON public.compras_planes(fecha_compra DESC);

-- ----------------------------------------------------------
-- 8. POLÍTICAS DE SEGURIDAD (RLS) PARA USUARIOS AUTENTICADOS
-- ----------------------------------------------------------
ALTER TABLE public.catalogo_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupones_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas_atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evoluciones_soap ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated all on catalogo_planes" ON public.catalogo_planes;
    DROP POLICY IF EXISTS "Allow authenticated all on cupones_descuento" ON public.cupones_descuento;
    DROP POLICY IF EXISTS "Allow authenticated all on egresos_caja" ON public.egresos_caja;
    DROP POLICY IF EXISTS "Allow authenticated all on pacientes" ON public.pacientes;
    DROP POLICY IF EXISTS "Allow authenticated all on compras_planes" ON public.compras_planes;
    DROP POLICY IF EXISTS "Allow authenticated all on citas_atenciones" ON public.citas_atenciones;
    DROP POLICY IF EXISTS "Allow authenticated all on evoluciones_soap" ON public.evoluciones_soap;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow authenticated all on catalogo_planes" ON public.catalogo_planes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on cupones_descuento" ON public.cupones_descuento FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on egresos_caja" ON public.egresos_caja FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on pacientes" ON public.pacientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on compras_planes" ON public.compras_planes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on citas_atenciones" ON public.citas_atenciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all on evoluciones_soap" ON public.evoluciones_soap FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- 9. VISTA PRINCIPAL: vista_resumen_pacientes
-- ----------------------------------------------------------
DROP VIEW IF EXISTS public.vista_resumen_pacientes CASCADE;

CREATE OR REPLACE VIEW public.vista_resumen_pacientes AS
WITH ultimas_atenciones AS (
    SELECT 
        paciente_id,
        MAX(fecha) AS ultima_atencion,
        COUNT(*) FILTER (WHERE estado IN ('Asistió', 'Atendido', 'Inasistencia (Descuenta Sesión)')) AS total_asistencias,
        COUNT(*) FILTER (WHERE estado IN ('Inasistencia (Descuenta Sesión)', 'No Asistió')) AS inasistencias_acumuladas
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

-- ----------------------------------------------------------
-- 10. DATOS INICIALES REALISTAS
-- ----------------------------------------------------------

-- Catálogo de Tarifas
INSERT INTO public.catalogo_planes (id, nombre_plan, categoria, tipo, total_sesiones, precio_clp, activo, descripcion)
VALUES
    ('cat-0100-0000-0000-0000-000000000001', 'Sesión Individual de Kinesiología', 'General', 'single_session', 1, 30000, true, 'Atención kinésica unitaria con evaluación y tratamiento.'),
    ('cat-0100-0000-0000-0000-000000000002', 'Pack Terapéutico (4 Sesiones)', 'General', 'plan', 4, 100000, true, 'Pack de 4 sesiones continuas para lesiones agudas o subagudas.'),
    ('cat-0100-0000-0000-0000-000000000003', 'Plan Recuperación Lumbar (6 Sesiones)', 'General', 'plan', 6, 150000, true, 'Programa intensivo de estabilización lumbopélvica y columna.'),
    ('cat-0100-0000-0000-0000-000000000004', 'Plan Kinesiología Integral (10 Sesiones Pro Care)', 'General', 'plan', 10, 220000, true, 'Tratamiento completo con reeducación funcional y reintegro deportivo.'),
    ('cat-0100-0000-0000-0000-000000000005', 'Plan Post-Quirúrgico (12 Sesiones)', 'General', 'plan', 12, 260000, true, 'Rehabilitación postoperatoria (LCA, meniscos, manguito rotador).'),
    ('cat-0100-0000-0000-0000-000000000006', 'Convenio - Activa Care (4 Sesiones)', 'Convenio', 'plan', 4, 65000, true, 'Tarifa preferencial convenio institucional Activa Care.'),
    ('cat-0100-0000-0000-0000-000000000007', 'Convenio Isapre Preferencial (6 Sesiones)', 'Convenio', 'plan', 6, 135000, true, 'Tarifa con reembolso y cobertura preferencial.'),
    ('cat-0100-0000-0000-0000-000000000008', 'Convenio Club Deportivo (8 Sesiones)', 'Convenio', 'plan', 8, 160000, true, 'Atención para deportistas federados y asociados.'),
    ('cat-0100-0000-0000-0000-000000000009', 'Evaluación Kine + TMO Inicial', 'Promoción', 'evaluation', 1, 35000, true, 'Evaluación biomecánica completa con diagnóstico diferencial TMO.')
ON CONFLICT (id) DO NOTHING;

-- Cupones
INSERT INTO public.cupones_descuento (codigo, descripcion, tipo, valor_descuento, limite_usos, usos_actuales, activo, fecha_expiracion)
VALUES
    ('BIENVENIDA', 'Descuento de bienvenida para pacientes primerizos', 'monto_fijo', 15000, 100, 14, true, '2026-12-31'),
    ('KIRO10', '10% de descuento en planes de 6 a 12 sesiones', 'porcentaje', 10, 50, 8, true, '2026-11-30'),
    ('CONVENIO2026', 'Rebaja especial de $20.000 CLP para convenios', 'monto_fijo', 20000, 30, 5, true, '2026-12-31')
ON CONFLICT (codigo) DO NOTHING;
