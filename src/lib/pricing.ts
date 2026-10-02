export type CategoriaTarifa = 'particular_vigente' | 'convenio' | 'tarifa_antigua' | 'personalizada';

export interface PlanCatalogoOficial {
  id: string;
  nombre: string;
  sesiones: number;
}

export const PLANES_BASE: PlanCatalogoOficial[] = [
  { id: 'activa_care_4', nombre: 'Plan Activa Care', sesiones: 4 },
  { id: 'pro_care_6', nombre: 'Plan Pro Care', sesiones: 6 },
  { id: 'integral_10', nombre: 'Plan Integral', sesiones: 10 }
];

export function getArancel(categoria: string | null | undefined) {
  const cat = categoria || 'particular_vigente';
  
  if (cat === 'convenio') {
    return {
      sesion_individual: 25000,
      activa_care_4: 75000,
      pro_care_6: 110000,
      integral_10: 200000
    };
  }
  
  if (cat === 'tarifa_antigua') {
    return {
      sesion_individual: 20000,
      activa_care_4: 75000,
      pro_care_6: 110000,
      integral_10: 200000
    };
  }
  
  // particular_vigente
  return {
    sesion_individual: 28000,
    activa_care_4: 104000,
    pro_care_6: 145000,
    integral_10: 250000
  };
}

export function getCatalogoPlanesParaPaciente(categoria: string | null | undefined) {
  const aranceles = getArancel(categoria);
  return [
    { ...PLANES_BASE[0], precio: aranceles.activa_care_4 },
    { ...PLANES_BASE[1], precio: aranceles.pro_care_6 },
    { ...PLANES_BASE[2], precio: aranceles.integral_10 },
    { id: 'custom', nombre: '✨ Plan Personalizado / A Medida', sesiones: 1, precio: 0 }
  ];
}
