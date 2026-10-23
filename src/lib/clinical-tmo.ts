export type TMOTestResult = 'NE' | '+' | '-';

export interface TMOTestItem {
  id: string;
  name: string;
  type: string;
  typeLabel?: string;
}

export interface TMOInferenceRule {
  rule_id: string;
  conditions: Record<string, '+' | '-'>;
  badge: string;
  evidence: string;
  severity: 'info' | 'medium' | 'high' | 'critical' | 'low';
}

export interface TMOSegmentDefinition {
  key: string;
  label: string;
  icon: string;
  tests: TMOTestItem[];
  inference_rules: TMOInferenceRule[];
}

export const TMO_SEGMENTS: Record<string, TMOSegmentDefinition> = {
  cervical_dorsal: {
    key: 'cervical_dorsal',
    label: 'Cervical / Dorsal',
    icon: '💆',
    tests: [
      { id: 'spurling_a', name: 'Spurling A', type: 'mechanical_compression', typeLabel: 'Compresión mecánica' },
      { id: 'distraccion_cervical', name: 'Distracción Cervical', type: 'mechanical_decompression', typeLabel: 'Descompresión' },
      { id: 'ulnt1', name: 'ULNT1 (N. Mediano)', type: 'neurodynamic', typeLabel: 'Neurodinamia' },
      { id: 'cfrt', name: 'Flexión-Rotación (CFRT)', type: 'articular_mobility', typeLabel: 'Movilidad articular C1-C2' },
      { id: 'sharp_purser', name: 'Sharp-Purser / Lig. Alar', type: 'safety_stability', typeLabel: 'Seguridad / Estabilidad' },
      { id: 'cuadrante_toracico', name: 'Cuadrante Torácico / Slump', type: 'articular_dural', typeLabel: 'Dural / Articular' }
    ],
    inference_rules: [
      {
        rule_id: 'radiculopatia_cervical',
        conditions: { spurling_a: '+', distraccion_cervical: '+', ulnt1: '+' },
        badge: 'Alta probabilidad de Radiculopatía Mecánica Cervical',
        evidence: 'Cluster de Wainner modificado (LR+ > 6.0)',
        severity: 'high'
      },
      {
        rule_id: 'descarte_radiculopatia',
        conditions: { ulnt1: '-' },
        badge: 'Radiculopatía improbable por alta sensibilidad',
        evidence: 'ULNT1 negativo (Sensibilidad ~97%)',
        severity: 'info'
      },
      {
        rule_id: 'disfuncion_c1_c2',
        conditions: { cfrt: '+' },
        badge: 'Hipomovilidad Artrocinemática C1-C2 (Origen Cervicogénico)',
        evidence: 'CFRT con asimetría > 10°',
        severity: 'medium'
      },
      {
        rule_id: 'red_flag_inestabilidad_alta',
        conditions: { sharp_purser: '+' },
        badge: 'ALERTA: Sospecha de Inestabilidad Atlantoaxial (Red Flag)',
        evidence: 'Incompetencia de complejo ligamentario transverso/alar',
        severity: 'critical'
      }
    ]
  },
  lumbar_pelvis: {
    key: 'lumbar_pelvis',
    label: 'Lumbar / Pelvis',
    icon: '🦴',
    tests: [
      { id: 'lasegue_slr', name: 'Lasègue / SLR', type: 'neurodynamic', typeLabel: 'Neurodinamia ciática' },
      { id: 'prone_instability', name: 'Prueba de Inestabilidad Prona (PIT)', type: 'motor_control', typeLabel: 'Control motor lumbar' },
      { id: 'kemp_quadrant', name: 'Quadrant / Kemp Test', type: 'facet_compression', typeLabel: 'Compresión facetaria' },
      { id: 'thigh_thrust', name: 'Thigh Thrust', type: 'sij_shear', typeLabel: 'Cizalla sacroilíaca' },
      { id: 'distraction_test', name: 'Distraction Test ASI', type: 'sij_gapping', typeLabel: 'Apertura sacroilíaca' },
      { id: 'mckenzie_screen', name: 'Carga Repetida (McKenzie)', type: 'directional_preference', typeLabel: 'Preferencia direccional' }
    ],
    inference_rules: [
      {
        rule_id: 'origen_sacroiliaco',
        conditions: { thigh_thrust: '+', distraction_test: '+' },
        badge: 'Disfunción Mecánica de la Articulación Sacroilíaca',
        evidence: 'Cluster de Laslett simplificado (LR+ = 4.29)',
        severity: 'high'
      },
      {
        rule_id: 'inestabilidad_lumbar_clinica',
        conditions: { prone_instability: '+' },
        badge: 'Déficit de Control Motor Segmentario Lumbar',
        evidence: 'PIT positivo (candidato a estabilización motora lumbar)',
        severity: 'medium'
      },
      {
        rule_id: 'conflicto_facetario_lumbar',
        conditions: { kemp_quadrant: '+', lasegue_slr: '-' },
        badge: 'Sobrecarga Facetaria Posterior Mecánica',
        evidence: 'Kemp positivo sin mecano-sensibilidad ciática distal',
        severity: 'medium'
      }
    ]
  },
  hombro: {
    key: 'hombro',
    label: 'Hombro',
    icon: '💪',
    tests: [
      { id: 'hawkins_kennedy', name: 'Hawkins-Kennedy', type: 'subacromial_impingement', typeLabel: 'Pinzamiento subacromial' },
      { id: 'sat', name: 'Scapular Assistance Test (SAT)', type: 'scapular_biomechanics', typeLabel: 'Biomecánica escapular' },
      { id: 'gird_deficit', name: 'Déficit GIRD (Cápsula Post.)', type: 'capsular_mobility', typeLabel: 'Movilidad capsular' },
      { id: 'lag_sign_re', name: 'Lag Sign RE / Drop Sign', type: 'rotator_cuff_integrity', typeLabel: 'Integridad manguito' },
      { id: 'apprehension_relocation', name: 'Apprehension & Relocation', type: 'labral_instability', typeLabel: 'Estabilidad / Labrum' },
      { id: 'cross_body', name: 'Cross-Body Adduction', type: 'acromioclavicular', typeLabel: 'Acromioclavicular' }
    ],
    inference_rules: [
      {
        rule_id: 'pinzamiento_secundario_escapular',
        conditions: { hawkins_kennedy: '+', sat: '+' },
        badge: 'Pinzamiento Subacromial Secundario a Disquinesia Escapular',
        evidence: 'Alivio de síntomas mediante facilitación de tilt posterior escapular',
        severity: 'medium'
      },
      {
        rule_id: 'falla_capsular_posterior',
        conditions: { gird_deficit: '+' },
        badge: 'Mecánica Alterada por Retracción Capsular Posteroinferior',
        evidence: 'Pérdida de RI > 15-20° causante de migración superior de cabeza humeral',
        severity: 'medium'
      },
      {
        rule_id: 'lesion_estructural_manguito',
        conditions: { lag_sign_re: '+' },
        badge: 'Compromiso Estructural de Espesor Completo (Infraespinoso/Supraespinoso)',
        evidence: 'Lag Sign positivo (especificidad > 95%)',
        severity: 'high'
      }
    ]
  },
  rodilla_cadera: {
    key: 'rodilla_cadera',
    label: 'Rodilla / Cadera',
    icon: '🦵',
    tests: [
      { id: 'fadir', name: 'FADIR Test (Cadera)', type: 'femoroacetabular_impingement', typeLabel: 'Conflicto femoroacetabular' },
      { id: 'faber', name: 'FABER / Patrick', type: 'hip_sij_differential', typeLabel: 'Diferencial cadera/SIJ' },
      { id: 'single_leg_step_down', name: 'Single-Leg Step Down / Squat', type: 'functional_kinetic_chain', typeLabel: 'Cadena cinética / Valgo' },
      { id: 'mcmurray_thessaly', name: 'McMurray / Thessaly', type: 'meniscal_shear', typeLabel: 'Cizalla meniscal' },
      { id: 'lachman', name: 'Lachman Test', type: 'acl_stability', typeLabel: 'Estabilidad LCA' },
      { id: 'patelar_compression', name: 'Inclinación / Compresión Patelar', type: 'patellofemoral', typeLabel: 'Femoropatelar' }
    ],
    inference_rules: [
      {
        rule_id: 'choque_femoroacetabular',
        conditions: { fadir: '+' },
        badge: 'Sospecha de Conflicto Femoroacetabular (FAI) / Labrum',
        evidence: 'FADIR positivo (Sensibilidad ~96%)',
        severity: 'medium'
      },
      {
        rule_id: 'valgo_dinamico_descendente',
        conditions: { single_leg_step_down: '+', patelar_compression: '+' },
        badge: 'Disfunción Femoropatelar vinculada a Déficit Proximal de Cadera',
        evidence: 'Colapso medial en carga excéntrica + hiperpresión rotuliana',
        severity: 'medium'
      }
    ]
  },
  tobillo_pie: {
    key: 'tobillo_pie',
    label: 'Tobillo / Pie',
    icon: '🦶',
    tests: [
      { id: 'wblt', name: 'Weight-Bearing Lunge (WBLT)', type: 'talocrural_mobility', typeLabel: 'Movilidad talocrural' },
      { id: 'cajon_anterior_tobillo', name: 'Cajón Anterior Tobillo', type: 'ligamentous_atfl', typeLabel: 'Estabilidad LPAA' },
      { id: 'squeeze_kleiger', name: 'Squeeze / Kleiger Test', type: 'syndesmotic', typeLabel: 'Sindesmosis' },
      { id: 'windlass_test', name: 'Windlass Test', type: 'plantar_fascia', typeLabel: 'Fascia plantar' },
      { id: 'navicular_drop', name: 'Navicular Drop Test', type: 'midfoot_pronation', typeLabel: 'Pronación mediopié' }
    ],
    inference_rules: [
      {
        rule_id: 'bloqueo_tobillo_cadena_ascendente',
        conditions: { wblt: '+' },
        badge: 'Déficit de Dorsiflexión Talocrural (Disipador de Carga Ascendente)',
        evidence: 'WBLT < 9 cm limitando mecánica de amortiguación',
        severity: 'medium'
      },
      {
        rule_id: 'falla_fascial_arco',
        conditions: { windlass_test: '+', navicular_drop: '+' },
        badge: 'Incompetencia del Mecanismo de Windlass con Hiperpronación Dinámica',
        evidence: 'Dolor/bloqueo a la extensión del 1MTF con caída de navicular > 10 mm',
        severity: 'high'
      }
    ]
  },
  codo_muneca: {
    key: 'codo_muneca',
    label: 'Codo / Muñeca',
    icon: '🖐️',
    tests: [
      { id: 'cozen_test', name: 'Cozen Test (Extensión resistida)', type: 'tendon_shear', typeLabel: 'Cizalla tendinosa extensor' },
      { id: 'mill_test', name: 'Mill Test (Elongación pasiva)', type: 'tendon_tension', typeLabel: 'Tensión pasiva extensor' },
      { id: 'ulnt2b_radial', name: 'ULNT2b (Nervio Radial)', type: 'neurodynamic', typeLabel: 'Neurodinamia N. Radial' },
      { id: 'durkan_phalen', name: 'Durkan / Phalen Test', type: 'carpal_tunnel', typeLabel: 'Túnel carpiano N. Mediano' },
      { id: 'finkelstein', name: 'Finkelstein / Eichhoff', type: 'tenosynovitis', typeLabel: 'Tenosinovitis De Quervain' },
      { id: 'watson_shift', name: 'Watson Shift Test', type: 'scapholunate_stability', typeLabel: 'Estabilidad escafolunar' }
    ],
    inference_rules: [
      {
        rule_id: 'diferencial_radial_vs_epicondilo',
        conditions: { cozen_test: '+', ulnt2b_radial: '+' },
        badge: 'Epicondilalgia con Componente de Atrapamiento de Nervio Radial / NIP',
        evidence: 'Provocación tendinosa acoplada a mecano-sensibilidad neurodinámica',
        severity: 'high'
      },
      {
        rule_id: 'tunel_carpiano_mecanico',
        conditions: { durkan_phalen: '+' },
        badge: 'Compresión Mecánica del Nervio Mediano en Túnel Carpiano',
        evidence: 'Test de compresión de Durkan/Phalen positivo',
        severity: 'high'
      }
    ]
  },
  atm: {
    key: 'atm',
    label: 'ATM',
    icon: '🦷',
    tests: [
      { id: 'patron_apertura', name: 'Patrón de Apertura (S vs Deflexión)', type: 'kinematic_tracking', typeLabel: 'Tracking cinemático' },
      { id: 'palpacion_polo_lateral', name: 'Palpación Polo Lateral Dinámica', type: 'capsular_pain', typeLabel: 'Dolor capsular' },
      { id: 'bite_test', name: 'Bite Test Bilateral / Diferencial', type: 'load_compression', typeLabel: 'Compresión de carga' },
      { id: 'end_feel_apertura', name: 'End-Feel de Apertura Forzada', type: 'articular_restriction', typeLabel: 'Restricción articular' }
    ],
    inference_rules: [
      {
        rule_id: 'desplazamiento_discal_reduccion',
        conditions: { patron_apertura: '+', palpacion_polo_lateral: '+' },
        badge: 'Desplazamiento Discal Anterior con Reducción',
        evidence: "Desviación corregida en 'S' acompañada de clic articular reproducible",
        severity: 'medium'
      },
      {
        rule_id: 'origen_muscular_vs_articular_atm',
        conditions: { bite_test: '+' },
        badge: 'Sobrecarga Miofascial Masticatoria (Músculo Pterigoideo/Masetero)',
        evidence: 'Dolor ipsilateral a la mordida unilateral en el Bite Test',
        severity: 'low' as const
      }
    ]
  }
};

export interface ActiveInferenceRule extends TMOInferenceRule {
  segmentKey: string;
  segmentLabel: string;
}

/**
 * Normaliza una clave de test para comparación (permite buscar por ID o por Nombre)
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Evalúa las reglas de inferencia clínica para los tests evaluados.
 * Si se pasa `segmentoKey`, prioriza ese segmento o evalúa todos los segmentos si no se especifica.
 */
export function evaluarReglasInferencia(
  pruebas: Record<string, { result: TMOTestResult; note?: string }>,
  segmentoKey?: string
): ActiveInferenceRule[] {
  const activas: ActiveInferenceRule[] = [];

  // Crear mapa normalizado de resultados para coincidencia robusta
  const normalizedMap: Record<string, TMOTestResult> = {};
  for (const [k, v] of Object.entries(pruebas)) {
    if (!v?.result || v.result === 'NE') continue;
    normalizedMap[k] = v.result;
    normalizedMap[normalizeKey(k)] = v.result;
  }

  const segmentosAExaminar = segmentoKey && TMO_SEGMENTS[segmentoKey]
    ? [TMO_SEGMENTS[segmentoKey]]
    : Object.values(TMO_SEGMENTS);

  for (const seg of segmentosAExaminar) {
    for (const rule of seg.inference_rules) {
      let cumple = true;

      for (const [testId, requiredResult] of Object.entries(rule.conditions)) {
        // Encontrar el test en la definición para obtener su nombre alternativo
        const testDef = seg.tests.find((t) => t.id === testId);
        const actualResult =
          normalizedMap[testId] ??
          normalizedMap[normalizeKey(testId)] ??
          (testDef ? normalizedMap[normalizeKey(testDef.name)] : undefined);

        if (actualResult !== requiredResult) {
          cumple = false;
          break;
        }
      }

      if (cumple) {
        activas.push({
          ...rule,
          segmentKey: seg.key,
          segmentLabel: seg.label
        });
      }
    }
  }

  return activas;
}

/**
 * Retorna los estilos Tailwind según la severidad del badge clínico
 */
export function getSeverityBadgeStyle(severity: 'info' | 'medium' | 'high' | 'critical' | 'low') {
  switch (severity) {
    case 'critical':
      return {
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300',
        icon: '🚨',
        chipClass: 'bg-rose-600 text-white',
        borderClass: 'border-l-4 border-l-rose-500'
      };
    case 'high':
      return {
        badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
        icon: '🎯',
        chipClass: 'bg-purple-700 text-white',
        borderClass: 'border-l-4 border-l-purple-600'
      };
    case 'medium':
      return {
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
        icon: '⚠️',
        chipClass: 'bg-amber-600 text-white',
        borderClass: 'border-l-4 border-l-amber-500'
      };
    case 'info':
      return {
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
        icon: 'ℹ️',
        chipClass: 'bg-sky-600 text-white',
        borderClass: 'border-l-4 border-l-sky-500'
      };
    case 'low':
    default:
      return {
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        icon: '✓',
        chipClass: 'bg-emerald-600 text-white',
        borderClass: 'border-l-4 border-l-emerald-500'
      };
  }
}
