import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Modify loadData to fetch without date limits
old_loadData = r"""  const loadData = async \(\) => \{.*?setLoading\(true\);.*?const \{ inicio, fin \} = getRangoFechas\(periodo\);.*?try \{.*?const \[resCitas, resCompras, resEgresos\] = await Promise\.all\(\[.*?supabase\.from\('citas_atenciones'\).*?\.in\('estado', \['asistio', 'atendido'\]\).*?\.gte\('fecha', inicio\).*?\.lte\('fecha', fin\).*?\.order\('fecha', \{ ascending: false \}\),.*?supabase\.from\('compras_planes'\).*?\.gte\('fecha_compra', inicio\).*?\.lte\('fecha_compra', fin\).*?\.order\('fecha_compra', \{ ascending: false \}\),.*?supabase\.from\('egresos_caja'\).*?\.gte\('fecha', inicio\).*?\.lte\('fecha', fin\).*?\.order\('fecha', \{ ascending: false \}\).*?\]\);.*?setCitas\(resCitas\.data \|\| \[\]\);.*?setCompras\(resCompras\.data \|\| \[\]\);.*?setEgresos\(resEgresos\.data \|\| \[\]\);.*?\} catch \(err\) \{.*?console\.error\(err\);.*?toast\.error\('Error cargando finanzas'\);.*?\} finally \{.*?setLoading\(false\);.*?\}
  \};"""

new_loadData = """  const loadData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [resCitas, resCompras, resEgresos] = await Promise.all([
        supabase.from('citas_atenciones')
          .select('*, pacientes(nombre_completo, rut)')
          .in('estado', ['asistio', 'atendido'])
          .order('fecha', { ascending: false }),
        supabase.from('compras_planes')
          .select('*, pacientes(nombre_completo, rut)')
          .order('fecha_compra', { ascending: false }),
        supabase.from('egresos_caja')
          .select('*')
          .order('fecha', { ascending: false })
      ]);

      setCitas(resCitas.data || []);
      setCompras(resCompras.data || []);
      setEgresos(resEgresos.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando finanzas');
    } finally {
      setLoading(false);
    }
  };"""

content = re.sub(old_loadData, new_loadData, content, flags=re.DOTALL)

# 2. Change useEffect to loadData only on mount, not on periodo change
content = content.replace("useEffect(() => {\n    loadData();\n  }, [periodo]);", "useEffect(() => {\n    loadData();\n  }, []);")


# 3. Add useMemo for reactive filtering
old_kpis = r"  // KPIs calculados.*?const cantidadDeudores = pendientes\.length;"
new_kpis = """  // Filtrado dinámico por fecha
  const asistenciasFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return citas.filter(c => {
      const fecha = c.fecha || c.created_at;
      return fecha >= inicio && fecha <= fin;
    });
  }, [citas, periodo]);

  const transaccionesFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return compras.filter(c => {
      const fecha = c.fecha_compra || c.created_at;
      return fecha >= inicio && fecha <= fin;
    });
  }, [compras, periodo]);

  const egresosFiltrados = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return egresos.filter(e => {
      const fecha = e.fecha || e.created_at;
      return fecha >= inicio && fecha <= fin;
    });
  }, [egresos, periodo]);

  // KPIs calculados
  const ingresosPagados = useMemo(() => transaccionesFiltradas.filter(c => c.estado_pago === 'pagado').reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0), [transaccionesFiltradas]);
  const egresosTotales = useMemo(() => egresosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto_clp) || 0), 0), [egresosFiltrados]);
  const flujoNeto = ingresosPagados - egresosTotales;
  
  const pendientes = useMemo(() => transaccionesFiltradas.filter(c => c.estado_pago === 'pendiente'), [transaccionesFiltradas]);
  const totalPorCobrar = pendientes.reduce((acc, curr) => acc + (Number(curr.monto_clp || curr.valor_total) || 0), 0);
  const cantidadDeudores = pendientes.length;"""

content = re.sub(old_kpis, new_kpis, content, flags=re.DOTALL)

# 4. Update the render loops to use the filtered arrays
# Replace citas.length -> asistenciasFiltradas.length
content = content.replace("citas.length ===", "asistenciasFiltradas.length ===")
content = content.replace("citas.map((c)", "asistenciasFiltradas.map((c)")
# Replace compras.filter -> transaccionesFiltradas.filter
content = content.replace("compras.filter(c => c.estado_pago === 'pagado')", "transaccionesFiltradas.filter(c => c.estado_pago === 'pagado')")
# Replace egresos.length -> egresosFiltrados.length
content = content.replace("egresos.length ===", "egresosFiltrados.length ===")
content = content.replace("egresos.map((e)", "egresosFiltrados.map((e)")

with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(content)

print("Finanzas reactivity applied.")
