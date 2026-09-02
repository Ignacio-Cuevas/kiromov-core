import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Replace getRangoFechas
old_getRango = r"  const getRangoFechas = \(tipo: PeriodoFiltro\) => \{.*?return \{.*?inicio: inicio\.toISOString\(\)\.split\('T'\)\[0\],.*?fin: fin\.toISOString\(\)\.split\('T'\)\[0\].*?\};.*?  \};"
new_getRango = """  const getRangoFechas = (tipo: string) => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = ahora.getMonth();

    if (tipo === 'este_mes') {
      return {
        inicio: new Date(year, month, 1, 0, 0, 0),
        fin: new Date(year, month + 1, 0, 23, 59, 59, 999)
      };
    }
    if (tipo === 'mes_anterior') {
      return {
        inicio: new Date(year, month - 1, 1, 0, 0, 0),
        fin: new Date(year, month, 0, 23, 59, 59, 999)
      };
    }
    if (tipo === 'este_semestre') {
      const semestre = month < 6 ? 0 : 6;
      return {
        inicio: new Date(year, semestre, 1, 0, 0, 0),
        fin: new Date(year, semestre + 6, 0, 23, 59, 59, 999)
      };
    }
    if (tipo === 'este_ano') {
      return {
        inicio: new Date(year, 0, 1, 0, 0, 0),
        fin: new Date(year, 11, 31, 23, 59, 59, 999)
      };
    }
    return {
      inicio: new Date(2020, 0, 1),
      fin: new Date(2030, 11, 31)
    };
  };"""
content = re.sub(old_getRango, new_getRango, content, flags=re.DOTALL)


# 2. Replace the filtering logic and KPIs
old_filters = r"  // Filtrado dinámico por fecha.*?const cantidadDeudores = pendientes\.length;"
new_filters = """  // Filtrado dinámico por fecha
  const asistenciasFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return citas.filter(a => {
      const fechaRaw = a.fecha || a.created_at;
      if (!fechaRaw) return false;
      
      // Manejo estricto de string para evitar desfases de UTC si es YYYY-MM-DD
      const f = fechaRaw.includes('T') ? new Date(fechaRaw) : new Date(`${fechaRaw}T12:00:00Z`);
      return f >= inicio && f <= fin;
    });
  }, [citas, periodo]);

  const transaccionesFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return compras.filter((t) => {
      const fechaRaw = t.fecha_compra || t.created_at || t.fecha;
      if (!fechaRaw) return false;
      const f = fechaRaw.includes('T') ? new Date(fechaRaw) : new Date(`${fechaRaw}T12:00:00Z`);
      return f >= inicio && f <= fin;
    });
  }, [compras, periodo]);

  const egresosFiltrados = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return egresos.filter((e) => {
      const fechaRaw = e.fecha || e.created_at;
      if (!fechaRaw) return false;
      const f = fechaRaw.includes('T') ? new Date(fechaRaw) : new Date(`${fechaRaw}T12:00:00Z`);
      return f >= inicio && f <= fin;
    });
  }, [egresos, periodo]);

  // KPIs
  const kpisCalculados = useMemo(() => {
    const ingresos = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pagado')
      .reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);

    const porCobrar = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pendiente')
      .reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);

    const deudoresCount = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pendiente').length;

    const totalEgresos = egresosFiltrados
      .reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0);

    const flujoNeto = ingresos - totalEgresos;

    return { ingresos, porCobrar, deudoresCount, totalEgresos, flujoNeto };
  }, [transaccionesFiltradas, egresosFiltrados]);

  // Arrays derivados para las tabs de "Quién Debe"
  const pendientes = useMemo(() => transaccionesFiltradas.filter(t => t.estado_pago === 'pendiente'), [transaccionesFiltradas]);
"""
content = re.sub(old_filters, new_filters, content, flags=re.DOTALL)

# 3. Fix the JSX interpolations in the Cards
content = content.replace("formatCLP(ingresosPagados)", "formatCLP(kpisCalculados.ingresos)")
content = content.replace("formatCLP(egresosTotales)", "formatCLP(kpisCalculados.totalEgresos)")
content = content.replace("formatCLP(flujoNeto)", "formatCLP(kpisCalculados.flujoNeto)")
content = content.replace("formatCLP(totalPorCobrar)", "formatCLP(kpisCalculados.porCobrar)")
content = content.replace("{cantidadDeudores} PACIENTES", "{kpisCalculados.deudoresCount} PACIENTES")
content = content.replace("flujoNeto >=", "kpisCalculados.flujoNeto >=")

with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(content)

print("Finanzas reactividad de KPIs implementada con Date parsing estricto.")
