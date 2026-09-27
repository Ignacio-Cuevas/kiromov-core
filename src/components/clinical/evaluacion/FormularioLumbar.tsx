'use client';

import React from 'react';

interface Props {
  datos: any;
  setDatos: (val: any) => void;
}

export function FormularioLumbar({ datos, setDatos }: Props) {
  const updateData = (key: string, value: any) => {
    setDatos({ ...datos, [key]: value });
  };

  const ToggleButtons = ({ label, field, options }: { label: string, field: string, options: string[] }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => updateData(field, opt)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              datos[field] === opt
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">1. Movilidad Activa (ROM Lumbar)</h3>
        <div className="grid grid-cols-2 gap-4">
          <ToggleButtons label="Flexión" field="rom_flexion" options={['Libre', 'Limitado', 'Doloroso', 'N/E']} />
          <ToggleButtons label="Extensión" field="rom_extension" options={['Libre', 'Limitado', 'Doloroso', 'N/E']} />
          <ToggleButtons label="Inclinación Der/Izq" field="rom_inclinacion" options={['Libre', 'Limitado', 'Doloroso', 'N/E']} />
          <ToggleButtons label="Rotación Der/Izq" field="rom_rotacion" options={['Libre', 'Limitado', 'Doloroso', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">2. Neurodinamia y Radiculopatía</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleButtons label="Test de Lasègue (SLR)" field="test_lasegue" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de Bragard" field="test_bragard" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Slump Test" field="test_slump" options={['+', '-', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">3. Pruebas Ortopédicas y Estabilidad</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ToggleButtons label="Prone Instability" field="test_prone" options={['+', '-', 'N/E']} />
          <ToggleButtons label="FABER / Patrick" field="test_faber" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Gaenslen" field="test_gaenslen" options={['+', '-', 'N/E']} />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Spring Test (Nivel)</label>
            <select 
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white"
              value={datos.spring_test || ''}
              onChange={(e) => updateData('spring_test', e.target.value)}
            >
              <option value="">Seleccionar nivel...</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
              <option value="L5">L5</option>
              <option value="S1">S1</option>
              <option value="Multi">Múltiples</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
