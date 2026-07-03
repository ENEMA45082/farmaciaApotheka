import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';

export async function obtenerEstadisticas() {
  const { data, error } = await supabase.rpc('obtener_estadisticas_inventario');

  if (error) throw new AppError('Error al obtener estadísticas', 500);

  const raw = data as {
    resumen:           Record<string, number>;
    porCategoria:      { nombre: string; totalProductos: number; totalStock: number; valorInventario: number }[];
    distribucionPrecios: { rango: string; cantidad: number }[];
    ofertaVsNormal:    { enOferta: number; normal: number };
    descuentoPromedio: number;
    vencimientosPorMes: { mes: string; cantidad: number }[];
  };

  // La RPC retorna mes en formato YYYY-MM — convertir a "jun. 2026" (es-AR)
  const vencimientosPorMes = (raw.vencimientosPorMes ?? []).map(v => {
    const [year, month] = v.mes.split('-').map(Number);
    const fecha = new Date(year, month - 1, 1);
    return {
      mes:      fecha.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }),
      cantidad: v.cantidad,
    };
  });

  return {
    resumen:             raw.resumen,
    porCategoria:        raw.porCategoria        ?? [],
    distribucionPrecios: raw.distribucionPrecios  ?? [],
    vencimientosPorMes,
    ofertaVsNormal:      raw.ofertaVsNormal,
    descuentoPromedio:   raw.descuentoPromedio,
  };
}
