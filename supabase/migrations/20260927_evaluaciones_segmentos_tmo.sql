CREATE TABLE IF NOT EXISTS public.evaluaciones_iniciales_tmo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    fecha_evaluacion DATE DEFAULT CURRENT_DATE,
    segmento_evaluado VARCHAR(50),
    anamnesis JSONB DEFAULT '{}'::jsonb,
    datos_segmento JSONB DEFAULT '{}'::jsonb,
    diagnostico_tmo TEXT,
    plan_tratamiento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
