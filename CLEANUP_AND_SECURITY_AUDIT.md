# Auditoría Exhaustiva de Limpieza, Código Muerto y Seguridad
**Proyecto:** Kiromov Core (Next.js 15, TypeScript, Supabase, Google Calendar API)  
**Fecha:** 15 de Septiembre de 2026  
**Auditor:** Principal Security Auditor & Lead Architect  
**Modo:** Solo Lectura (Auditoría Estática Sin Alteración de Código Productivo)

---

## 1. Resumen Ejecutivo

El escaneo estático integral del repositorio **Kiromov Core** revela una base de código funcionalmente sólida y con compilación TypeScript estricta (`npx tsc --noEmit` finaliza con **0 errores**), pero con acumulación relevante de artefactos residuales, código muerto proveniente de iteraciones previas, exposición de datos sensibles en consolas y vectores de seguridad a mitigar antes de una certificación de producción clínica.

### Métricas Clave del Diagnóstico:
* **Vulnerabilidades de Dependencias (`npm audit`):** 2 advertencias asociadas a `postcss <=8.5.22` (1 Alta, 1 Moderada: GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q por sourceMappingURL y XSS en CSS stringify). Afecta dependencias transitivas de Next.js.
* **Archivos Huérfanos / Código Muerto en `src/`:** **10 componentes** y **1 archivo de tipos** completamente desconectados del árbol de renderizado activo (incluyendo componentes transitivos de UI en `@/components/ui/`).
* **Archivos Temporales / Scripts Residuales en Raíz:** **48 scripts** `.py`, `.js` y `.sh` residuales generados durante parches históricos.
* **Secretos y Seguridad Perimetral:**
  * Archivo sensible `google-credentials.json` bloqueado en `.gitignore`, pero reglas de exclusión permisivas ante nombres alternativos (ej: `*credentials*.json`).
  * Endpoint de diagnóstico `/api/test-calendar` público sin restricción de sesión o API Key.
  * Endpoint `/api/webhooks/calendar` susceptible a *length-timing attack* en la validación criptográfica.
* **Exposición de Datos Clínicos y PII:** Presencia de `console.log` en cliente y servidor imprimiendo objetos completos de pacientes (RUT, teléfono, antecedentes mórbidos y diagnósticos).
* **Calidad Estática:** **109 ocurrencias** de casts `any`, concentradas principalmente en acciones de servidor y transformaciones de datos de Supabase.

---

## 2. Tabla de Hallazgos

| # | Elemento / Archivo Exacto | Tipo | Riesgo al Limpiar | Opción de Reparación Propuesta |
|---|---|---|---|---|
| **S-01** | `src/app/api/test-calendar/route.ts` | **Seguridad** (Acceso Público & Info Disclosure) | **Bajo** | Proteger con token de administración (`x-admin-key` o sesión de Supabase Auth) o eliminar una vez validada la integración con Google Calendar. Evitar exponer detalles de variables de entorno en el JSON de error. |
| **S-02** | `src/app/api/webhooks/calendar/route.ts` (Líneas 39-44) | **Seguridad** (Timing Attack / Secret Length Leak) | **Nulo** | Comparar hashes SHA-256 de longitud fija (32 bytes) usando `crypto.timingSafeEqual(hash(auth), hash(secret))` para evitar la fuga del largo de la clave mediante comparación de buffer lengths. |
| **S-03** | `src/components/patients/PatientModal.tsx` (Líneas 178, 213) | **Privacidad / PII** (Fuga de Datos Médicos en DevTools) | **Nulo** | Eliminar los `console.log` que imprimen el `payload` y `data` del paciente (RUT, antecedentes médicos, teléfonos). Sustituir por logging estructurado o métricas sin PII. |
| **S-04** | `src/app/api/webhooks/calendar/route.ts` (Línea 73) | **Privacidad / PII** (Fuga en Logs de Servidor) | **Nulo** | Eliminar o enmascarar `nombre_completo` en el log de Vercel (ej: `[WEBHOOK CALENDAR] Cita recibida ID: ${google_event_id}`). |
| **S-05** | `.gitignore` | **Seguridad** (Reglas de Bloqueo de Credenciales) | **Nulo** | Ampliar patrones: agregar `*credentials*.json`, `*.credentials.json`, `service-account*.json`, `.env*.development`, `.env*.production`. |
| **D-01** | `node_modules/next/node_modules/postcss` | **Vulnerabilidad** (High / Moderate en PostCSS) | **Medio** | Evaluar `npm audit fix` o esperar el parche menor de Next.js 15 sin forzar actualización a Next 16 (Next 16 introduce breaking changes de async request APIs). |
| **C-01** | `src/components/dashboard/KpiCards.tsx` | **Código Muerto** (Componente no importado) | **Nulo** | Eliminar el archivo. `/app/page.tsx` utiliza sus propias tarjetas KPI nativas. |
| **C-02** | `src/components/dashboard/PatientTable.tsx` | **Código Muerto** (Componente no importado) | **Nulo** | Eliminar el archivo. El directorio de `/app/page.tsx` implementa su propia tabla inline optimizada. |
| **C-03** | `src/components/finanzas/CreateCouponDialog.tsx` | **Código Muerto** (Componente no importado) | **Nulo** | Eliminar el archivo. No se consume en `/finanzas` ni en `/planes`. |
| **C-04** | `src/components/finanzas/CreateExpenseDialog.tsx` | **Código Muerto** (Componente no importado) | **Nulo** | Eliminar el archivo. `/finanzas` maneja la creación de egresos mediante modal propio y `EditExpenseModal`. |
| **C-05** | `src/components/finanzas/RegisterSaleDialog.tsx` | **Código Muerto** (Componente no importado) | **Nulo** | Eliminar el archivo. Las ventas se procesan mediante `SaleModal` y `AssignTreatmentModal`. |
| **C-06** | `src/components/patients/CreatePatientDialog.tsx` | **Código Muerto** (Componente no importado) | **Nulo** | Eliminar el archivo. La creación de pacientes se gestiona exclusivamente mediante `PatientModal.tsx`. |
| **C-07** | `src/components/patients/PatientDrawer.tsx` | **Código Muerto** (Componente huérfano) | **Nulo** | Eliminar el archivo. Fue reemplazado por la navegación hacia `ClinicalBoxSuite.tsx` y `/agenda?ficha=true`. |
| **C-08** | `src/components/patients/AttendanceHistoryTab.tsx` | **Código Muerto** (Dependencia de PatientDrawer) | **Nulo** | Eliminar el archivo (solo es importado dentro de `PatientDrawer.tsx`). |
| **C-09** | `src/components/patients/PlansHistoryTab.tsx` | **Código Muerto** (Dependencia de PatientDrawer) | **Nulo** | Eliminar el archivo (solo es importado dentro de `PatientDrawer.tsx`). |
| **C-10** | `src/components/ui/card.tsx`, `sheet.tsx`, `table.tsx`, `tabs.tsx` | **Código Muerto Transitivo** (Solo usados por componentes huérfanos) | **Bajo** | Opciones: A) Conservar como biblioteca UI base (shadcn) para futuros desarrollos, o B) Eliminar si se busca bundle ultra liviano. *Recomendación:* Mantener en `components/ui/` para coherencia de diseño. |
| **C-11** | `src/types/paciente.ts` | **Código Muerto** (Tipo no referenciado) | **Nulo** | Eliminar el archivo. La aplicación completa utiliza `VistaResumenPaciente` y `Paciente` de `src/types/database.ts`. |
| **C-12** | ~48 Scripts en la raíz (`fix_*.py`, `rewrite_*.py`, `patch_*.js`, etc.) | **Archivos Residuales** (Scripts temporales) | **Nulo** | Mover a carpeta histórica `/archive/scripts/` o eliminar del repositorio. Ensucien el árbol de trabajo y aumentan el riesgo de ejecuciones erróneas. |
| **Q-01** | 109 ocurrencias de `any` en `src/actions/` y componentes | **Calidad de Tipado** (Ineficiencia / Type Safety) | **Bajo** | Reemplazar gradualmente con tipos estrictos de `src/types/database.ts` (ej: `Record<string, unknown>`, `Paciente`, `CitaAtencion`). |

---

## 3. Plan de Limpieza Recomendado Paso a Paso

Para garantizar **riesgo operativo cero**, la remediación debe ejecutarse de forma escalonada:

### Fase 1: Limpieza Segura de Código Huérfano y Scripts (Riesgo NULO)
1. **Depuración de Scripts en Raíz:**
   * Archivar o remover los 48 scripts residuales (`fix_*.py`, `generate_*.py`, `patch_*.js`, `download_assets.*`, etc.).
2. **Eliminación de Componentes Muertos sin Referencia Activa:**
   * `src/components/dashboard/KpiCards.tsx`
   * `src/components/dashboard/PatientTable.tsx`
   * `src/components/finanzas/CreateCouponDialog.tsx`
   * `src/components/finanzas/CreateExpenseDialog.tsx`
   * `src/components/finanzas/RegisterSaleDialog.tsx`
   * `src/components/patients/CreatePatientDialog.tsx`
   * `src/components/patients/PatientDrawer.tsx`
   * `src/components/patients/AttendanceHistoryTab.tsx`
   * `src/components/patients/PlansHistoryTab.tsx`
   * `src/types/paciente.ts`
3. **Refuerzo de `.gitignore`:**
   * Agregar exclusiones globales para credenciales y certificados.

### Fase 2: Blindaje de Privacidad y Endpoints API (Riesgo BAJO)
1. **Erradicación de PII en Consola:**
   * Remover `console.log('Enviando payload a Supabase:', payload)` y `console.log('Paciente creado exitosamente:', data)` en `PatientModal.tsx`.
   * Enmascarar logs en `webhooks/calendar/route.ts`.
2. **Mitigación Criptográfica en Webhook:**
   * Implementar hash-based timing safe equality en `POST /api/webhooks/calendar`.
3. **Gobierno de `/api/test-calendar`:**
   * Exigir header `x-admin-token` o vincular a sesión autenticada de kinesiología antes de permitir disparos a Google Calendar.

### Fase 3: Tipado Fino y Dependencias (Requiere Validación)
1. **Refactorización de `any`:**
   * Tipar formalmente los retornos y transformaciones en `src/actions/patients.ts` y `src/app/agenda/page.tsx`.
2. **Dependencias:**
   * Monitorear parches de seguridad de Next.js 15.x para `postcss` sin forzar la migración mayor a Next.js 16.

---

> **Nota:** Conforme a las instrucciones del MODO SOLO-LECTURA, este informe ha sido generado como propuesta técnica de decisión. **No se aplicó ninguna modificación al código fuente ni a los componentes de producción.**
