"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/dashboard/Header";
import { PlanEditDialog } from "@/components/plans/PlanEditDialog";
import { PlanCatalogo, CategoriaPlan } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import { getPlans, togglePlanStatus } from "@/actions/plans";
import { formatCLP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  Tag,
  Search,
  Filter,
  DollarSign,
  ArrowLeft,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

export default function PlanesPage() {
  const [planes, setPlanes] = useState<PlanCatalogo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanCatalogo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createClient();

  // 1. Carga de Planes desde Supabase
  const loadPlanes = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);

      let fetchedPlanes: PlanCatalogo[] = [];

      if (supabase) {
        // Consultar tabla plans
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("*")
          .order("category", { ascending: false })
          .order("price_clp", { ascending: true });

        if (!plansError && plansData && plansData.length > 0) {
          fetchedPlanes = plansData.map((p: any) => ({
            id: p.id,
            nombre_plan: p.name || p.nombre_plan,
            categoria: (p.category || p.categoria || "General") as CategoriaPlan,
            tipo: p.type || "plan",
            total_sesiones: p.sessions_count ?? p.total_sesiones ?? 1,
            precio_clp: Number(p.price_clp ?? p.precio_clp ?? 0),
            activo: p.is_active !== undefined ? p.is_active : p.activo ?? true,
            descripcion: p.description || p.descripcion,
            created_at: p.created_at,
            updated_at: p.updated_at,
          }));
        } else {
          // Fallback a catalogo_planes
          const { data: catData } = await supabase
            .from("catalogo_planes")
            .select("*")
            .order("categoria", { ascending: false })
            .order("precio_clp", { ascending: true });

          if (catData && catData.length > 0) {
            fetchedPlanes = catData.map((c: any) => ({
              id: c.id,
              nombre_plan: c.nombre_plan,
              categoria: (c.categoria || "General") as CategoriaPlan,
              tipo: c.tipo || (c.total_sesiones === 1 ? "single_session" : "plan"),
              total_sesiones: c.total_sesiones,
              precio_clp: Number(c.precio_clp),
              activo: c.activo,
              descripcion: c.descripcion,
              created_at: c.created_at,
              updated_at: c.updated_at,
            }));
          }
        }
      }

      // Si no hubo datos en cliente, invocar Server Action
      if (fetchedPlanes.length === 0) {
        const actionData = await getPlans();
        fetchedPlanes = actionData.map((p) => ({
          id: p.id,
          nombre_plan: p.name,
          categoria: (p.category || (p.type === "evaluation" ? "Promoción" : "General")) as CategoriaPlan,
          tipo: p.type,
          total_sesiones: p.sessions_count,
          precio_clp: p.price_clp,
          activo: p.is_active,
          descripcion: p.description,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      }

      setPlanes(fetchedPlanes);
      if (showToast) toast.success("Catálogo de tarifas actualizado");
    } catch (err) {
      console.error("Error loading catalog:", err);
      toast.error("Error al cargar el catálogo de planes");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPlanes();
  }, [loadPlanes]);

  // Alternar estado activo / inactivo
  const handleToggleActivo = async (plan: PlanCatalogo) => {
    const nextState = !plan.activo;
    try {
      if (supabase) {
        await supabase.from("plans").update({ is_active: nextState }).eq("id", plan.id);
        await supabase.from("catalogo_planes").update({ activo: nextState }).eq("id", plan.id);
      }
      await togglePlanStatus(plan.id, nextState);

      setPlanes((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, activo: nextState } : p))
      );
      toast.success(
        nextState
          ? `Tarifa "${plan.nombre_plan}" activada para la venta`
          : `Tarifa "${plan.nombre_plan}" desactivada (oculta en selector)`
      );
    } catch {
      toast.error("Error al actualizar el estado");
    }
  };

  const handlePlanSaved = (savedPlan: PlanCatalogo) => {
    setPlanes((prev) => {
      const exists = prev.some((p) => p.id === savedPlan.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPlan.id ? savedPlan : p));
      }
      return [savedPlan, ...prev];
    });
    loadPlanes();
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: PlanCatalogo) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  // 2. Conteos dinámicos por categoría
  const totalCount = planes.length;
  const generalCount = planes.filter(
    (p) => (p.categoria || "").toLowerCase() === "general"
  ).length;
  const convenioCount = planes.filter(
    (p) => (p.categoria || "").toLowerCase() === "convenio"
  ).length;
  const promoCount = planes.filter(
    (p) =>
      (p.categoria || "").toLowerCase() === "promoción" ||
      (p.categoria || "").toLowerCase() === "promocion"
  ).length;
  const customCount = planes.filter(
    (p) => (p.categoria || "").toLowerCase() === "personalizado"
  ).length;

  const categoriesConfig = [
    { key: "General", label: "General", count: generalCount },
    { key: "Convenio", label: "Convenio", count: convenioCount },
    { key: "Promoción", label: "Promoción", count: promoCount },
    { key: "Personalizado", label: "Personalizado", count: customCount },
  ];

  // 3. Filtrado reactivo de tarjetas
  const filteredPlanes = planes.filter((plan) => {
    if (selectedCategory) {
      const planCat = (plan.categoria || "").toLowerCase();
      const selCat = selectedCategory.toLowerCase();
      if (planCat !== selCat) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = plan.nombre_plan.toLowerCase().includes(q);
      const matchCat = (plan.categoria || "").toLowerCase().includes(q);
      const matchDesc = (plan.descripcion || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  const getCategoryBadge = (cat: string) => {
    const norm = (cat || "").toLowerCase();
    if (norm === "convenio") {
      return <Badge variant="info">Convenio</Badge>;
    }
    if (norm === "promoción" || norm === "promocion") {
      return <Badge variant="warning">Promoción</Badge>;
    }
    if (norm === "personalizado") {
      return <Badge variant="secondary">Personalizado</Badge>;
    }
    return <Badge variant="neutral">General</Badge>;
  };

  const getTypeBadge = (tipo?: string) => {
    switch (tipo) {
      case "evaluation":
        return (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
            🩺 Evaluación
          </span>
        );
      case "single_session":
        return (
          <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
            ⚡ Sesión Unitaria
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
            📦 Pack de Sesiones
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSupabaseOnline={true}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/pacientes"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Ir a Directorio de Pacientes
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Catálogo Maestro de Tarifas y Planes</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-300/60 px-2.5 py-0.5 rounded-full">
                {planes.filter((p) => p.activo).length} Activos para Venta
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Tarifas oficiales, planes generales y convenios institucionales de Kiromov Centro Clínico.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPlanes(true)}
              disabled={isRefreshing}
              className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
              <span>Actualizar</span>
            </Button>

            {/* Botón Superior [ + Nuevo Plan / Tarifa ] con fondo azul primario visible */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-2 shadow-xs transition-all text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nuevo Plan / Tarifa</span>
            </button>
          </div>
        </div>

        {/* 2. Barra de Filtros por Categoría Dinámicos */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Categoría:
            </span>

            {/* Pestaña Todos */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                selectedCategory === null
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Todos ({totalCount})
            </button>

            {/* Pestañas de categorías con conteos reales */}
            {categoriesConfig.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* 3. Grid de Planes y Tarjetas */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Cargando catálogo de tarifas desde Supabase...
            </p>
          </div>
        ) : filteredPlanes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                No se encontraron planes en esta categoría
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Ajusta el filtro o crea una nueva tarifa con el botón superior.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-2 inline-flex items-center gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Crear Nueva Tarifa</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlanes.map((plan) => {
              // Cálculo de valor unitario por sesión
              const valorUnitario =
                plan.total_sesiones > 0
                  ? Math.round(plan.precio_clp / plan.total_sesiones)
                  : plan.precio_clp;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${
                    plan.activo
                      ? "border-slate-200 hover:border-slate-300"
                      : "border-slate-200/60 bg-slate-50/70 opacity-75"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Categoría & Estado en Venta */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getCategoryBadge(plan.categoria)}
                        {getTypeBadge(plan.tipo)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActivo(plan)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          plan.activo
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300"
                        }`}
                        title={
                          plan.activo
                            ? "Clic para desactivar (ocultar en selector)"
                            : "Clic para activar (mostrar en selector)"
                        }
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            plan.activo ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{plan.activo ? "En Venta" : "Inactivo"}</span>
                      </button>
                    </div>

                    {/* Nombre del Plan y Descripción */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {plan.nombre_plan}
                      </h3>
                      {plan.descripcion && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {plan.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Métricas: Sesiones & Precio Total Formateado */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="text-slate-500 block text-[11px] font-medium">Sesiones</span>
                        <span className="text-base font-bold text-slate-900">
                          {plan.total_sesiones} ses.
                        </span>
                      </div>

                      <div className="rounded-xl bg-blue-50/70 p-2.5 border border-blue-100">
                        <span className="text-blue-800 block text-[11px] font-medium">Precio Total</span>
                        <span className="text-base font-extrabold text-blue-700">
                          {formatCLP(plan.precio_clp)}
                        </span>
                      </div>
                    </div>

                    {/* Valor Unitario x Sesión Calculado */}
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                      <span>Valor x Sesión:</span>
                      <strong className="text-slate-800 font-bold">
                        {formatCLP(valorUnitario)} / sesión
                      </strong>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActivo(plan)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                    >
                      {plan.activo ? "Desactivar" : "Activar"}
                    </button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(plan)}
                      className="h-8 gap-1.5 text-xs font-semibold border-slate-200 hover:bg-slate-50 rounded-xl"
                    >
                      <Edit2 className="h-3 w-3 text-slate-500" />
                      <span>Editar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Modificación y Creación */}
      <PlanEditDialog
        plan={editingPlan}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onPlanSaved={handlePlanSaved}
      />
    </div>
  );
}
