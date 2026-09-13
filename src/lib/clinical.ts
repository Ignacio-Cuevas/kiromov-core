import { VistaResumenPaciente, Paciente } from '@/types/database';

export interface AlertaDesercion {
  nivel: 1 | 2 | 3 | null;
  etiqueta: string;
  badgeClass: string;
  mensajeWhatsApp: string;
}

const formatearTiempoSinAtencion = (dias: number): string => {
  if (!dias || dias >= 999) return 'algunas semanas';
  if (dias < 60) return `${dias} días`;
  const meses = Math.floor(dias / 30);
  return `aproximadamente ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

export const evaluarRiesgoDesercion = (p: Partial<VistaResumenPaciente>): AlertaDesercion => {
  const usadas = Number(p.sesiones_consumidas) || 0;
  const restantes = Number(p.sesiones_restantes) || 0;
  const dias = Number(p.dias_sin_atencion) || 0;
  const nombre = p.nombre_completo?.split(' ')[0] || 'Estimado/a';
  const tiempoTexto = formatearTiempoSinAtencion(dias);

  // NIVEL 1: Abandono Inicial (< 3 sesiones usadas, TIENE sesiones restantes y lleva > 21 días)
  if (restantes > 0 && usadas > 0 && usadas < 3 && dias > 21) {
    return {
      nivel: 1,
      etiqueta: '🔴 Abandono Inicial (>21 días)',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      mensajeWhatsApp: `Hola ${nombre}, te escribimos de Kiromov Centro Clínico. Notamos que llevas ${tiempoTexto} sin tu control kinésico y aún te quedan ${restantes} sesiones en tu plan. Al estar en la fase inicial, interrumpir el tratamiento aumenta el riesgo de recaída del dolor agudo. ¿Te acomoda retomar esta semana para asegurar tu recuperación?`
    };
  }

  // NIVEL 2: Interrupción Intermedia (≥ 3 y < 6 sesiones usadas, TIENE sesiones restantes y lleva > 30 días)
  if (restantes > 0 && usadas >= 3 && usadas < 6 && dias > 30) {
    return {
      nivel: 2,
      etiqueta: '🟠 Interrupción (>30 días)',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      mensajeWhatsApp: `Hola ${nombre}, te saludamos de Kiromov Centro Clínico. Han pasado ${tiempoTexto} desde tu última sesión y tienes ${restantes} sesiones disponibles. Para consolidar la estabilidad y el control motor que logramos en tus primeras sesiones, te recomendamos agendar tu sesión de seguimiento. ¿Coordinamos tu hora?`
    };
  }

  // NIVEL 3: Control Preventivo / Mantenimiento (≥ 6 sesiones usadas, plan finalizado y > 90 días)
  if (restantes === 0 && usadas >= 6 && dias > 90 && dias < 999) {
    return {
      nivel: 3,
      etiqueta: '🟡 Control Preventivo (>90 días)',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      mensajeWhatsApp: `Hola ${nombre}, un gusto saludarte desde Kiromov Centro Clínico. Ya han transcurrido ${tiempoTexto} desde que completaste tu tratamiento. Te sugerimos realizar una sesión de control biomecánico preventivo para evaluar tu estado articular y ajustar tu pauta de ejercicios. ¡Avísanos y coordinamos tu hora!`
    };
  }

  return { nivel: null, etiqueta: '', badgeClass: '', mensajeWhatsApp: '' };
};

export const requiereReevaluacion = (p: any): boolean => {
  const usadas = Number(p.sesiones_usadas || p.sesiones_consumidas) || 0;
  const dolor = Number(p.ultimo_dolor_ena);
  // Paciente con 3 o más sesiones cuyo dolor se mantiene en ENA >= 6
  return usadas >= 3 && dolor >= 6;
};

export const getResumenPlan = (p: any) => {
  const tienePlan = p.estado_plan !== 'sin_plan' && (p.sesiones_totales || 0) > 0;
  const sesionesTotales = Number(p.sesiones_totales) || 0;
  const sesionesUsadas = Number(p.sesiones_usadas || p.sesiones_consumidas) || 0;
  const sesionesRestantes = Math.max(0, sesionesTotales - sesionesUsadas);
  
  let estadoPlanLabel = 'Sin plan';
  if (p.estado_plan === 'vigente') estadoPlanLabel = 'Plan Vigente';
  else if (p.estado_plan === 'por_renovar') estadoPlanLabel = 'Por Renovar';
  else if (p.estado_plan === 'finalizado') estadoPlanLabel = 'Plan Finalizado';

  return {
    tienePlan,
    sesionesTotales,
    sesionesUsadas,
    sesionesRestantes,
    estadoPlanLabel,
    porcentajeUso: sesionesTotales > 0 ? Math.min(100, Math.round((sesionesUsadas / sesionesTotales) * 100)) : 0
  };
};

export const getCitaColorTokens = (estado: string) => {
  const s = estado?.toLowerCase() || '';
  switch (s) {
    case 'confirmada':
      return {
        cardBg: 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 border-l-4 border-l-emerald-500',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        dot: 'bg-emerald-500',
        hora: 'text-emerald-950 font-bold',
        pillMensual: 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
      };
    case 'pendiente':
      return {
        cardBg: 'bg-amber-50/50 border-amber-200 hover:border-amber-300 border-l-4 border-l-amber-500',
        badge: 'bg-amber-100 text-amber-900 border-amber-200',
        dot: 'bg-amber-500',
        hora: 'text-amber-950 font-bold',
        pillMensual: 'bg-amber-100/90 text-amber-900 border border-amber-300'
      };
    case 'asistio':
    case 'asistió':
    case 'atendido':
    case 'en_sala':
      return {
        cardBg: 'bg-slate-50/80 border-slate-200 hover:border-slate-300 border-l-4 border-l-slate-400 opacity-90',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
        hora: 'text-slate-800 font-bold',
        pillMensual: 'bg-slate-100 text-slate-700 border border-slate-300'
      };
    case 'cancelada':
    case 'no_asistio':
      return {
        cardBg: 'bg-rose-50/50 border-rose-200 hover:border-rose-300 border-l-4 border-l-rose-500 opacity-75',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
        hora: 'text-rose-900 line-through',
        pillMensual: 'bg-rose-100 text-rose-800 border border-rose-200 line-through opacity-75'
      };
    default:
      return {
        cardBg: 'bg-white border-slate-200 hover:border-slate-300 border-l-4 border-l-slate-300',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        hora: 'text-slate-900 font-bold',
        pillMensual: 'bg-slate-100 text-slate-700'
      };
  }
};
