/**
 * Utilidades para generación de enlaces y plantillas de WhatsApp de KIROMOV Centro Clínico
 */

export function generarEnlaceWhatsAppConfirmacion(cita: any): string {
  // 1. Extraer nombre del paciente tolerando cualquier estructura del objeto cita
  const nombreCompleto =
    cita?.paciente?.nombre_completo ||
    cita?.pacientes?.nombre_completo ||
    cita?.paciente_nombre ||
    cita?.nombre_paciente ||
    (typeof cita?.paciente === 'string' ? cita.paciente : null) ||
    (typeof cita?.pacientes === 'string' ? cita.pacientes : null) ||
    '';

  // Capitalizar el primer nombre (ej: "Paula" en vez de "PAULA")
  const partesNombre = nombreCompleto.trim().split(/\s+/);
  const primerNombreRaw = partesNombre[0] || '';
  const primerNombre = primerNombreRaw
    ? primerNombreRaw.charAt(0).toUpperCase() + primerNombreRaw.slice(1).toLowerCase()
    : 'Estimada/o';

  // 2. Extraer teléfono
  const telefonoRaw =
    cita?.paciente?.telefono ||
    cita?.pacientes?.telefono ||
    cita?.paciente_telefono ||
    cita?.telefono ||
    '';

  // 3. Formatear fecha en español legible
  const fechaStr = (cita?.fecha || new Date().toISOString()).split('T')[0];
  const [año, mes, día] = fechaStr.split('-').map(Number);
  const fechaObj = new Date(año, mes - 1, día);
  const fechaLegible = fechaObj.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const fechaCapitalizada = fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1);

  // 4. Formatear hora de inicio y término (+45 min)
  const horaStr = (cita?.hora || '10:00:00').slice(0, 5); // "16:00"
  const [hhRaw, mmRaw] = horaStr.split(':').map(Number);
  const hh = isNaN(hhRaw) ? 10 : hhRaw;
  const mm = isNaN(mmRaw) ? 0 : mmRaw;
  const finMinutosTotal = hh * 60 + mm + 45;
  const finH = String(Math.floor(finMinutosTotal / 60)).padStart(2, '0');
  const finM = String(finMinutosTotal % 60).padStart(2, '0');
  const horaFinStr = `${finH}:${finM}`;

  // 5. Construir fechas compactas para el enlace de Google Calendar (YYYYMMDDTHHMMSS)
  const fechaCompacta = fechaStr.replace(/-/g, '');
  const horaInicioCompacta = `${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const horaFinCompacta = `${finH}${finM}00`;

  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Sesión Kinesiología TMO - Kiromov')}&dates=${fechaCompacta}T${horaInicioCompacta}/${fechaCompacta}T${horaFinCompacta}&details=${encodeURIComponent('Atención kinésica con Klgo. Ignacio Cuevas Silva.\nBulnes 470, Of. 75, Chillán.\nLlegar con 5 min de anticipación y ropa cómoda.')}&location=${encodeURIComponent('Bulnes 470, Of. 75, Chillán')}`;

  // 6. Emojis codificados de forma segura mediante secuencias de escape Unicode
  const EMOJI_WAVE = '\u{1F44B}';     // 👋
  const EMOJI_CAL = '\u{1F5D3}\uFE0F'; // 🗓️
  const EMOJI_CLOCK = '\u{23F0}';      // ⏰
  const EMOJI_PIN = '\u{1F4CD}';       // 📍
  const EMOJI_SHOE = '\u{1F45F}';      // 👟
  const EMOJI_POINT = '\u{1F449}';     // 👉
  const EMOJI_THUMB = '\u{1F44D}';     // 👍
  const EMOJI_CAL2 = '\u{1F4C5}';      // 📅

  // 7. Redacción cálida con jerarquía visual y saludo garantizado
  const mensaje = `¡Hola ${primerNombre}! ${EMOJI_WAVE} Te escribe Ignacio de *KIROMOV Centro Clínico*.

Te contacto para confirmar tu próxima atención:

${EMOJI_CAL} *Fecha:* ${fechaCapitalizada}
${EMOJI_CLOCK} *Hora:* ${horaStr} hrs
${EMOJI_PIN} *Lugar:* Bulnes 470, Of. 75 (Piso 7, Edificio Aranjuez), Chillán

${EMOJI_SHOE} *Recomendación:* Recuerda asistir con ropa cómoda para trabajar sin restricciones.

${EMOJI_POINT} Por favor, respóndeme con un *"Confirmado"* o un pulgar arriba ${EMOJI_THUMB} para reservar tu box.

${EMOJI_CAL2} *Guarda la cita en tu celular con recordatorio:*
${gCalUrl}`;

  // 8. Normalizar teléfono chileno (+569...)
  let tel = String(telefonoRaw).replace(/\D/g, '');
  if (tel.length === 8) tel = '9' + tel;
  if (tel.length === 9) tel = '56' + tel;

  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Enlace directo genérico de contacto por WhatsApp
 */
export function getWhatsAppUrl(phone: string, patientName?: string): string {
  if (!phone) return '#';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length === 8) cleaned = '9' + cleaned;
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    cleaned = '56' + cleaned;
  }
  const primerNombreRaw = (patientName || '').trim().split(/\s+/)[0] || '';
  const primerNombre = primerNombreRaw
    ? primerNombreRaw.charAt(0).toUpperCase() + primerNombreRaw.slice(1).toLowerCase()
    : 'Estimada/o';
  const text = encodeURIComponent(
    `Hola ${primerNombre}, te escribimos desde KIROMOV Centro Clínico respecto a tus sesiones de kinesiología.`
  );
  return `https://wa.me/${cleaned}?text=${text}`;
}
