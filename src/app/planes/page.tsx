"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/dashboard/Header";
import { PlanEditDialog } from "@/components/plans/PlanEditDialog";
import { PlanCatalogo, CategoriaPlan } from "@/types/database";
import {
  fetchCatalogoPlanes,
  toggleActivoPlanCatalogo,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { formatCLP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Tag,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowLeft,
  Users2,
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

  const loadPlanes = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchCatalogoPlanes(false);
      setPlanes(data);
      if (showToast) toast.success("Catálogo de tarifas actualizado");
    } catch (err) {
      console.error("Error loading catalog:", err);
      toast.error("Error al cargar el catálogo de planes");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlanes();
  }, [loadPlanes]);

  const handleToggleActivo = async (plan: PlanCatalogo) => {
    const nextState = !plan.activo;
    try {
      const result = await toggleActivoPlanCatalogo(plan.id, nextState);
      if (result.success) {
        setPlanes((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, activo: nextState } : p))
        );
        toast.success(
          nextState
            ? `Plan "${plan.nombre_plan}" activado para la venta`
            : `Plan "${plan.nombre_plan}" desactivado (oculto en selector)`
        );
      } else {
        toast.error("No se pudo cambiar el estado del plan");
      }
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
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: PlanCatalogo) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  // Filter planes by category and search
  const filteredPlanes = planes.filter((plan) => {
    if (selectedCategory && plan.categoria !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = plan.nombre_plan.toLowerCase().includes(q);
      const matchCat = plan.categoria.toLowerCase().includes(q);
      const matchDesc = (plan.descripcion || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalCount = planes.length;
  const activeCount = planes.filter((p) => p.activo).length;
  const categoriesList = ["General", "Convenio", "Promoción", "Personalizado"] as const;

  const getCategoryBadge = (cat: CategoriaPlan) => {
    switch (cat) {
      case "General":
        return <Badge variant="neutral">General</Badge>;
      case "Convenio":
        return <Badge variant="info">Convenio</Badge>;
      case "Promoción":
        return <Badge variant="warning">Promoción</Badge>;
      default:
        return <Badge variant="secondary">Personalizado</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSupabaseOnline={isSupabaseConfigured}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-xs font-semibold text-clinic-600 hover:text-clinic-800 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a Pacientes
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Catálogo de Planes y Tarifas</span>
              <span className="text-xs font-semibold text-clinic-700 bg-clinic-100/70 border border-clinic-300/60 px-2.5 py-0.5 rounded-full">
                {activeCount} Activos
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Administra las tarifas base, convenios y promociones disponibles en el selector de ventas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPlanes(true)}
              disabled={isRefreshing}
              className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-clinic-600" : ""}`}
              />
              <span>Actualizar</span>
            </Button>

            <Button
              onClick={handleOpenCreate}
              className="bg-clinic-600 hover:bg-clinic-700 text-white font-bold gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nuevo Plan / Tarifa</span>
            </Button>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Categoría:
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Todos ({totalCount})
            </button>

            {categoriesList.map((cat) => {
              const count = planes.filter((p) => p.categoria === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-clinic-600 text-white font-semibold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-semibold text-clinic-600 hover:text-clinic-800 underline underline-offset-2"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-clinic-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Cargando catálogo de tarifas...
            </p>
          </div>
        ) : filteredPlanes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                No se encontraron planes
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Intenta con otro término de búsqueda o crea una nueva tarifa.
              </p>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="bg-clinic-600 hover:bg-clinic-700 text-white font-bold gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Crear Primer Plan</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlanes.map((plan) => {
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
                    {/* Header: Category & Active status */}
                    <div className="flex items-center justify-between gap-2">
                      {getCategoryBadge(plan.categoria)}

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
                        <span>{plan.activo ? "En Venta" : "Desactivado"}</span>
                      </button>
                    </div>

                    {/* Plan Name */}
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

                    {/* Metrics: Sessions & Price */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="text-slate-500 block">Sesiones</span>
                        <span className="text-base font-bold text-slate-900">
                          {plan.total_sesiones} ses.
                        </span>
                      </div>

                      <div className="rounded-xl bg-clinic-50/70 p-2.5 border border-clinic-100">
                        <span className="text-clinic-800 block">Precio Total</span>
                        <span className="text-base font-extrabold text-clinic-700">
                          {formatCLP(plan.precio_clp)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Valor x Sesión:</span>
                      <strong className="text-slate-600 font-semibold">
                        {formatCLP(valorUnitario)}
                      </strong>
                    </div>
                  </div>

                  {/* Actions */}
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
                      className="h-8 gap-1.5 text-xs font-semibold border-slate-200 hover:bg-slate-50"
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

      {/* Plan Edit / Create Modal Dialog */}
      <PlanEditDialog
        plan={editingPlan}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onPlanSaved={handlePlanSaved}
      />
    </div>
  );
}
