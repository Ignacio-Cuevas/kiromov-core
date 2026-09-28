const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/clinical/InitialEvaluationModal.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldRenderPaso1 = `  const renderPaso1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">`;

const newRenderPaso1 = `  const renderPaso1 = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 w-full md:w-1/2 mb-4">
        <label className="text-sm font-semibold text-slate-700">Fecha de Evaluación <span className="text-rose-500">*</span></label>
        <Input 
          type="date"
          value={fechaEvaluacion}
          onChange={(e) => setFechaEvaluacion(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">`;

content = content.replace(oldRenderPaso1, newRenderPaso1);

// We should also make sure the payload follows the user's ISO requirement, just in case they change the DB type later.
const oldPayload = `      const payload = {
        paciente_id: paciente.id,
        fecha_evaluacion: fechaEvaluacion,
        segmento_evaluado: segmento,`;

const newPayload = `      const payload = {
        paciente_id: paciente.id,
        fecha_evaluacion: fechaEvaluacion 
          ? new Date(fechaEvaluacion + 'T12:00:00Z').toISOString() 
          : new Date().toISOString(),
        segmento_evaluado: segmento,`;

content = content.replace(oldPayload, newPayload);

fs.writeFileSync(file, content);
console.log('Fixed Date input in Modal');
