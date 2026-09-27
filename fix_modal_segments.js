const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/clinical/InitialEvaluationModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
const imports = `import { FormularioHombro } from './evaluacion/FormularioHombro';
import { FormularioCadera } from './evaluacion/FormularioCadera';
import { FormularioRodilla } from './evaluacion/FormularioRodilla';
import { FormularioTobillo } from './evaluacion/FormularioTobillo';`;

content = content.replace("import { FormularioHombro } from './evaluacion/FormularioHombro';", imports);

// 2. Update renderPaso2
const oldPaso2 = `  const renderPaso2 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      {[
        { id: 'lumbar', icon: '🦴', label: 'Columna Lumbar y Pelvis' },
        { id: 'cervical', icon: '🧠', label: 'Columna Cervical' },
        { id: 'hombro', icon: '💪', label: 'Hombro y Escápula' },
        { id: 'otro', icon: '➕', label: 'Evaluación General / Otro' },
      ].map((seg) => (`;

const newPaso2 = `  const renderPaso2 = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
      {[
        { id: 'lumbar', icon: '🦴', label: 'Columna Lumbar' },
        { id: 'cervical', icon: '🧠', label: 'Columna Cervical' },
        { id: 'hombro', icon: '💪', label: 'Hombro y Escápula' },
        { id: 'cadera', icon: '🦵', label: 'Cadera y Pelvis' },
        { id: 'rodilla', icon: '🦵', label: 'Rodilla' },
        { id: 'tobillo_pie', icon: '🦶', label: 'Tobillo y Pie' },
        { id: 'otro', icon: '➕', label: 'Otro' },
      ].map((seg) => (`;

content = content.replace(oldPaso2, newPaso2);

// 3. Update renderPaso3
const oldPaso3 = `  const renderPaso3 = () => {
    if (segmento === 'lumbar') return <FormularioLumbar datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'cervical') return <FormularioCervical datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'hombro') return <FormularioHombro datos={datosSegmento} setDatos={setDatosSegmento} />;
    
    return (
      <div className="p-8 text-center text-slate-500">
        Sección genérica. (Próximamente más formularios específicos).
      </div>
    );
  };`;

const newPaso3 = `  const renderPaso3 = () => {
    if (segmento === 'lumbar') return <FormularioLumbar datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'cervical') return <FormularioCervical datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'hombro') return <FormularioHombro datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'cadera') return <FormularioCadera datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'rodilla') return <FormularioRodilla datos={datosSegmento} setDatos={setDatosSegmento} />;
    if (segmento === 'tobillo_pie') return <FormularioTobillo datos={datosSegmento} setDatos={setDatosSegmento} />;
    
    return (
      <div className="p-8 text-center text-slate-500">
        Sección genérica. (Formulario en desarrollo).
      </div>
    );
  };`;

content = content.replace(oldPaso3, newPaso3);

fs.writeFileSync(filePath, content);
console.log('Fixed InitialEvaluationModal!');
