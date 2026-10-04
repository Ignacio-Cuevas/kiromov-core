const fs = require('fs');

let c = fs.readFileSync('src/app/agenda/page.tsx', 'utf-8');

// 1. Remove $ from renderCardCita
c = c.replace(/\$\{(horaInicio)\}/g, '{$1}');
c = c.replace(/\$\{(horaFin)\}/g, '{$1}');
c = c.replace(/\$\{(p\.nombre_completo)\}/g, '{$1}');
c = c.replace(/\$\{(motivo)\}/g, '{$1}');

// 2. Fix badge logic
c = c.replace(/const debePago = p\.estado_pago === 'pendiente';/, "const debePago = p.estado_pago === 'pendiente' && (p.valor_total || 0) > 0;");

// 3. Auto-select in Day View (Cockpit)
const autoSelectEffect = `  React.useEffect(() => {
    if (vista === 'dia' && citasFiltradas.length > 0 && !selectedPatientForDrawer) {
      // Intentar buscar la cita mas cercana o la primera
      const first = citasFiltradas[0];
      const p = first.pacientes || { id: first.paciente_id };
      setSelectedPatientForDrawer(p);
      setSelectedCitaForSuite(first);
    }
  }, [vista, citasFiltradas]);
`;

// Insert after the hooks (maybe after `const [isSyncing, setIsSyncing] = useState(false);`)
c = c.replace(/const \[isSyncing, setIsSyncing\] = useState\(false\);/, "const [isSyncing, setIsSyncing] = useState(false);\n" + autoSelectEffect);

fs.writeFileSync('src/app/agenda/page.tsx', c);
