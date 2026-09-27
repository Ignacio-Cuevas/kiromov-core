'use client';

import React from 'react';

interface Props {
  datos: any;
  setDatos: (val: any) => void;
}

export function FormularioRodilla({ datos, setDatos }: Props) {
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
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">1. Movilidad Activa y Pasiva</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Flexión (0-135°/140°)</label>
            <input 
              type="text" 
              placeholder="Ej: 120°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_flexion_rodilla || ''}
              onChange={(e) => updateData('rom_flexion_rodilla', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Extensión (0° / recurvatum)</label>
            <input 
              type="text" 
              placeholder="Ej: -5° (déficit) o +5°"
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200"
              value={datos.rom_extension_rodilla || ''}
              onChange={(e) => updateData('rom_extension_rodilla', e.target.value)}
            />
          </div>
          <ToggleButtons label="Derrame Articular (Choque rotuliano)" field="derrame_articular" options={['+', '-', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">2. Batería Ligamentaria y Meniscal</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleButtons label="Lachman Test (LCA)" field="test_lachman" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Cajón Anterior" field="test_cajon_anterior_rodilla" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Cajón Posterior" field="test_cajon_posterior_rodilla" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Bostezo Medial (Valgo)" field="test_bostezo_medial" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Bostezo Lateral (Varo)" field="test_bostezo_lateral" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de McMurray" field="test_mcmurray" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Test de Apley (Tracción/Compresión)" field="test_apley" options={['+', '-', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">3. Complejo Patelofemoral</h3>
        <div className="grid grid-cols-2 gap-4">
          <ToggleButtons label="Aprehensión Patelar (Fairbank)" field="test_fairbank" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Signo de Clark" field="test_clark" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Movilidad Pasiva de Rótula" field="movilidad_rotula" options={['Normal', 'Hipo-móvil', 'Hiper-móvil', 'N/E']} />
        </div>
      </div>
    </div>
  );
}
