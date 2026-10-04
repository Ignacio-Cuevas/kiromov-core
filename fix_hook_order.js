const fs = require('fs');

let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

const hookText = `  React.useEffect(() => {
    if (vista === 'dia' && citasFiltradas.length > 0 && !selectedPatientForDrawer) {
      // Intentar buscar la cita mas cercana o la primera
      const first = citasFiltradas[0];
      const p = first.pacientes || { id: first.paciente_id };
      setSelectedPatientForDrawer(p);
      setSelectedCitaForSuite(first);
    }
  }, [vista, citasFiltradas]);
`;

// Remove it from current position
c = c.replace(hookText, '');

// Insert it right after `citasFiltradas` useMemo ends
const insertPoint = c.indexOf('  const diasAMostrar = useMemo(() => {');
if (insertPoint !== -1) {
    c = c.substring(0, insertPoint) + hookText + '\n' + c.substring(insertPoint);
}

fs.writeFileSync('src/app/agenda/page.tsx', c);
