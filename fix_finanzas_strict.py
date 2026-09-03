import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace transaccionesFiltradas
old_transacciones = r"""  const transaccionesFiltradas = useMemo\(\(\) => \{.*?const f = fechaRaw\.includes\('T'\) \? new Date\(fechaRaw\) : new Date\(`\$\{fechaRaw\}T12:00:00Z`\);.*?return f >= inicio && f <= fin;.*?  \}, \[compras, periodo\]\);"""
new_transacciones = """  const transaccionesFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return compras.filter((t) => {
      if (!t.created_at) return false;
      const f = new Date(t.created_at);
      return f >= inicio && f <= fin;
    });
  }, [compras, periodo]);"""
content = re.sub(old_transacciones, new_transacciones, content, flags=re.DOTALL)

# Replace egresosFiltrados
old_egresos = r"""  const egresosFiltrados = useMemo\(\(\) => \{.*?const f = fechaRaw\.includes\('T'\) \? new Date\(fechaRaw\) : new Date\(`\$\{fechaRaw\}T12:00:00Z`\);.*?return f >= inicio && f <= fin;.*?  \}, \[egresos, periodo\]\);"""
new_egresos = """  const egresosFiltrados = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return egresos.filter((e) => {
      if (!e.created_at) return false;
      const f = new Date(e.created_at);
      return f >= inicio && f <= fin;
    });
  }, [egresos, periodo]);"""
content = re.sub(old_egresos, new_egresos, content, flags=re.DOTALL)


# Replace asistenciasFiltradas
old_asistencias = r"""  const asistenciasFiltradas = useMemo\(\(\) => \{.*?const f = fechaRaw\.includes\('T'\) \? new Date\(fechaRaw\) : new Date\(`\$\{fechaRaw\}T12:00:00Z`\);.*?return f >= inicio && f <= fin;.*?  \}, \[citas, periodo\]\);"""
new_asistencias = """  const asistenciasFiltradas = useMemo(() => {
    const { inicio, fin } = getRangoFechas(periodo);
    return citas.filter((a) => {
      if (!a.created_at) return false;
      const f = new Date(a.created_at);
      return f >= inicio && f <= fin;
    });
  }, [citas, periodo]);"""
content = re.sub(old_asistencias, new_asistencias, content, flags=re.DOTALL)

with open('src/app/finanzas/page.tsx', 'w') as f:
    f.write(content)

print("Finanzas strict created_at applied.")
