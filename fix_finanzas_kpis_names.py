import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Remove kpisCalculados
old_kpis = r"""  // KPIs\s*const kpisCalculados = useMemo\(\(\) => \{.*?\}, \[transaccionesFiltradas, egresosFiltrados\]\);"""
new_kpis = """  // KPIs
  const ingresosPeriodo = useMemo(() => {
    return transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pagado')
      .reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);
  }, [transaccionesFiltradas]);

  const egresosPeriodo = useMemo(() => {
    return egresosFiltrados
      .reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0);
  }, [egresosFiltrados]);

  const flujoNetoPeriodo = useMemo(() => {
    return ingresosPeriodo - egresosPeriodo;
  }, [ingresosPeriodo, egresosPeriodo]);
  
  const porCobrarPeriodo = useMemo(() => {
    return transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pendiente')
      .reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);
  }, [transaccionesFiltradas]);

  const deudoresCount = transaccionesFiltradas
      .filter((t) => t.estado_pago === 'pendiente').length;"""
content = re.sub(old_kpis, new_kpis, content, flags=re.DOTALL)

# Replace in JSX
content = content.replace("formatCLP(kpisCalculados.ingresos)", "formatCLP(ingresosPeriodo)")
content = content.replace("formatCLP(kpisCalculados.totalEgresos)", "formatCLP(egresosPeriodo)")
content = content.replace("formatCLP(kpisCalculados.flujoNeto)", "formatCLP(flujoNetoPeriodo)")
content = content.replace("formatCLP(kpisCalculados.porCobrar)", "formatCLP(porCobrarPeriodo)")
content = content.replace("kpisCalculados.flujoNeto >=", "flujoNetoPeriodo >=")
content = content.replace("kpisCalculados.deudoresCount", "deudoresCount")

with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(content)

print("Finanzas KPI names applied.")
