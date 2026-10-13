/**
 * Utilidades para generación de enlaces y plantillas de WhatsApp de KIROMOV Centro Clínico
 */

export interface DatosCitaWhatsApp {
  paciente_nombre: string;
  paciente_telefono?: string | null;
  fecha: string; // 'YYYY-MM-DD' o ISO string
  hora: string;  // 'HH:mm:ss' o 'HH:mm'
}

/**
 * Genera el enlace de WhatsApp oficial de KIROMOV para confirmación de citas,
 * incluyendo enlace de Google Calendar con recordatorio y recomendación de vestimenta clínica.
 */
export function generarEnlaceWhatsAppConfirmacion(cita: DatosCitaWhatsApp): string {
  // 1. Normalizar primer nombre en formato Capitalizado (ej: "Paula" en vez de "PAULA")
  const primerNombreRaw = (cita.paciente_nombre || '').trim().split(' ')[0] || 'Estimado/a';
  const primerNombre = primerNombreRaw.charAt(0).toUpperCase() + primerNombreRaw.slice(1).toLowerCase();

  // 2. Formatear fecha legible en español (ej. Miércoles 14 de Octubre)
  const fechaSoloFecha = (cita.fecha || '').split('T')[0];
  const partesFecha = fechaSoloFecha.split('-').map(Number);
  const año = partesFecha[0] || new Date().getFullYear();
  const mes = partesFecha[1] || (new Date().getMonth() + 1);
  const día = partesFecha[2] || new Date().getDate();

  const fechaObj = new Date(año, mes - 1, día);
  const fechaLegible = fechaObj.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const fechaCapitalizada = fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1);
  const horaCorta = (cita.hora || '09:00').slice(0, 5);

  // 3. Generar enlace universal de Google Calendar para el celular del paciente
  const horaInicioClean = (cita.hora || '09:00').replace(/:/g, '').slice(0, 4).padEnd(4, '0');
  const fechaClean = fechaSoloFecha.replace(/-/g, '');
  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Sesión Kinesiología TMO - Kiromov')}&dates=${fechaClean}T${horaInicioClean}00/${fechaClean}T${horaInicioClean}00&details=${encodeURIComponent('Atención kinésica con Klgo. Ignacio Cuevas Silva.\nLlegar con 5 min de anticipación.')}&location=${encodeURIComponent('Bulnes 470, Of. 75, Chillán')}`;

  // 4. Mensaje formateado con jerarquía y la frase clínica solicitada
  const mensaje = `¡Hola ${primerNombre}! 👋 Te escribe Ignacio de *KIROMOV Centro Clínico*.

Te contacto para confirmar tu próxima sesión:

🗓️ *Fecha:* ${fechaCapitalizada}
⏰ *Hora:* ${horaCorta} hrs
📍 *Lugar:* Bulnes 470, Of. 75 (Piso 7, Edificio Aranjuez), Chillán

👟 *Recomendación:* Recuerda asistir con ropa cómoda para trabajar sin restricciones.

👉 Por favor, respóndeme con un *"Confirmado"* o un pulgar arriba 👍 para reservar tu box.

📅 *Guarda la cita en tu celular con recordatorio:*
${gCalUrl}`;

  // 5. Normalizar teléfono chileno (+569...)
  let tel = (cita.paciente_telefono || '').replace(/\D/g, '');
  if (tel.length === 8) tel = '9' + tel;
  if (tel.length === 9) tel = '56' + tel;

  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Enlace directo genérico de contacto por WhatsApp
 */
export function getWhatsAppUrl(phone: string, patientName?: string): string {
  if (!phone) return '#';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 8) cleaned = '9' + cleaned;
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    cleaned = '56' + cleaned;
  }
  const text = encodeURIComponent(
    `Hola ${patientName ? patientName.split(' ')[0] : ''}, te escribimos desde KIROMOV Centro Clínico respecto a tus sesiones de kinesiología.`
  );
  return `https://wa.me/${cleaned}?text=${text}`;
}
