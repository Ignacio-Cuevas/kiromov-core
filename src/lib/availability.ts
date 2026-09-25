export interface HorarioDiaBox {
  dia_semana: number; // 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 0 = Domingo
  nombre: string;
  activo: boolean;
  manana_inicio: string; // 'HH:mm'
  manana_fin: string;    // 'HH:mm'
  colacion_activa: boolean;
  colacion_inicio: string; // 'HH:mm'
  colacion_fin: string;    // 'HH:mm'
  tarde_inicio: string;  // 'HH:mm'
  tarde_fin: string;     // 'HH:mm'
  duracion_bloque_min: number; // 45 | 60
}

export type SemanaHorariosBox = Record<number, HorarioDiaBox>;

export const DIAS_ORDENADOS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

export const DEFAULT_SEMANA_HORARIOS: SemanaHorariosBox = {
  1: {
    dia_semana: 1,
    nombre: 'Lunes',
    activo: true,
    manana_inicio: '09:00',
    manana_fin: '13:00',
    colacion_activa: true,
    colacion_inicio: '13:00',
    colacion_fin: '14:00',
    tarde_inicio: '14:00',
    tarde_fin: '20:00',
    duracion_bloque_min: 45,
  },
  2: {
    dia_semana: 2,
    nombre: 'Martes',
    activo: false,
    manana_inicio: '09:00',
    manana_fin: '13:00',
    colacion_activa: true,
    colacion_inicio: '13:00',
    colacion_fin: '14:00',
    tarde_inicio: '14:00',
    tarde_fin: '20:00',
    duracion_bloque_min: 45,
  },
  3: {
    dia_semana: 3,
    nombre: 'Miércoles',
    activo: true,
    manana_inicio: '09:00',
    manana_fin: '13:00',
    colacion_activa: true,
    colacion_inicio: '13:00',
    colacion_fin: '14:00',
    tarde_inicio: '14:00',
    tarde_fin: '20:00',
    duracion_bloque_min: 45,
  },
  4: {
    dia_semana: 4,
    nombre: 'Jueves',
    activo: true,
    manana_inicio: '10:00',
    manana_fin: '14:00',
    colacion_activa: false,
    colacion_inicio: '14:00',
    colacion_fin: '15:00',
    tarde_inicio: '15:00',
    tarde_fin: '19:00',
    duracion_bloque_min: 45,
  },
  5: {
    dia_semana: 5,
    nombre: 'Viernes',
    activo: true,
    manana_inicio: '09:00',
    manana_fin: '13:00',
    colacion_activa: true,
    colacion_inicio: '13:00',
    colacion_fin: '14:00',
    tarde_inicio: '14:00',
    tarde_fin: '20:00',
    duracion_bloque_min: 45,
  },
  6: {
    dia_semana: 6,
    nombre: 'Sábado',
    activo: true,
    manana_inicio: '10:00',
    manana_fin: '14:00',
    colacion_activa: false,
    colacion_inicio: '14:00',
    colacion_fin: '15:00',
    tarde_inicio: '14:00',
    tarde_fin: '14:00',
    duracion_bloque_min: 45,
  },
  0: {
    dia_semana: 0,
    nombre: 'Domingo',
    activo: false,
    manana_inicio: '10:00',
    manana_fin: '14:00',
    colacion_activa: false,
    colacion_inicio: '14:00',
    colacion_fin: '15:00',
    tarde_inicio: '14:00',
    tarde_fin: '14:00',
    duracion_bloque_min: 45,
  },
};

/**
 * Determina si una hora específica (HH:mm) cae dentro del horario de atención habilitado de un día.
 */
export function isSlotInWorkingHours(
  diaSemana: number,
  timeStr: string,
  semana: SemanaHorariosBox
): boolean {
  const dia = semana[diaSemana];
  if (!dia || !dia.activo) return false;

  const t = timeStr.slice(0, 5);

  // Rango Mañana
  const inManana = t >= dia.manana_inicio && t < dia.manana_fin;

  // Pausa de Colación (si está activa)
  if (dia.colacion_activa && t >= dia.colacion_inicio && t < dia.colacion_fin) {
    return false;
  }

  // Rango Tarde (si tiene hora fin mayor que inicio)
  const hasTarde = dia.tarde_fin > dia.tarde_inicio;
  const inTarde = hasTarde && t >= dia.tarde_inicio && t < dia.tarde_fin;

  return inManana || inTarde;
}

/**
 * Obtiene la hora de apertura más temprana y de cierre más tardía en la semana
 */
export function getExtremeHours(semana: SemanaHorariosBox): { apertura: string; cierre: string } {
  let minH = '08:00';
  let maxH = '20:30';

  const activeDays = Object.values(semana).filter((d) => d.activo);
  if (activeDays.length > 0) {
    const starts = activeDays.map((d) => d.manana_inicio).sort();
    const ends = activeDays
      .map((d) => (d.tarde_fin > d.tarde_inicio ? d.tarde_fin : d.manana_fin))
      .sort();

    if (starts[0] && starts[0] < minH) minH = starts[0];
    if (ends[ends.length - 1] && ends[ends.length - 1] > maxH) maxH = ends[ends.length - 1];
  }

  return { apertura: minH, cierre: maxH };
}
