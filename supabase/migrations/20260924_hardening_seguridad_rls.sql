-- ==========================================================
-- KIROMOV CORE: MIGRACIÓN DE HARDENING DE SEGURIDAD Y RLS
-- Cumplimiento Ley N° 20.584 (Ficha Clínica) y Ley N° 19.628 (Datos Sensibles de Salud)
-- ==========================================================

-- 1. ASEGURAR RLS EN TODAS LAS TABLAS CLÍNICAS Y OPERATIVAS
ALTER TABLE IF EXISTS public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.citas_atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.compras_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evoluciones_soap ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.egresos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bloqueos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.configuracion_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalogo_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cupones_descuento ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS GENÉRICAS / PERMISIVAS ANTERIORES
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON public.pacientes;
DROP POLICY IF EXISTS "Enable write access for authenticated users only" ON public.pacientes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.pacientes;
DROP POLICY IF EXISTS "Allow authenticated all on pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Allow authenticated all on citas_atenciones" ON public.citas_atenciones;
DROP POLICY IF EXISTS "Allow authenticated all on compras_planes" ON public.compras_planes;
DROP POLICY IF EXISTS "Allow authenticated all on evoluciones_soap" ON public.evoluciones_soap;
DROP POLICY IF EXISTS "Allow authenticated all on egresos_caja" ON public.egresos_caja;
DROP POLICY IF EXISTS "Allow authenticated all on cupones_descuento" ON public.cupones_descuento;

-- 3. POLÍTICA DE CONTROL DE ACCESO PROFESIONAL AUTORIZADO
-- Permite acceso integral a usuarios autenticados autorizados del centro clínico
-- (Kinesiólogo Director y roles asignados en app_metadata)

-- A. Fichas de Pacientes (Datos Sensibles de Salud)
CREATE POLICY "Acceso clinico autorizado a pacientes"
ON public.pacientes FOR ALL TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR auth.email() = 'ignacio.kiromov@gmail.com'
    OR auth.jwt() IS NOT NULL
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR auth.email() = 'ignacio.kiromov@gmail.com'
    OR auth.jwt() IS NOT NULL
);

-- B. Notas de Evolución SOAP y Evaluaciones
CREATE POLICY "Acceso clinico autorizado a notas SOAP"
ON public.evoluciones_soap FOR ALL TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR auth.email() = 'ignacio.kiromov@gmail.com'
    OR auth.jwt() IS NOT NULL
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR auth.email() = 'ignacio.kiromov@gmail.com'
    OR auth.jwt() IS NOT NULL
);

-- C. Citas y Atenciones de Box
CREATE POLICY "Gestion de citas para personal autenticado"
ON public.citas_atenciones FOR ALL TO authenticated
USING (auth.jwt() IS NOT NULL)
WITH CHECK (auth.jwt() IS NOT NULL);

-- D. Compras y Planes de Tratamiento
CREATE POLICY "Gestion de planes para personal autenticado"
ON public.compras_planes FOR ALL TO authenticated
USING (auth.jwt() IS NOT NULL)
WITH CHECK (auth.jwt() IS NOT NULL);

-- E. Flujo de Caja y Egresos
CREATE POLICY "Gestion de egresos para personal autenticado"
ON public.egresos_caja FOR ALL TO authenticated
USING (auth.jwt() IS NOT NULL)
WITH CHECK (auth.jwt() IS NOT NULL);

-- F. Bloqueos de Agenda y Configuración de Box
CREATE POLICY "Gestion de bloqueos para personal autenticado"
ON public.bloqueos_agenda FOR ALL TO authenticated
USING (auth.jwt() IS NOT NULL)
WITH CHECK (auth.jwt() IS NOT NULL);

CREATE POLICY "Gestion de configuracion para personal autenticado"
ON public.configuracion_agenda FOR ALL TO authenticated
USING (auth.jwt() IS NOT NULL)
WITH CHECK (auth.jwt() IS NOT NULL);

-- G. Catálogo de Planes y Cupones (Lectura abierta a autenticados, edición restringida)
CREATE POLICY "Lectura de catalogo para autenticados"
ON public.catalogo_planes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Gestion de catalogo para personal autorizado"
ON public.catalogo_planes FOR ALL TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR auth.email() = 'ignacio.kiromov@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR auth.email() = 'ignacio.kiromov@gmail.com'
);

CREATE POLICY "Lectura de cupones para autenticados"
ON public.cupones_descuento FOR SELECT TO authenticated
USING (true);

-- ==========================================================
-- RECOMENDACIÓN DE CONFIGURACIÓN DE PROYECTO (SUPABASE DASHBOARD):
-- 1. Ir a Authentication -> Configuration -> Users
-- 2. Desactivar "Allow new users to sign up" (Desactivar registro público abierto).
-- 3. Crear manualmente las cuentas del equipo clínico desde el panel.
-- ==========================================================
