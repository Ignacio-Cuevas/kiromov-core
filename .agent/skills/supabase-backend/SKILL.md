---
name: supabase-backend
description: Best practices for Supabase PostgreSQL schemas, RLS policies, PostgREST views, and client/server data synchronization.
---

# Supabase Backend & Database Mastery (AAS)

## 1. Schema & View Synchronization
- PostgreSQL views (like `vista_resumen_pacientes`) must be queried with exact column names.
- Always implement defensive fallback resolvers that combine primary tables (`pacientes`, `compras_planes`, `citas_atenciones`) if view schema cache is refreshing.

## 2. Server Actions & Mutations
- All database write operations (`INSERT`, `UPDATE`, `DELETE`) must be encapsulated in Server Actions (`'use server'`) or robust client handlers with explicit revalidation (`revalidatePath`).
- Ensure numerical fields are sanitized before SQL insertion:
  `const sanitizedAmount = parseInt(String(amount).replace(/\D/g, ''), 10) || 0;`

## 3. Error Handling & User Feedback
- Never suppress Supabase errors.
- Always check `if (error) { toast.error(error.message); return; }` and provide informative toast feedback upon success.
