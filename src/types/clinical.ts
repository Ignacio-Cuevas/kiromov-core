export type HealthInsurance = 'Particular' | 'Fonasa' | 'Isapre' | 'Convenio' | string;

export type PatientStatus = 'active' | 'discharged' | 'inactive';

export type PlanType = 'single_session' | 'evaluation' | 'plan';

export type PaymentMethod = 'transfer' | 'card' | 'cash' | 'agreement';

export type PaymentStatus = 'paid' | 'pending' | 'partial';

export type PatientPlanStatus = 'active' | 'completed' | 'cancelled';

export interface Patient {
  id: string;
  created_at?: string;
  updated_at?: string;
  full_name: string;
  rut: string;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  health_insurance?: HealthInsurance | null;
  medical_notes?: string | null;
  status?: PatientStatus;

  // Campos calculados y adicionales
  codigo_paciente?: string;
  nombre_completo?: string; // alias compatible
  total_sessions?: number;
  used_sessions?: number;
  remaining_sessions?: number;
  last_attention_date?: string | null;
}

export interface Plan {
  id: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  type: PlanType;
  category?: string;
  sessions_count: number;
  price_clp: number;
  description?: string | null;
  is_active: boolean;

  // alias compatible
  nombre_plan?: string;
  categoria?: string;
  total_sesiones?: number;
  precio_clp?: number;
  activo?: boolean;
}

export interface Sale {
  id: string;
  created_at?: string;
  patient_id: string;
  plan_id?: string | null;
  concept: string;
  sessions_quantity: number;
  total_amount_clp: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string | null;

  // Relaciones
  patients?: Patient;
  plans?: Plan;
  patient_name?: string;
  patient_rut?: string;
}

export interface PatientPlan {
  id: string;
  created_at?: string;
  patient_id: string;
  sale_id?: string | null;
  plan_name: string;
  total_sessions: number;
  used_sessions: number;
  status: PatientPlanStatus;
}
