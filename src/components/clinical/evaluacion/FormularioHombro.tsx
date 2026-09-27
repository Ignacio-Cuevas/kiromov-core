'use client';

import React from 'react';

interface Props {
  datos: any;
  setDatos: (val: any) => void;
}

export function FormularioHombro({ datos, setDatos }: Props) {
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
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">1. Arcos de Movimiento (ROM Glenohumeral)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Flexión (0-180°)</label>
            <input 
              type="text" 
              placeholder="Ej: 150°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_flexion_hombro || ''}
              onChange={(e) => updateData('rom_flexion_hombro', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Abducción (0-180°)</label>
            <input 
              type="text" 
              placeholder="Ej: 90° con dolor"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_abduccion_hombro || ''}
              onChange={(e) => updateData('rom_abduccion_hombro', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Rot. Externa (0-90°)</label>
            <input 
              type="text" 
              placeholder="Ej: 45°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_rot_ext_hombro || ''}
              onChange={(e) => updateData('rom_rot_ext_hombro', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Rot. Interna (0-70°)</label>
            <input 
              type="text" 
              placeholder="Ej: T7"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_rot_int_hombro || ''}
              onChange={(e) => updateData('rom_rot_int_hombro', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">2. Ritmo Escapular</h3>
        <ToggleButtons label="Discinesia Escapular" field="discinesia" options={['Ausente', 'Tipo I', 'Tipo II', 'Tipo III']} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">3. Batería de Pruebas Ortopédicas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleButtons label="Hawkins-Kennedy" field="test_hawkins" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Neer Test" field="test_neer" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Jobe / Empty Can" field="test_jobe" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Patte / Hornblower" field="test_patte" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Speed / Yergason" field="test_speed" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Aprehensión" field="test_aprehension" options={['+', '-', 'N/E']} />
        </div>
      </div>
    </div>
  );
}
