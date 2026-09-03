export interface AlertaDesercion {
  nivel: 1 | 2 | 3 | null;
  etiqueta: string;
  badgeClass: string;
  mensajeWhatsApp: string;
}

export const evaluarRiesgoDesercion = (p: any): AlertaDesercion => {
  const usadas = Number(p.sesiones_usadas) || 0;
  const dias = Number(p.dias_sin_atencion) || 0;
  const nombre = p.nombre_completo?.split(' ')[0] || 'Estimado/a';

  // Nivel 1: < 3 sesiones y > 21 días sin cita (Riesgo Abandono Agudo)
  if (usadas > 0 && usadas < 3 && dias > 21) {
    return {
      nivel: 1,
      etiqueta: '🔴 Abandono Inicial (>21 días)',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      mensajeWhatsApp: `Hola ${nombre}, te escribimos de Kiromov Centro Clínico. Notamos que llevas ${dias} días sin tu control kinésico. Al estar en la fase inicial de tu tratamiento, interrumpir las sesiones aumenta el riesgo de recaída del dolor agudo. ¿Te acomoda retomar esta semana para asegurar tu recuperación?`
    };
  }

  // Nivel 2: ≥ 3 sesiones y < 6 sesiones y > 30 días sin cita (Deserción Intermedia)
  if (usadas >= 3 && usadas < 6 && dias > 30) {
    return {
      nivel: 2,
      etiqueta: '🟠 Interrupción (>30 días)',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      mensajeWhatsApp: `Hola ${nombre}, te saludamos de Kiromov Centro Clínico. Han pasado ${dias} días desde tu última sesión. Para consolidar la estabilidad y control motor que logramos en tus primeras sesiones, te recomendamos realizar tu sesión de seguimiento. ¿Coordinamos tu hora?`
    };
  }

  // Nivel 3: ≥ 6 sesiones y > 90 días sin cita (Control Preventivo / Mantenimiento)
  if (usadas >= 6 && dias > 90) {
    return {
      nivel: 3,
      etiqueta: '🟡 Control Preventivo (>90 días)',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      mensajeWhatsApp: `Hola ${nombre}, un gusto saludarte desde Kiromov Centro Clínico. Ya han transcurrido 3 meses desde tu último ciclo de tratamiento. Te sugerimos agendar una sesión de control biomecánico preventivo para evaluar tu estado articular y ajustar tu pauta de ejercicios. ¡Avísanos y coordinamos!`
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
