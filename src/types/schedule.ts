import { z } from 'zod';
import { validateRut } from '@/lib/utils';

// Esquema Zod con validación contextual (superRefine) para soporte óptimo de React Hook Form
export const scheduleAppointmentSchema = z.object({
  isNewPatient: z.boolean(),
  // Campos de Paciente Existente
  pacienteId: z.string().optional(),
  // Campos de Paciente Nuevo ("Quick Create")
  nombre_completo: z.string().optional(),
  sin_rut: z.boolean(),
  rut: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  // Campos Comunes
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato AAAA-MM-DD)'),
  hora: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Hora inválida (formato HH:MM)'),
  duracionMin: z.number(),
  motivo_consulta: z.string().trim().min(2, 'El motivo de consulta es obligatorio'),
  box: z.string(),
  profesional: z.string(),
}).superRefine((data, ctx) => {
  if (data.isNewPatient) {
    if (!data.nombre_completo || data.nombre_completo.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El nombre debe tener al menos 3 caracteres',
        path: ['nombre_completo'],
      });
    }
    if (!data.sin_rut) {
      if (!data.rut || data.rut.trim() === '' || !validateRut(data.rut)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RUT chileno inválido o incompleto (verifica el dígito verificador)',
          path: ['rut'],
        });
      }
    }
    const cleanDigits = (data.telefono || '').replace(/\D/g, '');
    if (!data.telefono || cleanDigits.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El teléfono es obligatorio (mínimo 8 dígitos)',
        path: ['telefono'],
      });
    }
  } else {
    if (!data.pacienteId || data.pacienteId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes seleccionar un paciente existente',
        path: ['pacienteId'],
      });
    }
  }
});

export type ScheduleAppointmentFormValues = z.infer<typeof scheduleAppointmentSchema>;

export interface ScheduleAppointmentResult {
  success: boolean;
  citaId?: string;
  pacienteId?: string;
  error?: string;
}
