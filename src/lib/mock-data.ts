import {
  VistaResumenPaciente,
  Paciente,
  CompraPlan,
  CitaAtencion,
  EvolucionSOAP,
  PlanCatalogo,
  CuponDescuento,
  EgresoCaja,
} from "@/types/database";

export const initialMockCatalogoPlanes: PlanCatalogo[] = [
  {
    id: "cat-01",
    nombre_plan: "Sesión Individual de Kinesiología",
    categoria: "General",
    total_sesiones: 1,
    precio_clp: 30000,
    activo: true,
    descripcion: "Atención kinésica unitaria con evaluación y tratamiento.",
  },
  {
    id: "cat-02",
    nombre_plan: "Pack Terapéutico (4 Sesiones)",
    categoria: "General",
    total_sesiones: 4,
    precio_clp: 100000,
    activo: true,
    descripcion: "Pack de 4 sesiones continuas para lesiones agudas o subagudas.",
  },
  {
    id: "cat-03",
    nombre_plan: "Plan Recuperación Lumbar (6 Sesiones)",
    categoria: "General",
    total_sesiones: 6,
    precio_clp: 150000,
    activo: true,
    descripcion: "Programa intensivo de estabilización lumbopélvica y columna.",
  },
  {
    id: "cat-04",
    nombre_plan: "Plan Kinesiología Integral (10 Sesiones)",
    categoria: "General",
    total_sesiones: 10,
    precio_clp: 220000,
    activo: true,
    descripcion: "Tratamiento completo con reeducación funcional y reintegro deportivo.",
  },
  {
    id: "cat-05",
    nombre_plan: "Plan Post-Quirúrgico (12 Sesiones)",
    categoria: "General",
    total_sesiones: 12,
    precio_clp: 260000,
    activo: true,
    descripcion: "Rehabilitación postoperatoria (LCA, meniscos, manguito rotador).",
  },
  {
    id: "cat-06",
    nombre_plan: "Convenio - Activa Care (4 Sesiones)",
    categoria: "Convenio",
    total_sesiones: 4,
    precio_clp: 65000,
    activo: true,
    descripcion: "Tarifa preferencial convenio institucional Activa Care.",
  },
  {
    id: "cat-07",
    nombre_plan: "Convenio Isapre Preferencial (6 Sesiones)",
    categoria: "Convenio",
    total_sesiones: 6,
    precio_clp: 135000,
    activo: true,
    descripcion: "Tarifa con reembolso y cobertura preferencial.",
  },
  {
    id: "cat-08",
    nombre_plan: "Convenio Club Deportivo (8 Sesiones)",
    categoria: "Convenio",
    total_sesiones: 8,
    precio_clp: 160000,
    activo: true,
    descripcion: "Atención para deportistas federados y asociados.",
  },
  {
    id: "cat-09",
    nombre_plan: "Promo Evaluación + 3 Sesiones Reinserción",
    categoria: "Promoción",
    total_sesiones: 4,
    precio_clp: 89990,
    activo: true,
    descripcion: "Promoción de bienvenida para nuevos pacientes.",
  },
  {
    id: "cat-10",
    nombre_plan: "Promo Preventiva Columna (2 Sesiones)",
    categoria: "Promoción",
    total_sesiones: 2,
    precio_clp: 49990,
    activo: false,
    descripcion: "Promoción de temporada (inactiva actualmente).",
  },
];

export const initialMockCupones: CuponDescuento[] = [
  {
    id: "cup-01",
    codigo: "BIENVENIDA",
    descripcion: "Descuento de bienvenida para pacientes primerizos",
    tipo: "monto_fijo",
    valor_descuento: 15000,
    limite_usos: 100,
    usos_actuales: 14,
    activo: true,
    fecha_expiracion: "2026-12-31",
  },
  {
    id: "cup-02",
    codigo: "KIRO10",
    descripcion: "10% de descuento en planes de 6 a 12 sesiones",
    tipo: "porcentaje",
    valor_descuento: 10,
    limite_usos: 50,
    usos_actuales: 8,
    activo: true,
    fecha_expiracion: "2026-11-30",
  },
  {
    id: "cup-03",
    codigo: "CONVENIO2026",
    descripcion: "Rebaja especial de $20.000 CLP para convenios",
    tipo: "monto_fijo",
    valor_descuento: 20000,
    limite_usos: 30,
    usos_actuales: 5,
    activo: true,
    fecha_expiracion: "2026-12-31",
  },
  {
    id: "cup-04",
    codigo: "PROMO20",
    descripcion: "20% de descuento campaña de reapertura",
    tipo: "porcentaje",
    valor_descuento: 20,
    limite_usos: 20,
    usos_actuales: 20,
    activo: false,
    fecha_expiracion: "2026-06-30",
  },
];

export const initialMockEgresos: EgresoCaja[] = [
  {
    id: "egr-01",
    concepto: "Insumos - Cintas kinesiológicas y vendaje neuromuscular",
    categoria: "Insumos Clínicos",
    monto_clp: 45000,
    medio_pago: "Transferencia",
    fecha: "2026-08-28",
    comprobante_ref: "FAC-8812",
    observacion: "Pack de 10 rollos Kinesiotape hipoalergénicos.",
    responsable: "Klgo. Ignacio Cuevas Silva",
  },
  {
    id: "egr-02",
    concepto: "Estacionamiento visitas domiciliarias y traslados",
    categoria: "Traslado / Estacionamiento",
    monto_clp: 18000,
    medio_pago: "Débito / Transbank",
    fecha: "2026-08-26",
    comprobante_ref: "BOL-1092",
    observacion: "Estacionamiento centro médico y traslados de urgencia.",
    responsable: "Klgo. Ignacio Cuevas Silva",
  },
  {
    id: "egr-03",
    concepto: "Gasto Eléctrico y Climatización Box Clínico",
    categoria: "Servicios Básicos",
    monto_clp: 62000,
    medio_pago: "Transferencia",
    fecha: "2026-08-20",
    comprobante_ref: "ENEL-9921",
    observacion: "Cuenta de luz y calefacción invierno box 2.",
    responsable: "Administración Kiromov",
  },
  {
    id: "egr-04",
    concepto: "Arriendo mensual box kinésico y sala de rehabilitación",
    categoria: "Arriendo",
    monto_clp: 280000,
    medio_pago: "Transferencia",
    fecha: "2026-08-05",
    comprobante_ref: "CONTRATO-AG-2026",
    observacion: "Arriendo del mes de agosto.",
    responsable: "Administración Kiromov",
  },
  {
    id: "egr-05",
    concepto: "Publicidad en Redes Sociales (Meta Ads)",
    categoria: "Marketing / Publicidad",
    monto_clp: 40000,
    medio_pago: "Débito / Transbank",
    fecha: "2026-08-15",
    comprobante_ref: "INV-META-2026-08",
    observacion: "Campaña rehabilitación de columna y convenios.",
    responsable: "Klgo. Ignacio Cuevas Silva",
  },
  {
    id: "egr-06",
    concepto: "Servicio de Limpieza e Higienización Box Clínico",
    categoria: "Otros",
    monto_clp: 30000,
    medio_pago: "Efectivo",
    fecha: "2026-08-12",
    comprobante_ref: "BOL-332",
    observacion: "Limpieza profunda y sanitización quincenal.",
    responsable: "Administración Kiromov",
  },
];

export const initialMockPacientes: Paciente[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    codigo_paciente: "KIR-1001",
    nombre_completo: "Valentina Andrea Rojas Silva",
    rut: "17.842.934-2",
    telefono: "+56987654321",
    email: "v.rojas@gmail.com",
    fecha_nacimiento: "1991-04-12",
    diagnostico_principal: "Lumbago Mecánico Agudo / Radiculopatía L5",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    codigo_paciente: "KIR-1002",
    nombre_completo: "Matías Eduardo González Bravo",
    rut: "19.324.512-K",
    telefono: "+56976543210",
    email: "matias.gonzalez@empresa.cl",
    fecha_nacimiento: "1996-08-25",
    diagnostico_principal: "Tendinopatía Rotuliana Derecha",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    codigo_paciente: "KIR-1003",
    nombre_completo: "Camila Paz Morales Henríquez",
    rut: "16.512.443-8",
    telefono: "+56965432109",
    email: "camila.morales@hotmail.com",
    fecha_nacimiento: "1987-11-03",
    diagnostico_principal: "Cervicobraquialgia Izquierda",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    codigo_paciente: "KIR-1004",
    nombre_completo: "Rodrigo Andrés Castro Muñoz",
    rut: "15.981.234-5",
    telefono: "+56954321098",
    email: "rcastro.m@gmail.com",
    fecha_nacimiento: "1984-02-18",
    diagnostico_principal: "Esguince de Tobillo Grado II",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    codigo_paciente: "KIR-1005",
    nombre_completo: "Francisca Belén Soto Navarro",
    rut: "18.776.432-1",
    telefono: "+56943210987",
    email: "fran.soto.n@gmail.com",
    fecha_nacimiento: "1994-09-30",
    diagnostico_principal: "Post-operatorio LCA Rodilla Izq.",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    codigo_paciente: "KIR-1006",
    nombre_completo: "Joaquín Ignacio Tapia Vargas",
    rut: "20.123.876-3",
    telefono: "+56932109876",
    email: "joaquin.tapia@outlook.cl",
    fecha_nacimiento: "1999-01-14",
    diagnostico_principal: "Síndrome de Dolor Patelofemoral",
  },
];

export const initialMockPlanes: CompraPlan[] = [
  {
    id: "plan-01",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    catalogo_plan_id: "cat-04",
    nombre_plan: "Plan Kinesiología Integral (10 Sesiones)",
    total_sesiones: 10,
    precio_base: 220000,
    descuento_clp: 0,
    valor_total: 220000,
    total_final_clp: 220000,
    fecha_compra: "2026-08-05",
    estado: "activo",
  },
  {
    id: "plan-02",
    paciente_id: "22222222-2222-2222-2222-222222222222",
    catalogo_plan_id: "cat-02",
    nombre_plan: "Pack Terapéutico (4 Sesiones)",
    total_sesiones: 4,
    precio_base: 100000,
    descuento_clp: 15000,
    codigo_cupon: "BIENVENIDA",
    valor_total: 85000,
    total_final_clp: 85000,
    fecha_compra: "2026-08-18",
    estado: "activo",
  },
  {
    id: "plan-03",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    catalogo_plan_id: "cat-03",
    nombre_plan: "Plan Recuperación Lumbar (6 Sesiones)",
    total_sesiones: 6,
    precio_base: 150000,
    descuento_clp: 0,
    valor_total: 150000,
    total_final_clp: 150000,
    fecha_compra: "2026-07-20",
    estado: "finalizado",
  },
  {
    id: "plan-04",
    paciente_id: "44444444-4444-4444-4444-444444444444",
    catalogo_plan_id: "cat-02",
    nombre_plan: "Plan Kine Rápida (4 Sesiones)",
    total_sesiones: 4,
    precio_base: 100000,
    descuento_clp: 0,
    valor_total: 100000,
    total_final_clp: 100000,
    fecha_compra: "2026-08-15",
    estado: "activo",
  },
  {
    id: "plan-05",
    paciente_id: "55555555-5555-5555-5555-555555555555",
    catalogo_plan_id: "cat-05",
    nombre_plan: "Plan Post-Quirúrgico (12 Sesiones)",
    total_sesiones: 12,
    precio_base: 260000,
    descuento_clp: 26000,
    codigo_cupon: "KIRO10",
    valor_total: 234000,
    total_final_clp: 234000,
    fecha_compra: "2026-08-01",
    estado: "activo",
  },
];

export const initialMockCitas: CitaAtencion[] = [
  {
    id: "cita-101",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-10",
    hora: "10:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Evaluación inicial y pauta antiinflamatoria",
  },
  {
    id: "cita-102",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-14",
    hora: "10:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Terapia manual raquídea y neurodinamia",
  },
  {
    id: "cita-103",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-18",
    hora: "10:30",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Estabilidad lumbopélvica control motor",
  },
  {
    id: "cita-104",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-22",
    hora: "10:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Carga progresiva y ejercicios de bisagra de cadera",
  },
  {
    id: "cita-105",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-26",
    hora: "11:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Buen avance sin irradiación distal",
  },
  {
    id: "cita-106",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-30",
    hora: "09:30",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Atención realizada hoy, gran tolerancia",
  },
  {
    id: "cita-201",
    paciente_id: "22222222-2222-2222-2222-222222222222",
    fecha: "2026-08-20",
    hora: "11:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Evaluación y trabajo isométrico cuadriceps",
  },
  {
    id: "cita-202",
    paciente_id: "22222222-2222-2222-2222-222222222222",
    fecha: "2026-08-24",
    hora: "11:30",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Heavy slow resistance squat y liberación miofascial",
  },
  {
    id: "cita-203",
    paciente_id: "22222222-2222-2222-2222-222222222222",
    fecha: "2026-08-29",
    hora: "16:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Criterios de pliometría controlada. Queda 1 sesión del plan.",
  },
  {
    id: "cita-301",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    fecha: "2026-07-25",
    hora: "15:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Sesión 1",
  },
  {
    id: "cita-302",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    fecha: "2026-08-01",
    hora: "15:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Sesión 2",
  },
  {
    id: "cita-303",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    fecha: "2026-08-08",
    hora: "15:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Sesión 3",
  },
  {
    id: "cita-304",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    fecha: "2026-08-15",
    hora: "15:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Sesión 4",
  },
  {
    id: "cita-305",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    fecha: "2026-08-22",
    hora: "15:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Sesión 5",
  },
  {
    id: "cita-306",
    paciente_id: "33333333-3333-3333-3333-333333333333",
    fecha: "2026-08-28",
    hora: "15:00",
    profesional: "Klgo. Ignacio Cuevas Silva",
    estado: "Asistió",
    notas: "Sesión 6 (Final de plan). Requiere renovación.",
  },
];

export const initialMockEvoluciones: EvolucionSOAP[] = [
  {
    id: "soap-1",
    paciente_id: "11111111-1111-1111-1111-111111111111",
    fecha: "2026-08-30",
    profesional: "Klgo. Ignacio Cuevas Silva",
    s_subjetivo:
      "Paciente refiere disminución del dolor lumbar matutino. No presenta hormigueo en extremidad inferior durante la marcha.",
    subjetivo:
      "Paciente refiere disminución del dolor lumbar matutino. No presenta hormigueo en extremidad inferior durante la marcha.",
    o_objetivo:
      "Rango articular de flexión de tronco aumentado 15°. Lasègue negativo bilateral. Palpación paravertebral L4-L5 sin espasmo severo.",
    objetivo:
      "Rango articular de flexión de tronco aumentado 15°. Lasègue negativo bilateral. Palpación paravertebral L4-L5 sin espasmo severo.",
    nivel_dolor_ena: 2,
    ena_dolor: 2,
    a_analisis:
      "Excelente evolución en control lumbopélvico y desensibilización neural. Cumple hitos de fase 2.",
    analisis:
      "Excelente evolución en control lumbopélvico y desensibilización neural. Cumple hitos de fase 2.",
    p_plan:
      "Aumentar carga en peso muerto con kettlebell (12kg). Mantener pauta de estiramientos en casa 2x día.",
    plan: "Aumentar carga en peso muerto con kettlebell (12kg). Mantener pauta de estiramientos en casa 2x día.",
    created_at: "2026-08-30T09:30:00Z",
  },
  {
    id: "soap-2",
    paciente_id: "22222222-2222-2222-2222-222222222222",
    fecha: "2026-08-29",
    profesional: "Klgo. Ignacio Cuevas Silva",
    s_subjetivo:
      "Refiere molestia focal en polo inferior de rótula tras trote suave de 15 min.",
    subjetivo:
      "Refiere molestia focal en polo inferior de rótula tras trote suave de 15 min.",
    o_objetivo:
      "Tensión en retináculo lateral y vasto externo. Test de declive positivo leve. ENA 4 al salto unipodal.",
    objetivo:
      "Tensión en retináculo lateral y vasto externo. Test de declive positivo leve. ENA 4 al salto unipodal.",
    nivel_dolor_ena: 4,
    ena_dolor: 4,
    a_analisis:
      "Tendinopatía en fase de remodelación. Necesita consolidar fase de fuerza máxima isométrica antes de correr distancias mayores.",
    analisis:
      "Tendinopatía en fase de remodelación. Necesita consolidar fase de fuerza máxima isométrica antes de correr distancias mayores.",
    p_plan:
      "Protocolo HSR 3 series x 45s. Pausa de carrera de impacto por 4 días. Ofrecer renovación de plan.",
    plan: "Protocolo HSR 3 series x 45s. Pausa de carrera de impacto por 4 días. Ofrecer renovación de plan.",
    created_at: "2026-08-29T16:00:00Z",
  },
];

export function computeMockVistaResumen(
  pacientes: Paciente[],
  planes: CompraPlan[],
  citas: CitaAtencion[]
): VistaResumenPaciente[] {
  const today = new Date();

  return pacientes.map((p) => {
    const patientPlans = planes.filter((pl) => pl.paciente_id === p.id);
    const totalSesiones = patientPlans.reduce(
      (sum, pl) => sum + pl.total_sesiones,
      0
    );

    // Citas que descuentan sesión (Atendido / Asistió o Inasistencia sin justificar según política)
    const patientCitasConsumidas = citas.filter(
      (c) =>
        c.paciente_id === p.id &&
        (c.estado === "Asistió" ||
          c.estado === "Atendido" ||
          c.estado === "Inasistencia (Descuenta Sesión)")
    );

    // Conteo de inasistencias acumuladas
    const inasistencias = citas.filter(
      (c) =>
        c.paciente_id === p.id &&
        (c.estado === "Inasistencia (Descuenta Sesión)" ||
          c.estado === "No Asistió")
    ).length;

    const sesionesConsumidas = patientCitasConsumidas.length;
    const sesionesRestantes = Math.max(0, totalSesiones - sesionesConsumidas);

    let ultimaAtencion: string | null = null;
    let diasSinAtencion: number | null = null;

    const patientCitasEfectivas = citas.filter(
      (c) =>
        c.paciente_id === p.id &&
        (c.estado === "Asistió" || c.estado === "Atendido")
    );

    if (patientCitasEfectivas.length > 0) {
      const sorted = [...patientCitasEfectivas].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      ultimaAtencion = sorted[0].fecha;
      const lastDate = new Date(ultimaAtencion);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      diasSinAtencion = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    let estadoPlan: VistaResumenPaciente["estado_plan"] = "Sin Plan Activo";
    if (totalSesiones === 0) {
      estadoPlan = "Sin Plan Activo";
    } else if (sesionesRestantes <= 0) {
      estadoPlan = "Plan Finalizado";
    } else if (sesionesRestantes === 1) {
      estadoPlan = "Por Renovar (1 restante)";
    } else {
      estadoPlan = "Plan Vigente";
    }

    return {
      id: p.id,
      codigo_paciente: p.codigo_paciente,
      nombre_completo: p.nombre_completo,
      rut: p.rut,
      telefono: p.telefono,
      email: p.email || null,
      total_sesiones: totalSesiones,
      sesiones_consumidas: sesionesConsumidas,
      sesiones_restantes: sesionesRestantes,
      inasistencias_acumuladas: inasistencias,
      ultima_atencion: ultimaAtencion,
      dias_sin_atencion: diasSinAtencion,
      estado_plan: estadoPlan,
    };
  });
}
