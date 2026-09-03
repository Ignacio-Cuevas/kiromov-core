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

export const evaluarRiesgoDesercion = (p: any): AlertaDesercion => {
  const usadas = Number(p.sesiones_usadas) || 0;
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
  const usadas = Number(p.sesiones_usadas) || 0;
  const dolor = Number(p.ultimo_dolor_ena);
  // Paciente con 3 o más sesiones cuyo dolor se mantiene en ENA >= 6
  return usadas >= 3 && dolor >= 6;
};
