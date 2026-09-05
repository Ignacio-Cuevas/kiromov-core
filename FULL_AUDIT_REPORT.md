# Auditoría Exhaustiva de Grado Principal: Kiromov Core (FULL AUDIT REPORT)

**Fecha de Ejecución:** Septiembre 2026
**Frameworks Auditados:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase PostgreSQL.
**Criterios de Evaluación:** `systematic-debugging`, `supabase-backend`, `accessible-ui`.

---

## 1. Diagnóstico General de Madurez del Sistema

El ecosistema **Kiromov Core** presenta una arquitectura sólida basada en Next.js (App Router) y Supabase, logrando un flujo operativo altamente interactivo para la gestión clínica. Se destaca la reciente refactorización de la Agenda (prevención de citas dobles, selectores de estado reactivos) y el módulo de Finanzas.

Sin embargo, a nivel de **grado Principal/Senior**, se detectan importantes áreas de mejora estructural:
1. **Deuda Técnica de Tipado:** Uso extendido y sistemático de `any` en funciones críticas que manipulan entidades de base de datos (`pacientes`, `citas_atenciones`), lo cual neutraliza las ventajas de TypeScript.
2. **Fragilidad en Manejo de Fechas (Timezones):** La manipulación de objetos `Date` nativos sin librerías de zona horaria o sin estandarización a cadenas ISO locales genera inestabilidades transaccionales, como el conocido desfase "UTC-4" que afectaba la contabilidad de asistencias mensuales.
3. **Falta de Abstracción en Lógica de Negocio:** Cálculos financieros y de saldos de sesiones (ej: `sesiones_usadas / sesiones_totales`) están duplicados en múltiples componentes de la UI, en lugar de centralizarse en la capa de negocio (`actions` o `lib`).

---

## 2. Inventario Detallado de Hallazgos Clasificados por Impacto

### 🔴 Impacto Crítico (Riesgo Transaccional y de Seguridad)
1. **Desfase Horario (UTC) Generalizado:** 
   - *Hallazgo:* Más de 50 instancias en el código (`lib/supabase.ts`, `actions/sales.ts`, etc.) construyen y comparan fechas usando `new Date()` sin anclar la zona horaria de Chile. Esto provoca que operaciones realizadas a fin de mes/día caigan en ventanas de tiempo erróneas en Supabase.
   - *Consecuencia:* Pérdida de precisión en cierres de caja y estados de planes.
2. **Validación Criptográfica en Webhooks:**
   - *Hallazgo:* En `/api/webhooks/calendar/route.ts`, la validación del token `authHeader !== secretKey` utiliza comparación de strings en texto plano, lo que es susceptible a ataques de tiempo (Timing Attacks). 
   - *Consecuencia:* Posible inyección de citas fraudulentas si se logra vulnerar el endpoint.
3. **Exposición Accidental de Políticas RLS:**
   - *Hallazgo:* Si el cliente de Supabase se inicializa utilizando de forma predeterminada la `ANON_KEY` para llamadas de servidor, los inserts de webhooks o mutaciones podrían fallar si las políticas RLS (Row Level Security) están configuradas estrictamente para roles autenticados, o por el contrario, exponer datos si las políticas de lectura están abiertas a `anon`.

### 🟡 Impacto Medio (Mantenibilidad y Ergonomía del Código)
1. **Proliferación del tipo `any`:**
   - *Hallazgo:* `npx tsc --noEmit` y el análisis de código revelan ~70 ocurrencias del tipo `any` en componentes clave (`PatientModal.tsx`, `SaleModal.tsx`, `agenda/page.tsx`). 
   - *Consecuencia:* Dificulta la mantenibilidad y rompe el contrato estricto del esquema de Supabase, facilitando "silent errors".
2. **Duplicación de Lógica de Planes de Tratamiento:**
   - *Hallazgo:* El cálculo para saber si un paciente tiene plan vigente (`p.estado_plan !== 'sin_plan' && p.sesiones_totales > 0`) se repite textualmente en la vista diaria, semanal, compacta y en la Ficha del Paciente.
3. **Manejo de Errores Supabase Parcial:**
   - *Hallazgo:* Algunas promesas de llamadas asíncronas no arrojan la excepción correctamente con `if (error) throw error`, sino que continúan su ejecución local y solo hacen un `console.error`.

### 🟢 Impacto Leve (UX/UI y Accesibilidad)
1. **Inconsistencia en Arquitectura de Modales:**
   - *Hallazgo:* Según el estándar `accessible-ui`, todos los modales deben tener cabecera sticky, cuerpo scrolleable y footer sticky. Modales legacy como `PatientModal` aún mantienen flujos de scroll que pueden ocultar el botón primario de "Guardar" en dispositivos de resolución pequeña.
2. **Refresco de Estado Innecesario:**
   - *Hallazgo:* Varias mutaciones (como pagos o evolución SOAP) dependen de recargar listas enteras de datos (`loadData()`) en lugar de usar mutaciones optimistas o revalidación por tags (`revalidatePath`), lo cual incrementa lecturas en la base de datos (costos de Supabase).

---

## 3. Plan de Corrección y Refactorización Inmediata

### **Fase 1: Estabilización Estructural (Semana 1)**
1. **Erradicación de `any` (Tipos Supabase):** 
   - Generar y exportar `Database.ts` utilizando la CLI de Supabase (`supabase gen types typescript`). Reemplazar cada `any` por `Tables<'citas_atenciones'>`, `Tables<'pacientes'>`, etc.
2. **Creación del Core Matemático:**
   - Extraer la lógica de saldo a un helper en `src/lib/clinical.ts`: 
     `export const getResumenPlan = (paciente: Paciente) => { ... }` y reemplazar todas las lógicas anidadas de la UI.

### **Fase 2: Blindaje de Backend y Webhooks (Semana 2)**
1. **Seguridad del Webhook:**
   - Implementar `crypto.timingSafeEqual` en `src/app/api/webhooks/calendar/route.ts` para proteger la llave secreta.
   - Validar estricta sanitización para inyección SQL o desbordamiento de búfer.
2. **Capa de Abstracción de Fechas (Timezones):**
   - Importar `date-fns-tz` o utilizar `Intl.DateTimeFormat` con `timeZone: 'America/Santiago'` de manera transversal. Reemplazar `new Date().toISOString().split('T')[0]` por una función unificada `getChileanDate()`.

### **Fase 3: Modernización de UI y Caching (Semana 3)**
1. **Modales Accesibles (AAS):**
   - Auditar cada componente bajo `src/components/modals` e instanciar el cascarón de "3-Zone Modal Architecture" para garantizar scroll limits e interfaces sólidas en iOS y tablets.
2. **Mutaciones Server Actions:**
   - Transicionar las acciones cliente complejas (Ej: `handleCambiarEstadoCita`) hacia `Server Actions` que internamente llamen a `revalidatePath('/agenda')`, para sincronización instantánea y delegación del cómputo al servidor de Edge.

---
*Reporte generado bajo los estándares de Systematic Debugging y Accessible UI dictados en la normativa de ingeniería principal.*
