export interface ResumenPaciente {
  id: string;
  nombre_completo: string;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  prevision: string;
  estado: string;
  plan_id: string | null;
  nombre_plan: string | null;
  sesiones_totales: number;
  sesiones_usadas: number;
  sesiones_restantes: number;
  estado_plan: 'vigente' | 'por_renovar' | 'finalizado' | 'sin_plan';
  estado_pago: 'pagado' | 'pendiente' | null;
  monto_clp: number | null;
  has_pending_payment?: boolean;
}
