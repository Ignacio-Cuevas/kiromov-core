# 📋 REPORTE DE AUDITORÍA TÉCNICA: Kiromov Core
**Fecha de Evaluación:** Septiembre 2026  
**Analista:** Antigravity (Auditor Técnico Senior & Especialista Next.js)

## 1. 🎯 Resumen Ejecutivo
**Kiromov Core** presenta una arquitectura sólida basada en **Next.js (App Router)** y **Supabase**, con una interfaz sumamente cuidada y funcional orientada a las mejores prácticas de UI clínica. La compilación estática (`npx tsc`) pasa sin errores, indicando una base estable. 

No obstante, **existen riesgos críticos de seguridad y lagunas transaccionales silenciosas** derivados del manejo asíncrono de Supabase y debilidades en el Middleware de rutas. El sistema puede sufrir inyecciones de datos no autorizadas y mostrar "falsos positivos" de guardado cuando ocurren errores en la base de datos.

---

## 2. 🚨 Matriz de Hallazgos Clasificados por Severidad

### 🔴 SEVERIDAD CRÍTICA (Acción Inmediata Requerida)

#### 1. Fuga Lógica en el Middleware de Autenticación
- **Archivo:** `src/utils/supabase/middleware.ts` y `src/middleware.ts`
- **Problema:** En el bloque de verificación, si falta una variable de entorno de Supabase o si la validación interna entra al bloque `catch`, el sistema hace un `return NextResponse.next();` o `return supabaseResponse;`.
- **Riesgo:** Si en un despliegue de producción falla la conexión a Supabase, **las rutas protegidas quedan expuestas públicamente** en lugar de redirigir forzosamente a `/login` o lanzar un `HTTP 500`. 

#### 2. Endpoint de Calendario Expuesto (Inyección de Datos)
- **Archivo:** `src/app/api/webhooks/calendar/route.ts`
- **Problema:** El webhook que recibe las reservas acepta un `POST` con `nombre_completo` y `fecha`, pero **no valida ninguna clave (API Key), token de seguridad, ni firma HMAC**. 
- **Riesgo:** Cualquier bot en internet puede realizar peticiones POST a esta URL y crear miles de citas ficticias e inyectar pacientes falsos directamente a la base de datos `citas_atenciones` y `pacientes`.

---

### 🟡 SEVERIDAD MEDIA (Integridad de Datos y Deuda Técnica)

#### 3. Falsos Positivos Silenciosos al Guardar (Supabase Anti-pattern)
- **Archivos:** `src/app/finanzas/page.tsx` (Línea 87), `src/actions/sales.ts` (Línea 114).
- **Problema:** Las funciones de Supabase (`insert`, `update`, `delete`) devuelven `{ data, error }` y **no lanzan excepciones** (`throw`) por sí solas. En las finanzas se hace `await supabase.from('egresos').insert(...)` sin validar el `error` e inmediatamente lanza un `toast.success`.
- **Riesgo:** Si la base de datos rechaza la operación (ej. por restricciones de RLS, null checks, o problemas de red), el sistema le mentirá al usuario clínico diciéndole que se guardó exitosamente, provocando pérdida de datos.

#### 4. Ausencia de Transaccionalidad Segura en Múltiples Tablas
- **Archivo:** `src/components/patients/PatientModal.tsx`
- **Problema:** Al crear un paciente, se realizan inserciones secuenciales en tablas distintas (`pacientes` y luego `patients` legacy). Si la segunda falla, el registro queda a medias. 
- **Solución Ideal:** Reemplazar las operaciones múltiples del lado del cliente por un **Stored Procedure** o **Database Function (RPC)** en Supabase que garantice un `COMMIT` transaccional o un `ROLLBACK` total.

#### 5. Abuso del Tipo `any` (52 Coincidencias)
- **Problema:** Existen al menos 52 lugares donde se eluden las defensas de TypeScript usando `any` en los *payloads* de guardado.
- **Riesgo:** Permite mutaciones de código que el compilador no detectará si cambian los esquemas de la base de datos. Se recomienda ejecutar `supabase gen types typescript --local > types/supabase.ts`.

---

### 🟢 SEVERIDAD BAJA (Optimización y Buenas Prácticas)

#### 6. Versionamiento del Esquema y Políticas RLS
- **Problema:** No existe una carpeta `supabase/migrations/` en el código fuente, lo que indica que las tablas y políticas de seguridad (RLS) se han creado a mano en la interfaz web de Supabase.
- **Riesgo:** Pérdida del historial de arquitectura. Recomiendo inicializar el CLI de Supabase (`supabase init`) y arrastrar el esquema mediante `supabase db pull`.

#### 7. Componentes de Imágenes Nativas vs Optimizadas
- **Archivos:** Múltiples, como `ReimbursementCertificate.tsx` y `Header.tsx`.
- **Problema:** El logo y timbre usan el tag `<img>` estándar. En Next.js, se recomienda migrar a `<Image src="..." />` de `next/image` para disfrutar de carga perezosa (`lazy loading`) y optimización automática del formato (WebP) que reduce uso de memoria en dispositivos móviles.

---

## 3. 🛠️ Plan de Acción Priorizado (Roadmap de Solución)

1. **Parchear el Webhook de Calendario (HOY):**
   - Exigir un token de autorización en los headers (`req.headers.get('authorization') === process.env.WEBHOOK_SECRET`).

2. **Fortificar Middleware (HOY):**
   - Modificar los bloques `catch` en `middleware.ts` para que hagan `return NextResponse.redirect(new URL('/login', request.url));` impidiendo cruzar la muralla de autenticación por error.

3. **Corregir Inserciones Críticas de Finanzas y Ventas (ESTA SEMANA):**
   - Auditar globalmente las operaciones de Supabase. Envolver cada llamada con:
     `const { error } = await supabase.from('tabla').insert(data); if (error) throw new Error(error.message);`

4. **Extraer Esquema de Base de Datos (PROYECTO A MEDIANO PLAZO):**
   - Configurar el entorno de desarrollo local de Supabase y versionar las políticas de RLS dentro del repositorio de GitHub para garantizar que los permisos clínicos sean auditables.
