-- ==========================================
-- DDL de Esquema Inicial Kiromov Core
-- Generado desde Inferencias de Tipos TypeScript
-- ==========================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLAS PRINCIPALES
-- ==========================================

CREATE TABLE public.pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_paciente VARCHAR(50) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rut VARCHAR(20) UNIQUE,
    telefono VARCHAR(50),
    email VARCHAR(255),
    fecha_nacimiento DATE,
    prevision_salud VARCHAR(50) DEFAULT 'Particular',
    motivo_consulta TEXT,
    diagnostico_medico TEXT,
    diagnostico_principal TEXT,
    antecedentes_medicos TEXT,
    banderas_rojas TEXT,
    estado VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- (Legacy patients table)
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    rut VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    birth_date DATE,
    health_insurance VARCHAR(50),
    medical_notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.catalogo_planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_plan VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    tipo VARCHAR(50),
    total_sesiones INTEGER NOT NULL,
    precio_clp INTEGER NOT NULL,
    activo BOOLEAN DEFAULT true,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.compras_planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    catalogo_plan_id UUID REFERENCES public.catalogo_planes(id),
    nombre_plan VARCHAR(255) NOT NULL,
    total_sesiones INTEGER NOT NULL,
    sesiones_usadas INTEGER DEFAULT 0,
    monto_clp INTEGER NOT NULL,
    descuento_clp INTEGER DEFAULT 0,
    numero_boleta VARCHAR(100),
    metodo_pago VARCHAR(50),
    estado_pago VARCHAR(50) DEFAULT 'Pagado',
    estado VARCHAR(50) DEFAULT 'activo',
    fecha_compra DATE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.citas_atenciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    compra_plan_id UUID REFERENCES public.compras_planes(id),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    profesional VARCHAR(255) NOT NULL,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    motivo_consulta TEXT,
    notas TEXT,
    google_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.evoluciones_soap (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    cita_id UUID REFERENCES public.citas_atenciones(id),
    fecha DATE NOT NULL,
    profesional VARCHAR(255),
    s_subjetivo TEXT,
    o_objetivo TEXT,
    a_analisis TEXT,
    p_plan TEXT,
    nivel_dolor_ena INTEGER CHECK (nivel_dolor_ena >= 0 AND nivel_dolor_ena <= 10),
    mapa_dolor_svg TEXT,
    hallazgos_frecuentes JSONB,
    cuestionario_funcional VARCHAR(255),
    discapacidad_funcional_pct NUMERIC,
    pronostico_sesiones_estimadas VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.egresos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concepto VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    monto_clp INTEGER NOT NULL,
    medio_pago VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    observacion TEXT,
    comprobante_ref VARCHAR(255),
    responsable VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 2. VISTAS SQL
-- ==========================================

CREATE OR REPLACE VIEW vista_resumen_pacientes AS
SELECT 
    p.id,
    p.codigo_paciente,
    p.nombre_completo,
    p.rut,
    p.telefono,
    p.email,
    COALESCE(cp.total_sesiones, 0) as total_sesiones,
    COALESCE(cp.sesiones_usadas, 0) as sesiones_consumidas,
    GREATEST(COALESCE(cp.total_sesiones, 0) - COALESCE(cp.sesiones_usadas, 0), 0) as sesiones_restantes,
    (
        SELECT COUNT(*) FROM citas_atenciones ca 
        WHERE ca.paciente_id = p.id AND ca.estado IN ('No Asistió', 'Inasistencia (Descuenta Sesión)')
    ) as inasistencias_acumuladas,
    (
        SELECT MAX(fecha) FROM citas_atenciones ca 
        WHERE ca.paciente_id = p.id AND ca.estado = 'Atendido'
    ) as ultima_atencion,
    CASE 
        WHEN cp.id IS NULL THEN 'Sin Plan Activo'
        WHEN (cp.total_sesiones - cp.sesiones_usadas) <= 0 THEN 'Plan Finalizado'
        WHEN (cp.total_sesiones - cp.sesiones_usadas) = 1 THEN 'Por Renovar (1 restante)'
        ELSE 'Plan Vigente'
    END as estado_plan,
    p.fecha_nacimiento,
    p.prevision_salud,
    p.estado as estado_paciente
FROM public.pacientes p
LEFT JOIN public.compras_planes cp ON cp.paciente_id = p.id AND cp.estado = 'activo';


-- ==========================================
-- 3. SEGURIDAD (Row Level Security - RLS)
-- ==========================================

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas_atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evoluciones_soap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos_caja ENABLE ROW LEVEL SECURITY;

-- Políticas de autenticación requerida para acceso
CREATE POLICY "Enable read access for authenticated users only"
ON public.pacientes FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users only"
ON public.pacientes FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
ON public.pacientes FOR UPDATE
TO authenticated USING (true);

-- (Mismo patrón sugerido para las demás tablas)
