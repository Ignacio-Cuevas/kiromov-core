---
name: systematic-debugging
description: Rigorous root-cause analysis and phase-gated debugging for full-stack Next.js and Supabase applications.
---

# Systematic Debugging Protocol (AAS)

## Phase 1: Problem Characterization & Observation
1. **Never guess schemas or column names.**
   - Inspect PostgreSQL table definitions, PostgREST views, and error payloads directly from Supabase responses (`error.message`, `error.details`, `error.hint`).
2. **Observe actual network & state behavior:**
   - Log exact query parameters, returned rows, and error objects in development.
   - Distinguish between client-side rendering issues, server-side data fetching failures, and RLS / permissions rejections.

## Phase 2: Hypothesis & Root Cause Isolation
1. Formulate testable hypotheses (e.g. "Column `sesiones_totales` vs `total_sesiones` mismatch in PostgREST view cache").
2. Validate using isolated minimal queries or server actions before refactoring.
3. Check fallback branches to ensure mock/stale data does not override live database rows.

## Phase 3: Defensive & Resilient Implementation
1. Implement resilient property access (e.g. `p.sesiones_totales ?? p.total_sesiones ?? 0`).
2. Dual synchronization on mutations with try/catch blocks that never fail silently.
3. Provide explicit user feedback via toast notifications and visual error states.

## Phase 4: Verification & Regression Guard
1. Execute build verification (`npm run build`).
2. Verify all UI flows, modal scroll boundaries, and state updates end-to-end.
