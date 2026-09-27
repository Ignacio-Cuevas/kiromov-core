'use client';

import React from 'react';

interface Props {
  datos: any;
  setDatos: (val: any) => void;
}

export function FormularioCervical({ datos, setDatos }: Props) {
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
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">1. Movilidad Activa (ROM Cervical)</h3>
        <div className="grid grid-cols-2 gap-4">
          <ToggleButtons label="Flexión" field="rom_flexion_cervical" options={['Normal', 'Dolor', 'Bloqueo', 'N/E']} />
          <ToggleButtons label="Extensión" field="rom_extension_cervical" options={['Normal', 'Dolor', 'Bloqueo', 'N/E']} />
          <ToggleButtons label="Inclinaciones" field="rom_inclinacion_cervical" options={['Normal', 'Dolor', 'Bloqueo', 'N/E']} />
          <ToggleButtons label="Rotaciones" field="rom_rotacion_cervical" options={['Normal', 'Dolor', 'Bloqueo', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">2. Pruebas de Radiculopatía y Descarte</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleButtons label="Spurling A/B" field="test_spurling" options={['+', '-', 'N/E']} />
          <ToggleButtons label="Tracción/Distracción" field="test_traccion" options={['Alivia', 'Sin cambio', 'N/E']} />
          <ToggleButtons label="ULTT 1 (Mediano)" field="test_ultt1" options={['+', '-', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">3. Inestabilidad Cráneo-Cervical</h3>
        <div className="grid grid-cols-2 gap-4">
          <ToggleButtons label="Sharp-Purser" field="test_sharp_purser" options={['Estable (-)', 'Positivo (+)', 'N/E']} />
          <ToggleButtons label="Ligamento Alar" field="test_ligamento_alar" options={['Normal', 'Laxo', 'N/E']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4">4. Palpación y Disfunción Segmentaria</h3>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Nivel Implicado</label>
          <select 
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white"
            value={datos.nivel_cervical || ''}
            onChange={(e) => updateData('nivel_cervical', e.target.value)}
          >
            <option value="">Seleccionar nivel...</option>
            <option value="C0-C2">C0-C2 (Cervical Alta)</option>
            <option value="C3-C7">C3-C7 (Cervical Baja)</option>
            <option value="CT">Transición Cérvico-Torácica</option>
          </select>
        </div>
      </div>
    </div>
  );
}
