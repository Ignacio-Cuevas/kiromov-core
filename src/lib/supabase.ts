import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";
import {
  VistaResumenPaciente,
  Paciente,
  CompraPlan,
  CitaAtencion,
  EvolucionSOAP,
  PlanCatalogo,
  CuponDescuento,
  EgresoCaja,
  VentaPlanDetallada,
  ResumenFinanciero,
} from "@/types/database";
import {
  initialMockPacientes,
  initialMockPlanes,
  initialMockCitas,
  initialMockEvoluciones,
  initialMockCatalogoPlanes,
  initialMockCupones,
  initialMockEgresos,
  computeMockVistaResumen,
} from "./mock-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured =
  supabaseUrl.trim() !== "" &&
  supabaseKey.trim() !== "" &&
  supabaseUrl !== "tu_supabase_url" &&
  supabaseKey !== "tu_supabase_anon_key" &&
  supabaseUrl.startsWith("http");

// Singleton client (or null if not configured)
export const supabase = isSupabaseConfigured
  ? createBrowserSupabaseClient()
  : null;

// Local in-memory state for fallback/demo mode
let localPacientes: Paciente[] = [...initialMockPacientes];
let localPlanes: CompraPlan[] = [...initialMockPlanes];
let localCitas: CitaAtencion[] = [...initialMockCitas];
let localEvoluciones: EvolucionSOAP[] = [...initialMockEvoluciones];
let localCatalogoPlanes: PlanCatalogo[] = [...initialMockCatalogoPlanes];
let localCupones: CuponDescuento[] = [...initialMockCupones];
let localEgresos: EgresoCaja[] = [...initialMockEgresos];

// ==========================================
// 1. CATÁLOGO DE PLANES Y TARIFAS
// ==========================================

export async function fetchCatalogoPlanes(onlyActive = false): Promise<PlanCatalogo[]> {
  if (supabase) {
    try {
      let query = supabase.from("catalogo_planes").select("*");
      if (onlyActive) {
        query = query.eq("activo", true);
      }
      const { data, error } = await query
        .order("categoria", { ascending: true })
        .order("precio_clp", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as PlanCatalogo[];
      }
    } catch (err) {
      console.warn("Supabase fetchCatalogoPlanes error:", err);
    }
  }

  let list = [...localCatalogoPlanes];
  if (onlyActive) {
    list = list.filter((p) => p.activo);
  }
  return list.sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.precio_clp - b.precio_clp
  );
}

export async function crearPlanCatalogo(
  plan: Omit<PlanCatalogo, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; data?: PlanCatalogo; error?: string }> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("catalogo_planes")
        .insert([plan])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as PlanCatalogo };
      }
      if (error) console.warn("Supabase error creating catalog plan:", error.message);
    } catch (err) {
      console.warn("Supabase exception creating plan:", err);
    }
  }

  const newPlan: PlanCatalogo = {
    ...plan,
    id: "cat-" + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localCatalogoPlanes.push(newPlan);
  return { success: true, data: newPlan };
}

export async function actualizarPlanCatalogo(
  id: string,
  updates: Partial<PlanCatalogo>
): Promise<{ success: boolean; data?: PlanCatalogo; error?: string }> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("catalogo_planes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as PlanCatalogo };
      }
      if (error) console.warn("Supabase error updating catalog plan:", error.message);
    } catch (err) {
      console.warn("Supabase exception updating plan:", err);
    }
  }

  const idx = localCatalogoPlanes.findIndex((p) => p.id === id);
  if (idx !== -1) {
    localCatalogoPlanes[idx] = {
      ...localCatalogoPlanes[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return { success: true, data: localCatalogoPlanes[idx] };
  }
  return { success: false, error: "Plan no encontrado" };
}

export async function toggleActivoPlanCatalogo(
  id: string,
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  return actualizarPlanCatalogo(id, { activo });
}

// ==========================================
// 2. CUPONES DE DESCUENTO Y VALIDADOR
// ==========================================

export async function fetchCupones(): Promise<CuponDescuento[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cupones_descuento")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as CuponDescuento[];
      }
    } catch (err) {
      console.warn("Supabase fetchCupones error:", err);
    }
  }
  return [...localCupones];
}

export async function crearCupon(
  cupon: Omit<CuponDescuento, "id" | "usos_actuales" | "created_at">
): Promise<{ success: boolean; data?: CuponDescuento; error?: string }> {
  const cleanCode = cupon.codigo.trim().toUpperCase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cupones_descuento")
        .insert([{ ...cupon, codigo: cleanCode, usos_actuales: 0 }])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as CuponDescuento };
      }
      if (error) console.warn("Supabase error creating coupon:", error.message);
    } catch (err) {
      console.warn("Supabase exception creating coupon:", err);
    }
  }

  const newCup: CuponDescuento = {
    ...cupon,
    codigo: cleanCode,
    id: "cup-" + Date.now(),
    usos_actuales: 0,
    created_at: new Date().toISOString(),
  };
  localCupones.unshift(newCup);
  return { success: true, data: newCup };
}

export async function toggleActivoCupon(
  id: string,
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from("cupones_descuento")
        .update({ activo })
        .eq("id", id);
      if (!error) return { success: true };
    } catch (err) {
      console.warn("Supabase error toggling coupon:", err);
    }
  }
  const idx = localCupones.findIndex((c) => c.id === id);
  if (idx !== -1) {
    localCupones[idx].activo = activo;
    return { success: true };
  }
  return { success: false, error: "Cupón no encontrado" };
}

export async function validarCupon(
  codigoInput: string,
  precioBase: number
): Promise<{
  valido: boolean;
  cupon?: CuponDescuento;
  descuentoCalculadoCLP?: number;
  mensaje: string;
}> {
  const codigo = codigoInput.trim().toUpperCase();
  if (!codigo) {
    return { valido: false, mensaje: "Ingresa un código de cupón." };
  }

  let cupon: CuponDescuento | undefined;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cupones_descuento")
        .select("*")
        .ilike("codigo", codigo)
        .single();

      if (!error && data) {
        cupon = data as CuponDescuento;
      }
    } catch (err) {
      console.warn("Supabase coupon validation check:", err);
    }
  }

  if (!cupon) {
    cupon = localCupones.find((c) => c.codigo.toUpperCase() === codigo);
  }

  if (!cupon) {
    return {
      valido: false,
      mensaje: `El cupón "${codigo}" no existe en el sistema.`,
    };
  }

  if (!cupon.activo) {
    return {
      valido: false,
      mensaje: `El cupón "${codigo}" se encuentra inactivo o caducado.`,
    };
  }

  if (cupon.limite_usos !== null && cupon.usos_actuales >= cupon.limite_usos) {
    return {
      valido: false,
      mensaje: `El cupón "${codigo}" ha alcanzado su límite máximo de usos.`,
    };
  }

  let descuentoCalculado = 0;
  if (cupon.tipo === "porcentaje") {
    descuentoCalculado = Math.round((precioBase * cupon.valor_descuento) / 100);
  } else {
    descuentoCalculado = cupon.valor_descuento;
  }

  descuentoCalculado = Math.min(descuentoCalculado, precioBase);

  return {
    valido: true,
    cupon,
    descuentoCalculadoCLP: descuentoCalculado,
    mensaje: `¡Cupón válido! Descuento de $${descuentoCalculado.toLocaleString("es-CL")} CLP aplicado (${cupon.descripcion}).`,
  };
}

// ==========================================
// 3. EGRESOS DE CAJA Y FLUJO
// ==========================================

export async function fetchEgresosCaja(): Promise<EgresoCaja[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("egresos_caja")
        .select("*")
        .order("fecha", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as EgresoCaja[];
      }
    } catch (err) {
      console.warn("Supabase fetchEgresosCaja error:", err);
    }
  }
  return [...localEgresos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

export async function crearEgresoCaja(
  egreso: Omit<EgresoCaja, "id" | "created_at">
): Promise<{ success: boolean; data?: EgresoCaja; error?: string }> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("egresos_caja")
        .insert([egreso])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as EgresoCaja };
      }
      if (error) console.warn("Supabase error creating expense:", error.message);
    } catch (err) {
      console.warn("Supabase exception creating expense:", err);
    }
  }

  const newEgreso: EgresoCaja = {
    ...egreso,
    id: "egr-" + Date.now(),
    created_at: new Date().toISOString(),
  };
  localEgresos.unshift(newEgreso);
  return { success: true, data: newEgreso };
}

export async function eliminarEgresoCaja(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from("egresos_caja")
        .delete()
        .eq("id", id);
      if (!error) {
        localEgresos = localEgresos.filter((e) => e.id !== id);
        return { success: true };
      }
      if (error) console.warn("Supabase error deleting expense:", error.message);
    } catch (err) {
      console.warn("Supabase exception deleting expense:", err);
    }
  }

  localEgresos = localEgresos.filter((e) => e.id !== id);
  return { success: true };
}

// ==========================================
// 4. HISTORIAL DE VENTAS Y FINANZAS
// ==========================================

export async function fetchHistorialVentas(): Promise<VentaPlanDetallada[]> {
  let planesList: CompraPlan[] = [];
  let pacientesList: Paciente[] = [];

  if (supabase) {
    try {
      const [pRes, plRes] = await Promise.all([
        supabase.from("pacientes").select("*"),
        supabase.from("compras_planes").select("*").order("fecha_compra", { ascending: false }),
      ]);

      if (!pRes.error && pRes.data) pacientesList = pRes.data as Paciente[];
      if (!plRes.error && plRes.data) planesList = plRes.data as CompraPlan[];
    } catch (err) {
      console.warn("Supabase sales fetch error:", err);
    }
  }

  if (planesList.length === 0) planesList = [...localPlanes];
  if (pacientesList.length === 0) pacientesList = [...localPacientes];

  return planesList.map((plan) => {
    const paciente = pacientesList.find((p) => p.id === plan.paciente_id);
    const finalPrice = plan.total_final_clp ?? plan.valor_total ?? 0;

    return {
      ...plan,
      total_final_clp: finalPrice,
      paciente_nombre: paciente?.nombre_completo || "Paciente Registrado",
      paciente_rut: paciente?.rut || "Sin RUT",
    };
  });
}

export async function fetchResumenFinanciero(): Promise<ResumenFinanciero> {
  const ventas = await fetchHistorialVentas();
  const egresos = await fetchEgresosCaja();

  const currentMonthStr = new Date().toISOString().slice(0, 7); // '2026-08'

  // Ventas del mes
  const ventasMes = ventas.filter(
    (v) => (v.fecha_compra || "").startsWith(currentMonthStr)
  );
  const ingresosMesCLP = ventasMes.reduce(
    (sum, v) => sum + (v.total_final_clp ?? v.valor_total ?? 0),
    0
  );

  const ticketPromedioCLP =
    ventasMes.length > 0 ? Math.round(ingresosMesCLP / ventasMes.length) : 0;

  // Egresos del mes
  const egresosMes = egresos.filter((e) => (e.fecha || "").startsWith(currentMonthStr));
  const egresosMesCLP = egresosMes.reduce((sum, e) => sum + (e.monto_clp || 0), 0);

  const flujoNetoCLP = ingresosMesCLP - egresosMesCLP;

  return {
    ingresosMesCLP,
    ticketPromedioCLP,
    egresosMesCLP,
    flujoNetoCLP,
    totalVentasMes: ventasMes.length,
    totalEgresosMes: egresosMes.length,
  };
}

// ==========================================
// 5. PACIENTES Y RESUMEN
// ==========================================

export async function fetchVistaResumenPacientes(): Promise<VistaResumenPaciente[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("vista_resumen_pacientes")
        .select("*");

      if (error) {
        console.warn(
          "Aviso vista_resumen_pacientes (fallback local):",
          error.message
        );
      } else if (data && data.length > 0) {
        return data as VistaResumenPaciente[];
      }
    } catch (err) {
      console.warn("Error de conexión Supabase, usando respaldo local:", err);
    }
  }

  return computeMockVistaResumen(localPacientes, localPlanes, localCitas);
}

export async function fetchPacienteById(id: string): Promise<Paciente | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) return data as Paciente;
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }
  return localPacientes.find((p) => p.id === id) || null;
}

// ==========================================
// 6. CITAS Y ATENCIONES
// ==========================================

export async function fetchCitasByPaciente(pacienteId: string): Promise<CitaAtencion[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("citas_atenciones")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false });
      if (!error && data && data.length > 0) return data as CitaAtencion[];
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }
  return localCitas
    .filter((c) => c.paciente_id === pacienteId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function registrarAsistenciaHoy(
  pacienteId: string,
  profesional = "Klgo. Ignacio Cuevas Silva"
): Promise<{ success: boolean; data?: CitaAtencion; error?: string }> {
  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("citas_atenciones")
        .insert([
          {
            paciente_id: pacienteId,
            fecha: today,
            hora: nowTime,
            profesional,
            estado: "Asistió",
            notas: "Asistencia registrada desde Kiromov Core",
          },
        ])
        .select()
        .single();

      if (error) {
        console.warn("Error inserting into Supabase citas_atenciones:", error.message);
      } else if (data) {
        return { success: true, data: data as CitaAtencion };
      }
    } catch (err) {
      console.warn("Supabase error during attendance registration:", err);
    }
  }

  // Local fallback
  const newCita: CitaAtencion = {
    id: "cita-" + Date.now(),
    paciente_id: pacienteId,
    fecha: today,
    hora: nowTime,
    profesional,
    estado: "Asistió",
    notas: "Asistencia registrada desde Kiromov Core",
    created_at: new Date().toISOString(),
  };

  localCitas.unshift(newCita);
  return { success: true, data: newCita };
}

// ==========================================
// 7. PLANES Y COMPRAS HISTÓRICAS
// ==========================================

export async function fetchPlanesByPaciente(pacienteId: string): Promise<CompraPlan[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("compras_planes")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("fecha_compra", { ascending: false });
      if (!error && data && data.length > 0) return data as CompraPlan[];
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }
  return localPlanes
    .filter((p) => p.paciente_id === pacienteId)
    .sort((a, b) => new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime());
}

export async function registrarCompraPlan(
  compra: Omit<CompraPlan, "id" | "created_at">
): Promise<{ success: boolean; data?: CompraPlan; error?: string }> {
  const finalPrice = compra.total_final_clp ?? compra.valor_total;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("compras_planes")
        .insert([
          {
            ...compra,
            total_final_clp: finalPrice,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        if (compra.codigo_cupon) {
          try {
            await supabase.rpc("increment_coupon_usage", {
              coupon_code: compra.codigo_cupon,
            });
          } catch {}
        }
        return { success: true, data: data as CompraPlan };
      }
      if (error) {
        console.warn("Error inserting compra into Supabase:", error.message);
      }
    } catch (err) {
      console.warn("Supabase error during plan sale registration:", err);
    }
  }

  // Local fallback
  const newCompra: CompraPlan = {
    ...compra,
    total_final_clp: finalPrice,
    id: "plan-" + Date.now(),
    created_at: new Date().toISOString(),
  };

  if (compra.codigo_cupon) {
    const cup = localCupones.find(
      (c) => c.codigo.toUpperCase() === compra.codigo_cupon?.toUpperCase()
    );
    if (cup) {
      cup.usos_actuales += 1;
    }
  }

  localPlanes.unshift(newCompra);
  return { success: true, data: newCompra };
}

// ==========================================
// 8. EVOLUCIONES SOAP
// ==========================================

export async function fetchEvolucionesByPaciente(pacienteId: string): Promise<EvolucionSOAP[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("evoluciones_soap")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false });
      if (!error && data && data.length > 0) return data as EvolucionSOAP[];
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }
  return localEvoluciones
    .filter((e) => e.paciente_id === pacienteId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function guardarEvolucionSOAP(
  evolucion: Omit<EvolucionSOAP, "id" | "created_at">
): Promise<{ success: boolean; data?: EvolucionSOAP; error?: string }> {
  const s = evolucion.s_subjetivo || evolucion.subjetivo || evolucion.s || "";
  const o = evolucion.o_objetivo || evolucion.objetivo || evolucion.o || "";
  const a = evolucion.a_analisis || evolucion.analisis || evolucion.a || "";
  const p = evolucion.p_plan || evolucion.plan || evolucion.p || "";
  const ena = evolucion.nivel_dolor_ena ?? evolucion.ena_dolor ?? evolucion.ena ?? 0;
  const mapaDolor = evolucion.mapa_dolor_svg || null;
  const hallazgos = evolucion.hallazgos_frecuentes || [];
  const cuestionario = evolucion.cuestionario_funcional || null;
  const discapacidadPct = evolucion.discapacidad_funcional_pct ?? null;
  const pronostico = evolucion.pronostico_sesiones_estimadas || null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("evoluciones_soap")
        .insert([
          {
            paciente_id: evolucion.paciente_id,
            fecha: evolucion.fecha,
            profesional: evolucion.profesional || "Klgo. Ignacio Cuevas Silva",
            s_subjetivo: s,
            o_objetivo: o,
            a_analisis: a,
            p_plan: p,
            nivel_dolor_ena: ena,
            mapa_dolor_svg: mapaDolor,
            hallazgos_frecuentes: hallazgos,
            cuestionario_funcional: cuestionario,
            discapacidad_funcional_pct: discapacidadPct,
            pronostico_sesiones_estimadas: pronostico,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as EvolucionSOAP };
      }
    } catch (err) {}

    try {
      const { data, error } = await supabase
        .from("evoluciones_soap")
        .insert([
          {
            paciente_id: evolucion.paciente_id,
            fecha: evolucion.fecha,
            profesional: evolucion.profesional || "Klgo. Ignacio Cuevas Silva",
            subjetivo: s,
            objetivo: o,
            analisis: a,
            plan: p,
            ena_dolor: ena,
            mapa_dolor_svg: mapaDolor,
            hallazgos_frecuentes: hallazgos,
            cuestionario_funcional: cuestionario,
            discapacidad_funcional_pct: discapacidadPct,
            pronostico_sesiones_estimadas: pronostico,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as EvolucionSOAP };
      } else if (error) {
        console.warn("Error inserting SOAP into Supabase:", error.message);
      }
    } catch (err) {
      console.warn("Supabase error during SOAP insertion:", err);
    }
  }

  // Local fallback
  const newSoap: EvolucionSOAP = {
    id: "soap-" + Date.now(),
    paciente_id: evolucion.paciente_id,
    fecha: evolucion.fecha,
    profesional: evolucion.profesional || "Klgo. Ignacio Cuevas Silva",
    s_subjetivo: s,
    subjetivo: s,
    o_objetivo: o,
    objetivo: o,
    a_analisis: a,
    analisis: a,
    p_plan: p,
    plan: p,
    nivel_dolor_ena: ena,
    ena_dolor: ena,
    mapa_dolor_svg: mapaDolor,
    hallazgos_frecuentes: hallazgos,
    cuestionario_funcional: cuestionario,
    discapacidad_funcional_pct: discapacidadPct,
    pronostico_sesiones_estimadas: pronostico,
    created_at: new Date().toISOString(),
  };

  localEvoluciones.unshift(newSoap);
  return { success: true, data: newSoap };
}
