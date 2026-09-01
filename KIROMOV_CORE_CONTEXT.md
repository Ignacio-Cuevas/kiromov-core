# KIROMOV CORE — DOCUMENTO MAESTRO DE ARQUITECTURA Y CONTEXTO

> **Centro Clínico:** Kiromov Centro Clínico  
> **Ubicación:** Bulnes 470, Of. 75 (7° Piso, Edificio Aranjuez), Chillán, Región de Ñuble, Chile  
> **Director Clínico:** Klgo. Ignacio Cuevas Silva — Magíster en Terapia Manual Ortopédica (UNAB), Reg. SIS N° 396889  
> **Moneda y Región:** Peso Chileno (CLP, `$XX.XXX`) | RUT Chileno (`XX.XXX.XXX-X`, Módulo 11) | Zona Horaria `America/Santiago` (UTC-4 / UTC-3)

---

## 1. Stack Tecnológico y Arquitectura de Carpetas

### Stack Principal:
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/) (Tipado estricto en frontend y backend)
- **Estilos & UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/) (Toasts)
- **Base de Datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth SSR, RLS, Storage para Branding & Timbres)
- **Despliegue Continuo:** [Vercel](https://vercel.com/) con sincronización automática desde la rama `main` en GitHub.

### Estructura de Directorios:
```text
kiromov-core/
├── src/
│   ├── app/                               # Rutas de Next.js App Router
│   │   ├── (auth)/login/page.tsx          # Pantalla de inicio de sesión clínica (Ley 20.584)
│   │   ├── agenda/page.tsx                # Agenda interactiva por fecha, citas y atenciones
│   │   ├── pacientes/page.tsx             # Directorio de pacientes, saldos y planes
│   │   ├── planes/page.tsx                # Catálogo y administración de tarifas/planes
│   │   ├── finanzas/page.tsx              # Resumen contable, flujo neto e ingresos
│   │   ├── api/webhooks/calendar/route.ts # Webhook bidireccional con Google Calendar
│   │   ├── layout.tsx                     # Layout raíz con proveedores y fuentes
│   │   └── page.tsx                       # Dashboard principal con métricas clínicas
│   │
│   ├── actions/                           # Server Actions (Mutaciones con revalidación segura)
│   │   ├── patients.ts                    # getPatients, createPatient, updatePatient, deletePatient
│   │   ├── plans.ts                       # getPlans, createPlan, updatePlan, deletePlan
│   │   └── sales.ts                       # createSale, settlePendingPlan, getSales
│   │
│   ├── components/                        # Componentes UI reutilizables
│   │   ├── dashboard/                     # Header, Sidebar, KPICards, RecentSales
│   │   ├── patients/                      # PatientModal, PatientDrawer, SoapEvolutionForm,
│   │   │                                  # AttendanceHistoryTab, PlansHistoryTab, PayPlanModal,
│   │   │                                  # ClinicalCertificateDialog, EditPatientDialog
│   │   ├── sales/                         # SaleModal (Registro de venta y cobro con scroll)
│   │   ├── plans/                         # PlanEditDialog (Edición y creación de tarifas)
│   │   └── ui/                            # Botones, Badges, Tabs, Sheet, Progress, Table
│   │
│   ├── lib/                               # Utilidades y capas de datos
│   │   ├── supabase.ts                    # Cliente centralizado y consultas auxiliares
│   │   ├── utils.ts                       # Formateo de CLP, validación RUT, fechas en Chile
│   │   └── mock-data.ts                   # Datos de respaldo offline
│   │
│   ├── types/                             # Interfaces de TypeScript
│   │   ├── database.ts                    # Tipos exactos del esquema Supabase
│   │   └── clinical.ts                    # Tipos clínicos y de dominio
│   │
│   ├── utils/supabase/                    # Clientes de Supabase para SSR
│   │   ├── client.ts                      # createClient para componentes 'use client'
│   │   ├── server.ts                      # createClient para Server Components y Server Actions
│   │   └── middleware.ts                  # Middleware Guard para protección de rutas privadas
│   │
│   └── middleware.ts                      # Middleware de protección global
```

---

## 2. Esquema Exacto de Base de Datos en Supabase (PostgreSQL)

### Tabla `public.pacientes`
Almacena las fichas clínicas de pacientes:
```sql
CREATE TABLE public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_paciente TEXT UNIQUE,
    nombre_completo TEXT NOT NULL,
    rut TEXT NOT NULL UNIQUE,
    telefono TEXT,
    email TEXT,
    fecha_nacimiento DATE,
    prevision TEXT DEFAULT 'Particular', -- 'Particular', 'Fonasa', 'Isapre', 'Convenio'
    prevision_salud TEXT DEFAULT 'Particular',
    motivo_consulta TEXT,
    diagnostico_principal TEXT,
    diagnostico_medico TEXT,
    antecedentes_morbidos TEXT,
    alertas_seguridad TEXT,
    estado TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla `public.citas_atenciones`
Registra las horas agendadas y asistencias de atención kinésica:
```sql
CREATE TABLE public.citas_atenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,              -- Formato 'YYYY-MM-DD' (Local Chile sin desfase)
    hora TIME NOT NULL,               -- Formato 'HH:mm:ss'
    profesional TEXT NOT NULL,        -- 'Klgo. Ignacio Cuevas Silva'
    estado TEXT NOT NULL,             -- 'Asistió', 'Atendido', 'En Sala', 'Pendiente', 'Cancelado', 'Inasistencia (Descuenta Sesión)'
    motivo_consulta TEXT,
    google_event_id TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla `public.plans` (Catálogo Oficial de Tarifas)
```sql
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,          -- 'General', 'Convenio', 'Promoción', 'Personalizado'
    type TEXT NOT NULL,              -- 'plan', 'single_session', 'evaluation'
    sessions_count INTEGER NOT NULL,
    price_clp INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla `public.compras_planes` (Ventas, Saldos y Cobros)
```sql
CREATE TABLE public.compras_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    plan_id UUID,
    catalogo_plan_id UUID,
    nombre_plan TEXT NOT NULL,
    sesiones_totales INTEGER NOT NULL,
    total_sesiones INTEGER NOT NULL,
    sesiones_usadas INTEGER DEFAULT 0,
    precio_base INTEGER NOT NULL,
    valor_total INTEGER NOT NULL,
    total_final_clp INTEGER NOT NULL,
    monto_clp INTEGER NOT NULL,
    metodo_pago TEXT NOT NULL,        -- 'transferencia', 'tarjeta', 'efectivo', 'convenio'
    medio_pago TEXT NOT NULL,         -- 'Transferencia', 'Débito / Transbank', 'Efectivo', 'Convenio'
    estado_pago TEXT NOT NULL,        -- 'Pagado', 'Pendiente de Pago', 'Parcial / Cuotas'
    numero_boleta TEXT,               -- N° Boleta Electrónica para reembolso Isapre/Seguro
    fecha_compra DATE NOT NULL,
    estado TEXT DEFAULT 'activo',     -- 'activo', 'finalizado', 'cancelado'
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla `public.evoluciones_soap`
Registro médico conforme a la Ley 20.584:
```sql
CREATE TABLE public.evoluciones_soap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    profesional TEXT NOT NULL,
    subjetivo TEXT NOT NULL,
    objetivo TEXT NOT NULL,
    analisis TEXT NOT NULL,
    plan TEXT NOT NULL,
    ena_dolor INTEGER CHECK (ena_dolor BETWEEN 0 AND 10),
    mapa_dolor_svg TEXT,
    hallazgos_frecuentes TEXT[],
    cuestionario_funcional JSONB,
    discapacidad_funcional_pct NUMERIC,
    pronostico_sesiones_estimadas INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Vista `public.vista_resumen_pacientes`
Calcula en tiempo real los saldos de sesiones y estado del plan de cada paciente:
- `sesiones_totales`
- `sesiones_usadas`
- `sesiones_restantes`
- `estado_plan` (`'vigente'`, `'por_renovar'`, `'finalizado'`, `'sin_plan'`)

---

## 3. Catálogo Oficial de Tarifas (Kiromov Centro Clínico)

| Categoría | Nombre del Plan | Sesiones | Precio Total (CLP) | Precio / Sesión |
| :--- | :--- | :---: | :---: | :---: |
| **General** | Evaluación Kinésica + Tratamiento | 1 | `$35.000` | `$35.000` |
| **General** | Sesión Individual de Seguimiento | 1 | `$30.000` | `$30.000` |
| **General** | Pack Tratamiento 4 Sesiones | 4 | `$100.000` | `$25.000` |
| **General** | Pack Tratamiento 6 Sesiones | 6 | `$140.000` | `$23.333` |
| **General** | Pack Tratamiento 8 Sesiones | 8 | `$180.000` | `$22.500` |
| **General** | Pack Tratamiento 10 Sesiones | 10 | `$200.000` | `$20.000` |
| **Convenio** | Pack Convenio 4 Sesiones | 4 | `$90.000` | `$22.500` |
| **Convenio** | Pack Convenio 6 Sesiones | 6 | `$125.000` | `$20.833` |
| **Convenio** | Pack Convenio 8 Sesiones | 8 | `$160.000` | `$20.000` |
| **Convenio** | Pack Convenio 10 Sesiones | 10 | `$180.000` | `$18.000` |

---

## 4. Estado Actual de Módulos y Funcionalidades

### ✅ Módulos Implementados y Operativos:
1. **Autenticación y Middleware Guard (`src/middleware.ts` / `/login`):**
   - Cumplimiento de resguardo de datos de salud (Ley 20.584).
   - Bloqueo de rutas privadas y redirección a login si no hay sesión activa en Supabase SSR.
2. **Directorio Clínico de Pacientes (`/pacientes`):**
   - Consulta reactiva de `vista_resumen_pacientes` y `compras_planes`.
   - Visualización de saldos (`4/10 ses. (6 rest.)`) y barras de progreso.
   - Pestañas de filtrado (`Todos`, `Planes Vigentes`, `Por Renovar`, `Finalizados`, `Sin Plan`).
   - Modal de nuevo paciente con validación de RUT chileno (Módulo 11).
3. **Ficha Lateral del Paciente (`PatientDrawer.tsx`):**
   - Formulario de notas clínicas SOAP con escala ENA.
   - Historial de asistencias cruzado con `citas_atenciones`.
   - Botón `[✓ Registrar Asistencia Hoy]` reactivo que descuenta saldo e incrementa sesiones usadas.
   - Generador de **Certificado de Reembolso Médico** imprimible con membrete y timbre oficial.
4. **Módulo de Ventas y Cobros (`SaleModal.tsx` & `PayPlanModal.tsx`):**
   - Modal con 3 zonas y scroll vertical interno.
   - Venta de planes y asignación de sesiones al saldo del paciente.
   - Regularización y cobro de planes adeudados (`estado_pago: 'pendiente'` ➔ `'pagado'`).
   - Registro de **N° de Boleta Tributaria** para control contable y certificados de Isapre.
5. **Agenda Clínica (`/agenda`):**
   - Manejo de fechas en zona local Chile sin desfases de huso horario.
   - Modal de nueva cita, edición de estado (`Asistió`, `Atendido`, `En Sala`, `Cancelado`) y eliminación.
   - Endpoint webhook preparado para sincronización con Google Calendar.
6. **Administración de Tarifas (`/planes`):**
   - CRUD de tarifas conectado a Supabase.
   - Cálculo del valor unitario por sesión.
   - Filtros por categoría (`General`, `Convenio`, `Promoción`, `Personalizado`).

---

## 5. Protocolo de Despliegue y Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Verificación de tipos y compilación de producción
npm run build

# Despliegue a GitHub (Auto-deploy en Vercel)
git add .
git commit -m "feat/fix: descripción de la mejora"
git push origin main
```
