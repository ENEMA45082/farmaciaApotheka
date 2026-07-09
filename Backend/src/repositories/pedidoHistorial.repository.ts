import { supabase } from '../config/supabase';
import type { EstadoPedido } from '../config/estadosPedido';

export async function registrar(entry: {
  pedido_id: string;
  estado_anterior: EstadoPedido;
  estado_nuevo: EstadoPedido;
  motivo: string | null;
  changed_by: string;
}): Promise<void> {
  await supabase.from('pedido_historial_estados').insert({
    pedido_id:       entry.pedido_id,
    estado_anterior: entry.estado_anterior,
    estado_nuevo:    entry.estado_nuevo,
    motivo:          entry.motivo,
    changed_by:      entry.changed_by,
  });
}
