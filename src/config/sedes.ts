export type SedeId = 'chillan' | 'concepcion';

export interface SedeConfig {
  id: SedeId;
  nombre: string;
  ciudad: string;
  direccion: string;
  profesionalNombre: string;
  profesionalTitulo: string;
  registroSis: string;
  email: string;
  telefono: string;
  whatsappNumero: string;
  calendarId: string;
  agendaOnlineActiva: boolean;
  mensajeAgendaPausada?: {
    titulo: string;
    bajada: string;
    mensajeWhatsapp: string;
  };
}

export const SEDES_CONFIG: Record<SedeId, SedeConfig> = {
  chillan: {
    id: 'chillan',
    nombre: 'Box Chillán',
    ciudad: 'Chillán',
    direccion: 'Bulnes 470, Of. 75 (7° piso), Chillán',
    profesionalNombre: 'Klgo. Ignacio Cuevas Silva',
    profesionalTitulo: 'Director Clínico · Especialista en TMO',
    registroSis: '396889',
    email: 'ignacio@kiromov.cl',
    telefono: '+56 9 3949 9906',
    whatsappNumero: '56939499906',
    calendarId: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID_CHILLAN || 'ignacio@kiromov.cl',
    agendaOnlineActiva: true,
  },
  concepcion: {
    id: 'concepcion',
    nombre: 'Sede Concepción',
    ciudad: 'Concepción',
    direccion: 'Concepción (Apertura en coordinación)',
    profesionalNombre: 'Klgo. Michael Pinto M.',
    profesionalTitulo: 'Director Clínico · Kinesiólogo',
    registroSis: '404500',
    email: 'michael@kiromov.cl',
    telefono: '+56 9 9091 5094',
    whatsappNumero: '56990915094',
    calendarId: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID_CONCEPCION || 'michael@kiromov.cl',
    agendaOnlineActiva: false, // Pausada temporalmente hasta tener box físico
    mensajeAgendaPausada: {
      titulo: 'Atenciones en Concepción en Coordinación Directa',
      bajada: 'Actualmente las horas de evaluación y tratamiento kinesiológico en Concepción se están agendando de forma personalizada directamente con el Klgo. Michael Pinto.',
      mensajeWhatsapp: 'Hola Michael, quisiera consultar por horas y disponibilidad de atención kinesiológica en Concepción.',
    },
  },
};

export function getSedeConfig(sedeId: SedeId | string | null | undefined): SedeConfig {
  if (sedeId === 'concepcion') {
    return SEDES_CONFIG.concepcion;
  }
  return SEDES_CONFIG.chillan;
}
