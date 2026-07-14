import { afip as afipHomologacion, afipConfigurado as afipHomologacionConfigurado, PUNTO_VENTA_ARCA } from './afip';
import { afipProduccion, afipProduccionConfigurado } from './afipProduccion';
import { PUNTO_VENTA_WEB_PRODUCCION } from '../services/facturacionProduccion.service';

export type AmbienteArca = 'homologacion' | 'produccion';

export interface ClienteArca {
  ambiente: AmbienteArca;
  afip: typeof afipHomologacion;
  configurado: boolean;
  puntoVenta: number;
  cuit: string | undefined;
}

/**
 * Único punto que decide homologación vs producción para el flujo REAL de
 * pedidos (`facturacionPedidos.service.ts`). Los helpers de testing manual de
 * `facturacion.service.ts` y `facturacionProduccion.service.ts` NO usan esto:
 * siguen fijos a su cliente de siempre, a propósito.
 */
export function obtenerClienteArca(): ClienteArca {
  if (process.env.ARCA_ENVIRONMENT === 'produccion') {
    return {
      ambiente: 'produccion',
      afip: afipProduccion,
      configurado: afipProduccionConfigurado,
      puntoVenta: PUNTO_VENTA_WEB_PRODUCCION,
      cuit: process.env.ARCA_PROD_CUIT,
    };
  }

  return {
    ambiente: 'homologacion',
    afip: afipHomologacion,
    configurado: afipHomologacionConfigurado,
    puntoVenta: PUNTO_VENTA_ARCA,
    cuit: process.env.ARCA_CUIT,
  };
}
