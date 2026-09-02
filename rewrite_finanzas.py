import re

file_path = 'src/app/finanzas/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add PeriodoFiltro types and state
period_code = """
type PeriodoFiltro = 'este_mes' | 'mes_anterior' | 'este_semestre' | 'este_ano' | 'todo';
"""
if "type PeriodoFiltro" not in content:
    content = content.replace("export function FinanzasContent() {", period_code + "\nexport function FinanzasContent() {")

# Add the state and getRangoFechas inside FinanzasContent
state_code = """
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('este_mes');

  const getRangoFechas = (tipo: PeriodoFiltro) => {
    const ahora = new Date();
    let inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    let fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);

    if (tipo === 'mes_anterior') {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
    } else if (tipo === 'este_semestre') {
      const semestre = ahora.getMonth() < 6 ? 0 : 6;
      inicio = new Date(ahora.getFullYear(), semestre, 1);
      fin = new Date(ahora.getFullYear(), semestre + 6, 0, 23, 59, 59);
    } else if (tipo === 'este_ano') {
      inicio = new Date(ahora.getFullYear(), 0, 1);
      fin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
    } else if (tipo === 'todo') {
      inicio = new Date(2020, 0, 1);
      fin = new Date(2030, 11, 31);
    }

    return { inicio, fin };
  };
"""
if "const [periodo, setPeriodo]" not in content:
    content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);" + state_code)

# 2. Modify loadData to use getRangoFechas
# The original loadData fetches everything without date filters, except maybe some limits.
# To do it properly, I'll update the loadData logic inside `src/app/finanzas/page.tsx`
# Wait, replacing complex logic via regex is dangerous. Let's just rewrite the loadData function block.
# Actually, the user asked to replace "botones fijos por un selector de períodos flexible".
# Let's see if there are fixed buttons right now.

