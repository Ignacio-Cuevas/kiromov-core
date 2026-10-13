/**
 * Utilidades para generación de enlaces y plantillas de WhatsApp de KIROMOV Centro Clínico
 */

// Emojis construidos mediante CodePoints puros (Inmunes a fallos de encoding)
export const EMOJI = {
  wave: String.fromCodePoint(0x1F44B),               // 👋
  calendar: String.fromCodePoint(0x1F5D3) + '\uFE0F', // 🗓️
  clock: String.fromCodePoint(0x23F0),              // ⏰
  pin: String.fromCodePoint(0x1F4CD),                // 📍
  shoe: String.fromCodePoint(0x1F45F),               // 👟
  point: String.fromCodePoint(0x1F449),              // 👉
  thumb: String.fromCodePoint(0x1F44D),              // 👍
  save: String.fromCodePoint(0x1F4C5),               // 📅
};

export function construirMensajeConfirmacionTexto(cita: any): string {
  // Extraer y capitalizar primer nombre
  const nombreCompleto =
    cita?.paciente?.nombre_completo ||
    cita?.pacientes?.nombre_completo ||
    cita?.paciente_nombre ||
    cita?.nombre_paciente ||
    (typeof cita?.paciente === 'string' ? cita.paciente : null) ||
    (typeof cita?.pacientes === 'string' ? cita.pacientes : null) ||
    '';

  const partes = nombreCompleto.trim().split(/\s+/);
  const primerNombreRaw = partes[0] || '';
  const primerNombre = primerNombreRaw
    ? primerNombreRaw.charAt(0).toUpperCase() + primerNombreRaw.slice(1).toLowerCase()
    : 'Estimada/o';

  // Fecha legible en español
  const fechaStr = (cita?.fecha || new Date().toISOString()).split('T')[0];
  const [año, mes, día] = fechaStr.split('-').map(Number);
  const fechaObj = new Date(año, mes - 1, día);
  const fechaLegible = fechaObj.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const fechaCapitalizada = fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1);

  // Horas (inicio y +45 min)
  const horaStr = (cita?.hora || '10:00:00').slice(0, 5);
  const [hhRaw, mmRaw] = horaStr.split(':').map(Number);
  const hh = isNaN(hhRaw) ? 10 : hhRaw;
  const mm = isNaN(mmRaw) ? 0 : mmRaw;
  const finMinutosTotal = hh * 60 + mm + 45;
  const finH = String(Math.floor(finMinutosTotal / 60)).padStart(2, '0');
  const finM = String(finMinutosTotal % 60).padStart(2, '0');

  // Enlace universal Google Calendar
  const fechaCompacta = fechaStr.replace(/-/g, '');
  const horaInicioCompacta = `${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const horaFinCompacta = `${finH}${finM}00`;

  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Sesión Kinesiología TMO - Kiromov')}&dates=${fechaCompacta}T${horaInicioCompacta}/${fechaCompacta}T${horaFinCompacta}&details=${encodeURIComponent('Atención kinésica con Klgo. Ignacio Cuevas Silva.\nBulnes 470, Of. 75, Chillán.\nLlegar con 5 min de anticipación y ropa cómoda.')}&location=${encodeURIComponent('Bulnes 470, Of. 75, Chillán')}`;

  return `¡Hola ${primerNombre}! ${EMOJI.wave} Te escribe Ignacio de *KIROMOV Centro Clínico*.

Te contacto para confirmar tu próxima atención:

${EMOJI.calendar} *Fecha:* ${fechaCapitalizada}
${EMOJI.clock} *Hora:* ${horaStr} hrs
${EMOJI.pin} *Lugar:* Bulnes 470, Of. 75 (Piso 7, Edificio Aranjuez), Chillán

${EMOJI.shoe} *Recomendación:* Recuerda asistir con ropa cómoda para trabajar sin restricciones.

${EMOJI.point} Por favor, respóndeme con un *"Confirmado"* o un pulgar arriba ${EMOJI.thumb} para reservar tu box.

${EMOJI.save} *Guarda la cita en tu celular con recordatorio:*
${gCalUrl}`;
}

export function generarEnlaceWhatsAppConfirmacion(cita: any): string {
  const mensaje = construirMensajeConfirmacionTexto(cita);

  const telefonoRaw =
    cita?.paciente?.telefono ||
    cita?.pacientes?.telefono ||
    cita?.paciente_telefono ||
    cita?.telefono ||
    '';

  let tel = String(telefonoRaw).replace(/\D/g, '');
  if (tel.length === 8) tel = '9' + tel;
  if (tel.length === 9) tel = '56' + tel;

  // IMPORTANTE: Usar la URL directa de api.whatsapp.com para evitar el salto 302 de wa.me que corrompe caracteres
  return `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(mensaje)}`;
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
  return `https://api.whatsapp.com/send?phone=${cleaned}&text=${text}`;
}
