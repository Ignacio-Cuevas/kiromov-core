---
name: accessible-ui
description: Clinical-grade UI architecture, modal scroll boundaries, responsive typography, and high-contrast color standards.
---

# Accessible UI & Tailwind Design System (AAS)

## 1. Robust 3-Zone Modal Architecture
All modals (`SaleModal`, `PatientModal`, `PayPlanModal`, `PlanEditDialog`) must strictly enforce:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
  <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
    {/* 1. Sticky Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
      ...
    </div>

    {/* 2. Scrollable Body */}
    <form className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        ...
      </div>

      {/* 3. Sticky Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10">
        ...
      </div>
    </form>
  </div>
</div>
```

## 2. High Contrast Standards
- Primary Action buttons: solid high-contrast colors (e.g. `bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700`).
- Input labels: `text-xs font-semibold text-slate-700`.
- Text on badges: distinct background with matching border (e.g. `bg-emerald-50 text-emerald-700 border border-emerald-200`).
