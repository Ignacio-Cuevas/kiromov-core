import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha'); // 'YYYY-MM-DD'
    if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });

    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Error de conexión con la base de datos' }, { status: 500 });

    // 1. Horarios base de atención en box (ej. Lunes a Viernes 10:00 a 20:00, Sábados 10:00 a 14:00)
    const diaSemana = new Date(fecha + 'T12:00:00').getDay(); // 0: Dom, 6: Sáb
    if (diaSemana === 0) return NextResponse.json({ slots: [] }); // Cerrado domingo

    // Bloques estándar de inicio de atención
    const slotsBase = diaSemana === 6 
      ? ['10:00', '11:00', '12:00', '13:00']
      : ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];

    // 2. Consultar citas ocupadas en Supabase
    const { data: citasOcupadas, error } = await supabase
      .from('citas_atenciones')
      .select('hora')
      .eq('fecha', fecha)
      .not('estado', 'in', '("cancelada","no_asistio")');

    if (error) {
      console.error('Error consultando citas ocupadas:', error);
    }

    const horasOcupadas = (citasOcupadas || []).map((c: any) => c.hora.slice(0, 5));

    // Verificar bloqueos clínicos si existen
    const horasBloqueadas: string[] = [];
    try {
      const { data: bloqueos } = await supabase
        .from('bloqueos_agenda')
        .select('*')
        .lte('fecha_inicio', fecha)
        .gte('fecha_fin', fecha);

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

    // Si la fecha es hoy en horario de Chile, descartar horas pasadas
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
    const [d, m, y] = partes[0].split('-');
    const hoyChile = `${y}-${m}-${d}`;
    const horaActual = partes[1] || '00:00';

    // 3. Filtrar slots libres
    const slotsLibres = slotsBase.filter((slot) => {
      if (horasOcupadas.includes(slot) || horasBloqueadas.includes(slot)) return false;
      if (fecha === hoyChile && slot <= horaActual) return false;
      return true;
    });

    return NextResponse.json({ slots: slotsLibres });
  } catch (error: any) {
    console.error('Error en /api/public/slots:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
