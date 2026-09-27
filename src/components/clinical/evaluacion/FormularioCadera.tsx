'use client';

import React from 'react';

interface Props {
  datos: any;
  setDatos: (val: any) => void;
}

export function FormularioCadera({ datos, setDatos }: Props) {
  const updateData = (key: string, value: any) => {
    setDatos({ ...datos, [key]: value });
  };

  const ToggleButtons = ({ label, field, options }: { label: string, field: string, options: string[] }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2 flex-wrap">
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
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">1. Movilidad Articular (ROM Coxofemoral)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Flexión (0-120°)</label>
            <input 
              type="text" 
              placeholder="Ej: 110°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_flexion_cadera || ''}
              onChange={(e) => updateData('rom_flexion_cadera', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Extensión (0-20°)</label>
            <input 
              type="text" 
              placeholder="Ej: 15°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_extension_cadera || ''}
              onChange={(e) => updateData('rom_extension_cadera', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Abducción (0-45°)</label>
            <input 
              type="text" 
              placeholder="Ej: 40°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_abduccion_cadera || ''}
              onChange={(e) => updateData('rom_abduccion_cadera', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Aducción (0-30°)</label>
            <input 
              type="text" 
              placeholder="Ej: 20°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_aduccion_cadera || ''}
              onChange={(e) => updateData('rom_aduccion_cadera', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Rot. Interna (0-35°)</label>
            <input 
              type="text" 
              placeholder="Ej: 15° (Déficit)"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_rot_int_cadera || ''}
              onChange={(e) => updateData('rom_rot_int_cadera', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Rot. Externa (0-45°)</label>
            <input 
              type="text" 
              placeholder="Ej: 45°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_rot_ext_cadera || ''}
              onChange={(e) => updateData('rom_rot_ext_cadera', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">2. Pruebas Ortopédicas y de Choque</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleButtons label="FADIR Test (FAI)" field="test_fadir" options={['+', '-', 'N/E']} />
          <ToggleButtons label="FABER / Patrick" field="test_faber_cadera" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de Thomas" field="test_thomas" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Signo de Trendelenburg" field="test_trendelenburg" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de Ober" field="test_ober" options={['+', '-', 'N/E']} />
        </div>
      </div>
    </div>
  );
}
