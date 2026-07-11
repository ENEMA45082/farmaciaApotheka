import * as facturasRepo from '../repositories/facturas.repository';
import type { Factura } from '../types';

export interface FacturaConProblema extends Factura {
  problema: 'error' | 'sin_pdf';
}

export async function listarConProblemas(): Promise<FacturaConProblema[]> {
  const [conError, sinPdf] = await Promise.all([
    facturasRepo.encontrarConError(),
    facturasRepo.encontrarEmitidasSinPdf(),
  ]);

  return [
    ...conError.map(f => ({ ...f, problema: 'error' as const })),
    ...sinPdf.map(f => ({ ...f, problema: 'sin_pdf' as const })),
  ];
}
