'use client';

import React from 'react';

interface Props {
  datos: any;
  setDatos: (val: any) => void;
}

export function FormularioTobillo({ datos, setDatos }: Props) {
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
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">1. Movilidad y Test Funcional</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Plantiflexión (0-50°)</label>
            <input 
              type="text" 
              placeholder="Ej: 40°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_plantiflexion || ''}
              onChange={(e) => updateData('rom_plantiflexion', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Dorsiflexión (0-20°)</label>
            <input 
              type="text" 
              placeholder="Ej: 15°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_dorsiflexion || ''}
              onChange={(e) => updateData('rom_dorsiflexion', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">WBLT (Dorsiflexión en carga - cm)</label>
            <input 
              type="text" 
              placeholder="Ej: 8 cm"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_wblt || ''}
              onChange={(e) => updateData('rom_wblt', e.target.value)}
            />
          </div>
          <ToggleButtons label="Inversión / Eversión" field="movilidad_subastragalina" options={['Libre', 'Limitada', 'Dolorosa', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">2. Estabilidad Ligamentosa y Tendinosa</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleButtons label="Cajón Anterior (LPAA)" field="test_cajon_anterior_tobillo" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Inversión Forzada (Inclinación Talar)" field="test_inversion_forzada" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de Thompson (Aquiles)" field="test_thompson" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de Windlass" field="test_windlass" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Compresión de Morton" field="test_morton" options={['+', '-', 'N/E']} />
        </div>
      </div>
    </div>
  );
}
