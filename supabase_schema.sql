-- ==========================================================
-- KIROMOV CENTRO CLÍNICO - ESQUEMA DE BASE DE DATOS SUPABASE
-- ==========================================================

-- Extensión UUID si no está activada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. TABLA: catalogo_planes (Catálogo Maestro de Tarifas y Convenios)
CREATE TABLE IF NOT EXISTS catalogo_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_plan VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'General', -- 'General', 'Convenio', 'Promoción', 'Personalizado'
    total_sesiones INTEGER NOT NULL DEFAULT 1,
    precio_clp NUMERIC(12, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. TABLA: cupones_descuento (Códigos de Descuento y GiftCards)
CREATE TABLE IF NOT EXISTS cupones_descuento (
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

-- 2. TABLA: egresos_caja (Flujo de Salidas y Gastos de Operación)
CREATE TABLE IF NOT EXISTS egresos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concepto VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'Insumos Médicos', -- 'Insumos Médicos', 'Equipamiento', 'Servicios Básicos', 'Arriendo', 'Marketing', 'Personal', 'Otros'
    monto_clp NUMERIC(12, 2) NOT NULL DEFAULT 0,
    medio_pago VARCHAR(50) NOT NULL DEFAULT 'Transferencia', -- 'Transferencia', 'Efectivo', 'Tarjeta Débito/Crédito', 'Cheque'
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    comprobante_ref VARCHAR(100),
    responsable VARCHAR(255) NOT NULL DEFAULT 'Klgo. Ignacio Cuevas Silva',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_paciente VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    fecha_nacimiento DATE,
    diagnostico_principal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: compras_planes (Historial de Transacciones de Planes)
CREATE TABLE IF NOT EXISTS compras_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    catalogo_plan_id UUID REFERENCES catalogo_planes(id) ON DELETE SET NULL,
    nombre_plan VARCHAR(150) NOT NULL,
    total_sesiones INTEGER NOT NULL DEFAULT 0,
    precio_base NUMERIC(12, 2) DEFAULT 0,
    descuento_clp NUMERIC(12, 2) DEFAULT 0,
    codigo_cupon VARCHAR(50),
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_final_clp NUMERIC(12, 2) DEFAULT 0,
    fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo', -- 'activo', 'finalizado', 'cancelado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA: citas_atenciones
CREATE TABLE IF NOT EXISTS citas_atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    compra_plan_id UUID REFERENCES compras_planes(id) ON DELETE SET NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME WITHOUT TIME ZONE DEFAULT CURRENT_TIME,
    profesional VARCHAR(255) NOT NULL DEFAULT 'Klgo. Ignacio Cuevas Silva',
    estado VARCHAR(50) NOT NULL DEFAULT 'Asistió', -- 'Asistió', 'Cancelado', 'No Asistió'
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA: evoluciones_soap
CREATE TABLE IF NOT EXISTS evoluciones_soap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    cita_id UUID REFERENCES citas_atenciones(id) ON DELETE SET NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_catalogo_activo ON catalogo_planes(activo, categoria);
CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON cupones_descuento(codigo);
CREATE INDEX IF NOT EXISTS idx_egresos_fecha ON egresos_caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pacientes_rut ON pacientes(rut);
CREATE INDEX IF NOT EXISTS idx_pacientes_codigo ON pacientes(codigo_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha ON citas_atenciones(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_evoluciones_paciente ON evoluciones_soap(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_planes_paciente ON compras_planes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_planes_fecha ON compras_planes(fecha_compra DESC);

-- ==========================================================
-- 7. VISTA PRINCIPAL: vista_resumen_pacientes
-- ==========================================================
DROP VIEW IF EXISTS vista_resumen_pacientes CASCADE;

CREATE OR REPLACE VIEW vista_resumen_pacientes AS
WITH ultimas_atenciones AS (
    SELECT 
        paciente_id,
        MAX(fecha) AS ultima_atencion,
        COUNT(*) FILTER (WHERE estado = 'Asistió') AS total_asistencias
    FROM citas_atenciones
    GROUP BY paciente_id
),
resumen_planes AS (
    SELECT 
        paciente_id,
        COALESCE(SUM(total_sesiones), 0) AS total_sesiones_compradas,
        COUNT(*) FILTER (WHERE estado = 'activo') AS planes_activos_count
    FROM compras_planes
    GROUP BY paciente_id
)
SELECT 
    p.id,
    p.codigo_paciente,
    p.nombre_completo,
    p.rut,
    p.telefono,
    p.email,
    COALESCE(rp.total_sesiones_compradas, 0)::INTEGER AS total_sesiones,
    COALESCE(ua.total_asistencias, 0)::INTEGER AS sesiones_consumidas,
    GREATEST(0, (COALESCE(rp.total_sesiones_compradas, 0) - COALESCE(ua.total_asistencias, 0)))::INTEGER AS sesiones_restantes,
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
FROM pacientes p
LEFT JOIN resumen_planes rp ON p.id = rp.paciente_id
LEFT JOIN ultimas_atenciones ua ON p.id = ua.paciente_id
ORDER BY p.nombre_completo ASC;

-- ==========================================================
-- 8. DATOS DE PRUEBA REALISTAS PARA KIROMOV
-- ==========================================================

-- Catálogo de Tarifas y Convenios
INSERT INTO catalogo_planes (id, nombre_plan, categoria, total_sesiones, precio_clp, activo, descripcion)
VALUES
    ('cat-0100-0000-0000-0000-000000000001', 'Sesión Individual de Kinesiología', 'General', 1, 30000, true, 'Atención kinésica unitaria con evaluación y tratamiento.'),
    ('cat-0100-0000-0000-0000-000000000002', 'Pack Terapéutico (4 Sesiones)', 'General', 4, 100000, true, 'Pack de 4 sesiones continuas para lesiones agudas o subagudas.'),
    ('cat-0100-0000-0000-0000-000000000003', 'Plan Recuperación Lumbar (6 Sesiones)', 'General', 6, 150000, true, 'Programa intensivo de estabilización lumbopélvica y columna.'),
    ('cat-0100-0000-0000-0000-000000000004', 'Plan Kinesiología Integral (10 Sesiones)', 'General', 10, 220000, true, 'Tratamiento completo con reeducación funcional y reintegro deportivo.'),
    ('cat-0100-0000-0000-0000-000000000005', 'Plan Post-Quirúrgico (12 Sesiones)', 'General', 12, 260000, true, 'Rehabilitación postoperatoria (LCA, meniscos, manguito rotador).'),
    ('cat-0100-0000-0000-0000-000000000006', 'Convenio - Activa Care (4 Sesiones)', 'Convenio', 4, 65000, true, 'Tarifa preferencial convenio institucional Activa Care.'),
    ('cat-0100-0000-0000-0000-000000000007', 'Convenio Isapre Preferencial (6 Sesiones)', 'Convenio', 6, 135000, true, 'Tarifa con reembolso y cobertura preferencial.'),
    ('cat-0100-0000-0000-0000-000000000008', 'Convenio Club Deportivo (8 Sesiones)', 'Convenio', 8, 160000, true, 'Atención para deportistas federados y asociados.'),
    ('cat-0100-0000-0000-0000-000000000009', 'Promo Evaluación + 3 Sesiones Reinserción', 'Promoción', 4, 89990, true, 'Promoción de bienvenida para nuevos pacientes.')
ON CONFLICT (id) DO NOTHING;

-- Cupones de Descuento
INSERT INTO cupones_descuento (codigo, descripcion, tipo, valor_descuento, limite_usos, usos_actuales, activo, fecha_expiracion)
VALUES
    ('BIENVENIDA', 'Descuento de bienvenida para pacientes primerizos', 'monto_fijo', 15000, 100, 14, true, '2026-12-31'),
    ('KIRO10', '10% de descuento en planes de 6 a 12 sesiones', 'porcentaje', 10, 50, 8, true, '2026-11-30'),
    ('CONVENIO2026', 'Rebaja especial de $20.000 CLP para convenios', 'monto_fijo', 20000, 30, 5, true, '2026-12-31')
ON CONFLICT (codigo) DO NOTHING;

-- Egresos de Caja
INSERT INTO egresos_caja (concepto, categoria, monto_clp, medio_pago, fecha, comprobante_ref, responsable)
VALUES
    ('Reposición Cintas Kinesiotape (Rollos x 10)', 'Insumos Médicos', 45000, 'Transferencia', CURRENT_DATE - INTERVAL '2 days', 'FAC-8812', 'Klgo. Ignacio Cuevas Silva'),
    ('Cremas y Aceite de Masaje Neutro con Árnica (5L)', 'Insumos Médicos', 28000, 'Tarjeta Débito/Crédito', CURRENT_DATE - INTERVAL '5 days', 'BOL-19234', 'Klgo. Ignacio Cuevas Silva'),
    ('Gasto Eléctrico y Climatización Box Clínico', 'Servicios Básicos', 62000, 'Transferencia', CURRENT_DATE - INTERVAL '10 days', 'ENEL-9921', 'Administración Kiromov'),
    ('Campaña Publicitaria Meta Ads (Rehabilitación Lumbar)', 'Marketing', 35000, 'Tarjeta Débito/Crédito', CURRENT_DATE - INTERVAL '15 days', 'INV-META-2026-08', 'Klgo. Ignacio Cuevas Silva')
ON CONFLICT DO NOTHING;

-- Pacientes
INSERT INTO pacientes (id, codigo_paciente, nombre_completo, rut, telefono, email, fecha_nacimiento, diagnostico_principal)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'KIR-1001', 'Valentina Andrea Rojas Silva', '17.842.934-2', '+56987654321', 'v.rojas@gmail.com', '1991-04-12', 'Lumbago Mecánico Agudo / Radiculopatía L5'),
    ('22222222-2222-2222-2222-222222222222', 'KIR-1002', 'Matías Eduardo González Bravo', '19.324.512-K', '+56976543210', 'matias.gonzalez@empresa.cl', '1996-08-25', 'Tendinopatía Rotuliana Derecha'),
    ('33333333-3333-3333-3333-333333333333', 'KIR-1003', 'Camila Paz Morales Henríquez', '16.512.443-8', '+56965432109', 'camila.morales@hotmail.com', '1987-11-03', 'Cervicobraquialgia Izquierda'),
    ('44444444-4444-4444-4444-444444444444', 'KIR-1004', 'Rodrigo Andrés Castro Muñoz', '15.981.234-5', '+56954321098', 'rcastro.m@gmail.com', '1984-02-18', 'Esguince de Tobillo Grado II'),
    ('55555555-5555-5555-5555-555555555555', 'KIR-1005', 'Francisca Belén Soto Navarro', '18.776.432-1', '+56943210987', 'fran.soto.n@gmail.com', '1994-09-30', 'Post-operatorio LCA Rodilla Izq.'),
    ('66666666-6666-6666-6666-666666666666', 'KIR-1006', 'Joaquín Ignacio Tapia Vargas', '20.123.876-3', '+56932109876', 'joaquin.tapia@outlook.cl', '1999-01-14', 'Síndrome de Dolor Patelofemoral')
ON CONFLICT (id) DO NOTHING;

-- Planes
INSERT INTO compras_planes (id, paciente_id, nombre_plan, total_sesiones, precio_base, descuento_clp, codigo_cupon, valor_total, total_final_clp, fecha_compra, estado)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Plan Kinesiología Integral (10 Sesiones)', 10, 220000, 0, NULL, 220000, 220000, CURRENT_DATE - INTERVAL '25 days', 'activo'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Pack Terapéutico (4 Sesiones)', 4, 100000, 15000, 'BIENVENIDA', 85000, 85000, CURRENT_DATE - INTERVAL '12 days', 'activo'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Plan Recuperación Lumbar (6 Sesiones)', 6, 150000, 0, NULL, 150000, 150000, CURRENT_DATE - INTERVAL '40 days', 'activo'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'Plan Kine Rápida (4 Sesiones)', 4, 100000, 0, NULL, 100000, 100000, CURRENT_DATE - INTERVAL '15 days', 'activo'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 'Plan Post-Quirúrgico (12 Sesiones)', 12, 260000, 26000, 'KIRO10', 234000, 234000, CURRENT_DATE - INTERVAL '60 days', 'activo')
ON CONFLICT (id) DO NOTHING;

-- Atenciones registradas
INSERT INTO citas_atenciones (paciente_id, compra_plan_id, fecha, hora, profesional, estado, notas)
VALUES
    -- Valentina
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '20 days', '10:00', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Evaluación inicial y pauta antiinflamatoria'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '16 days', '10:00', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Terapia manual raquídea y neurodinamia'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '12 days', '10:30', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Estabilidad lumbopélvica control motor'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '8 days', '10:00', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Carga progresiva y ejercicios de bisagra de cadera'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '4 days', '11:00', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Buen avance sin irradiación distal'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE, '09:30', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Atención realizada hoy, gran tolerancia'),

    -- Matías
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '10 days', '11:00', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Evaluación y trabajo isométrico cuadriceps'),
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '6 days', '11:30', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Heavy slow resistance squat y liberación miofascial'),
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '1 days', '16:00', 'Klgo. Ignacio Cuevas Silva', 'Asistió', 'Criterios de pliometría controlada. Queda 1 sesión del plan.');
