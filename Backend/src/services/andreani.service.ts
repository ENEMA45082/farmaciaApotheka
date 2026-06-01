// Servicio de cotización Andreani
// Modo stub: devuelve precios simulados cuando no hay credenciales configuradas.
// Para activar modo real, cargar en .env:
//   ANDREANI_USUARIO, ANDREANI_PASSWORD, ANDREANI_CODIGO_CLIENTE,
//   ANDREANI_CONTRATO_DOMICILIO, ANDREANI_CONTRATO_SUCURSAL, ANDREANI_SANDBOX=true|false

export interface SucursalAndreani {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
}

export interface ResultadoCotizacion {
  precio: number;
  diasEstimados: string;
}

const MODO_STUB = !process.env.ANDREANI_USUARIO;

export async function cotizarDomicilio(params: {
  codigoPostal: string;
  pesoGramos: number;
  valorDeclarado: number;
}): Promise<ResultadoCotizacion> {
  if (MODO_STUB) {
    return { precio: 3500, diasEstimados: '3 a 5 días hábiles' };
  }

  // TODO: Activar cuando lleguen las credenciales reales
  // const andreani = await getClient();
  // const resultado = await andreani.cotizarEnvioDomicilio({
  //   peso: params.pesoGramos,
  //   codigoPostal: params.codigoPostal,
  //   valorDeclarado: params.valorDeclarado,
  //   volumen: 1000,
  // });
  // return {
  //   precio: resultado.tarifaConIva,
  //   diasEstimados: resultado.plazoEntrega ?? '3 a 5 días hábiles',
  // };
  return { precio: 3500, diasEstimados: '3 a 5 días hábiles' };
}

export async function cotizarSucursal(params: {
  codigoPostal: string;
  pesoGramos: number;
  valorDeclarado: number;
}): Promise<ResultadoCotizacion> {
  if (MODO_STUB) {
    return { precio: 2500, diasEstimados: '2 a 4 días hábiles' };
  }

  // TODO: Activar con credenciales reales
  return { precio: 2500, diasEstimados: '2 a 4 días hábiles' };
}

export async function listarSucursales(codigoPostal: string): Promise<SucursalAndreani[]> {
  if (MODO_STUB) {
    return [
      {
        id: 'SUC-001',
        nombre: 'Andreani Sucursal Centro',
        direccion: 'Av. Corrientes 1234',
        ciudad: `CP ${codigoPostal}`,
      },
      {
        id: 'SUC-002',
        nombre: 'Andreani Sucursal Norte',
        direccion: 'Av. Santa Fe 5678',
        ciudad: `CP ${codigoPostal}`,
      },
      {
        id: 'SUC-003',
        nombre: 'Andreani Sucursal Sur',
        direccion: 'Av. Rivadavia 910',
        ciudad: `CP ${codigoPostal}`,
      },
    ];
  }

  // TODO: Activar con credenciales reales
  // const andreani = await getClient();
  // return andreani.obtenerSucursales({ codigoPostal });
  return [];
}
