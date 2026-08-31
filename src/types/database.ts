export type EstadoPlan =
  | "Plan Vigente"
  | "Por Renovar (1 restante)"
  | "Plan Finalizado"
  | "Sin Plan Activo";

export type EstadoAtencion =
  | "Asistió"
  | "Atendido"
  | "Inasistencia (Descuenta Sesión)"
  | "No Asistió"
  | "En Sala"
  | "Pendiente"
  | "Cancelado con Aviso"
  | "Cancelado"
  | "Inasistencia Justificada";

export type CategoriaPlan = "General" | "Convenio" | "Promoción" | "Personalizado";

export type TipoPlan = "single_session" | "evaluation" | "plan";

export type PrevisionSalud = "Fonasa" | "Isapre" | "Particular" | "Convenio";

export type EstadoPago = "Pagado" | "Pendiente de Pago" | "Parcial / Cuotas";

export type TipoDescuentoCupon = "monto_fijo" | "porcentaje";

export type CategoriaEgreso =
  | "Insumos Clínicos"
  | "Traslado / Estacionamiento"
  | "Servicios Básicos"
  | "Arriendo"
  | "Marketing / Publicidad"
  | "Insumos Médicos"
  | "Equipamiento"
  | "Marketing"
  | "Otros";

export type MedioPago =
  | "Débito / Transbank"
  | "Transferencia"
  | "Efectivo"
  | "Tarjeta Débito/Crédito"
  | "Convenio"
  | "Cheque";

export interface PlanCatalogo {
  id: string;
  nombre_plan: string;
  categoria: CategoriaPlan;
  tipo?: TipoPlan;
  total_sesiones: number;
  precio_clp: number;
  activo: boolean;
  descripcion?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CuponDescuento {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: TipoDescuentoCupon;
  valor_descuento: number;
  limite_usos: number | null;
  usos_actuales: number;
  activo: boolean;
  fecha_expiracion?: string | null;
  created_at?: string;
}

export interface EgresoCaja {
  id: string;
  concepto: string;
  categoria: CategoriaEgreso;
  monto_clp: number;
  medio_pago: MedioPago;
  fecha: string;
  observacion?: string | null;
  comprobante_ref?: string | null;
  responsable?: string;
  created_at?: string;
}

export interface VistaResumenPaciente {
  id: string;
  codigo_paciente: string;
  nombre_completo: string;
  rut: string;
  telefono: string;
  email: string | null;
  total_sesiones: number;
  sesiones_consumidas: number;
  sesiones_restantes: number;
  inasistencias_acumuladas?: number;
  ultima_atencion: string | null;
  dias_sin_atencion: number | null;
  estado_plan: EstadoPlan;
  fecha_nacimiento?: string | null;
  prevision_salud?: PrevisionSalud | string | null;
  motivo_consulta?: string | null;
  diagnostico_medico?: string | null;
  diagnostico_principal?: string | null;
  antecedentes_medicos?: string | null;
  banderas_rojas?: string | null;
  estado_paciente?: "active" | "discharged" | "inactive" | string;
}

export interface Paciente {
  id: string;
  codigo_paciente: string;
  nombre_completo: string;
  rut: string;
  telefono: string;
  email?: string | null;
  fecha_nacimiento?: string | null;
  prevision_salud?: PrevisionSalud | string | null;
  motivo_consulta?: string | null;
  diagnostico_medico?: string | null;
  diagnostico_principal?: string | null;
  antecedentes_medicos?: string | null;
  banderas_rojas?: string | null;
  estado?: "active" | "discharged" | "inactive" | string;
  created_at?: string;
  updated_at?: string;
}

export interface CompraPlan {
  id: string;
  paciente_id: string;
  catalogo_plan_id?: string | null;
  nombre_plan: string;
  total_sesiones: number;
  precio_base?: number;
  descuento_clp?: number;
  codigo_cupon?: string | null;
  valor_total: number;
  total_final_clp?: number;
  medio_pago?: MedioPago;
  estado_pago?: EstadoPago;
  fecha_compra: string;
  estado: "activo" | "finalizado" | "cancelado";
  notas?: string | null;
  created_at?: string;
}

export interface VentaPlanDetallada extends CompraPlan {
  paciente_nombre: string;
  paciente_rut: string;
}

export interface ResumenFinanciero {
  ingresosMesCLP: number;
  ticketPromedioCLP: number;
  egresosMesCLP: number;
  flujoNetoCLP: number;
  totalVentasMes: number;
  totalEgresosMes: number;
  cuentasPorCobrarCLP?: number;
}

export interface CitaAtencion {
  id: string;
  paciente_id: string;
  compra_plan_id?: string | null;
  fecha: string;
  hora: string;
  profesional: string;
  estado: EstadoAtencion;
  notas?: string | null;
  motivo_consulta?: string | null;
  google_event_id?: string | null;
  pacientes?: Paciente;
  created_at?: string;
}

export interface EvolucionSOAP {
  id?: string;
  paciente_id: string;
  cita_id?: string | null;
  fecha: string;
  profesional?: string;

  // S - Subjetivo mapping
  s_subjetivo?: string | null;
  subjetivo?: string | null;
  s?: string | null;

  // O - Objetivo mapping
  o_objetivo?: string | null;
  objetivo?: string | null;
  o?: string | null;

  // A - Análisis mapping
  a_analisis?: string | null;
  analisis?: string | null;
  a?: string | null;

  // P - Plan mapping
  p_plan?: string | null;
  plan?: string | null;
  p?: string | null;

  // Nivel ENA mapping
  nivel_dolor_ena?: number | null;
  ena_dolor?: number | null;
  ena?: number | null;

  // Nuevos campos clínicos avanzados
  mapa_dolor_svg?: string | null;
  hallazgos_frecuentes?: string[] | null;
  cuestionario_funcional?: string | null;
  discapacidad_funcional_pct?: number | null;
  pronostico_sesiones_estimadas?: string | null;

  created_at?: string;
}
