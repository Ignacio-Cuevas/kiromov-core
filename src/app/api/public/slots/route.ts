import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha'); // 'YYYY-MM-DD'
    const sede = searchParams.get('sede') || 'chillan';
    if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });

    if (sede === 'concepcion') {
      return NextResponse.json({
        slots: [],
        mensaje: 'Horas en Concepción se agendan de forma personalizada vía WhatsApp con el Klgo. Michael Pinto.'
      });
    }

    // 1. REGLA: Máximo 8 días hacia adelante (evaluado en horario de Chile)
    const ahoraChile = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    const partes = ahoraChile.split(', ');
    const [dHoy, mHoy, yHoy] = partes[0].split('-').map(Number);
    const hoyChile = `${yHoy}-${String(mHoy).padStart(2, '0')}-${String(dHoy).padStart(2, '0')}`;
    const horaActual = partes[1] || '00:00';

    const hoy = new Date(yHoy, mHoy - 1, dHoy, 0, 0, 0, 0);
    const [año, mes, día] = fecha.split('-').map(Number);
    const fechaObj = new Date(año, mes - 1, día, 0, 0, 0, 0);
    const diffDias = Math.round((fechaObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0 || diffDias > 8) {
      return NextResponse.json({ slots: [], mensaje: 'Solo reservas hasta 8 días por adelantado' });
    }

    // 2. TURNOS REALES DE BOX CHILLÁN
    const diaSemana = fechaObj.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
    let slotsBase: string[] = [];

    if (diaSemana === 1 || diaSemana === 3 || diaSemana === 5) {
      // Lunes, Miércoles, Viernes (15:00 a 20:00 hrs)
      slotsBase = ['15:00', '16:00', '17:00', '18:00', '19:00'];
    } else if (diaSemana === 4 || diaSemana === 6) {
      // Jueves y Sábado (10:00 a 15:00 hrs)
      slotsBase = ['10:00', '11:00', '12:00', '13:00', '14:00'];
    } else {
      // Martes y Domingo cerrado
      return NextResponse.json({ slots: [] });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Error de conexión con la base de datos' }, { status: 500 });
    }

    // 3. CONSULTAR CITAS OCUPADAS EN SUPABASE
    let queryCitas = supabase
      .from('citas_atenciones')
      .select('hora')
      .eq('fecha', fecha)
      .not('estado', 'in', '("cancelada","no_asistio")');

    if (sede === 'chillan') {
      queryCitas = queryCitas.or('sede.eq.chillan,sede.is.null');
    } else {
      queryCitas = queryCitas.eq('sede', sede);
    }

    const { data: citasOcupadas, error: errCitas } = await queryCitas;

    if (errCitas) {
      console.error('Error consultando citas ocupadas:', errCitas);
    }

    const horasOcupadas = (citasOcupadas || []).map((c: any) => c.hora.slice(0, 5));

    // Verificar bloqueos clínicos si existen
    const horasBloqueadas: string[] = [];
    try {
      let queryBloqueos = supabase
        .from('bloqueos_agenda')
        .select('*')
        .lte('fecha_inicio', fecha)
        .gte('fecha_fin', fecha);

      if (sede === 'chillan') {
        queryBloqueos = queryBloqueos.or('sede.eq.chillan,sede.is.null');
      } else {
        queryBloqueos = queryBloqueos.eq('sede', sede);
      }

      const { data: bloqueos } = await queryBloqueos;

      if (bloqueos && bloqueos.length > 0) {
        for (const b of bloqueos) {
          if (b.dia_completo) {
            return NextResponse.json({ slots: [] });
          }
          for (const slot of slotsBase) {
            if (slot >= (b.hora_inicio || '00:00') && slot < (b.hora_fin || '23:59')) {
              horasBloqueadas.push(slot);
            }
          }
        }
      }
    } catch {
      // Ignorar fallo de bloqueos opcionales
    }

    // Filtrar todos los slots efectivamente libres (excluyendo horas pasadas si es hoy)
    const slotsLibres = slotsBase.filter((slot) => {
      if (horasOcupadas.includes(slot) || horasBloqueadas.includes(slot)) return false;
      if (fecha === hoyChile && slot <= horaActual) return false;
      return true;
    });

    if (slotsLibres.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 4. ALGORITMO DE PRIORIZACIÓN DE HUECOS (COMPACTACIÓN DE BOX)
    // Ponderar cada slot libre: mayor puntaje si está adyacente a una cita ocupada o entre dos citas
    const scoredSlots = slotsLibres.map((slot) => {
      let score = 0;
      const index = slotsBase.indexOf(slot);

      // Verificar si el slot anterior o posterior está ocupado
      const prevSlot = slotsBase[index - 1];
      const nextSlot = slotsBase[index + 1];
      const prevOcupado = prevSlot && horasOcupadas.includes(prevSlot);
      const nextOcupado = nextSlot && horasOcupadas.includes(nextSlot);

      if (prevOcupado && nextOcupado) {
        score += 10; // Prioridad máxima: hueco vacío entre dos pacientes
      } else if (prevOcupado || nextOcupado) {
        score += 5;  // Prioridad media: contiguo a un paciente para trabajar de corrido
      } else {
        score += 1;  // Prioridad baja: hora aislada
      }

      return { slot, score };
    });

    // Ordenar por score descendente (los mejores huecos primero)
    scoredSlots.sort((a, b) => b.score - a.score);

    // 5. REGLA DE ESCASEZ: Mostrar MÁXIMO 3 cupos disponibles por día
    const slotsEstrategicos = scoredSlots.slice(0, 3).map((item) => item.slot);

    // Reordenar cronológicamente para el usuario
    slotsEstrategicos.sort();

    return NextResponse.json({
      slots: slotsEstrategicos,
      totalDisponibles: slotsEstrategicos.length,
    });
  } catch (error: any) {
    console.error('Error en /api/public/slots:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
