import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRut(rut: string): string {
  if (!rut) return "";
  const clean = rut.replace(/[^0-9kK]/g, "");
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1).toUpperCase();
  let num = clean.slice(0, -1);
  num = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${num}-${dv}`;
}

export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== "string") return false;
  const clean = rut.replace(/[^0-9kK]/g, "");
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvNum = 11 - (sum % 11);
  let expectedDv = "";
  if (expectedDvNum === 11) expectedDv = "0";
  else if (expectedDvNum === 10) expectedDv = "K";
  else expectedDv = expectedDvNum.toString();

  return dv === expectedDv;
}

export function getWhatsAppUrl(phone: string, patientName?: string): string {
  if (!phone) return "#";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 9 && cleaned.startsWith("9")) {
    cleaned = "56" + cleaned;
  }
  const text = encodeURIComponent(
    `Hola ${patientName ? patientName.split(" ")[0] : ""}, te escribimos desde KIROMOV Centro Clínico respecto a tus sesiones de kinesiología.`
  );
  return `https://wa.me/${cleaned}?text=${text}`;
}

export function formatDateChile(dateString?: string | null): string {
  if (!dateString) return "Sin registros";
  try {
    const parts = dateString.split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateLongChile(dateString?: string | null): string {
  if (!dateString) return "Sin fecha";
  try {
    const cleanDate = dateString.split("T")[0];
    const [year, month, day] = cleanDate.split("-");
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day.padStart(2, "0")} de ${months[monthIndex]}, ${year}`;
    }
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatCLP(val: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}
