import { useState, useEffect } from 'react';
import { fetchFacturasConProblemas } from '../api/facturas.api';
import type { FacturaConProblema } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';

function formatFechaPedido(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminFacturasPage() {
  // — Facturas con problemas (admin) —
  const [facturasConProblemas, setFacturasConProblemas] = useState<FacturaConProblema[]>([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);
  const [errorFacturas, setErrorFacturas] = useState<string | null>(null);

  useEffect(() => {
    setCargandoFacturas(true);
    setErrorFacturas(null);
    fetchFacturasConProblemas()
      .then(setFacturasConProblemas)
      .catch(() => setErrorFacturas('No se pudieron cargar las facturas.'))
      .finally(() => setCargandoFacturas(false));
  }, []);

  return (
    <AdminLayout subtitle="Facturas ARCA que fallaron al emitirse">
      <div className="admin-section">
        <div className="admin-table-card">
          <h2>Facturas con problemas ({facturasConProblemas.length})</h2>
          <p style={{ color: '#666', fontSize: 13, marginTop: -8, marginBottom: 12 }}>
            Facturas que fallaron al emitirse ante ARCA, o que se emitieron bien pero el PDF no se generó.
          </p>

          {cargandoFacturas && <p className="admin-loading">Cargando facturas...</p>}
          {errorFacturas && <div className="admin-error">{errorFacturas}</div>}

          {!cargandoFacturas && facturasConProblemas.length === 0 && !errorFacturas && (
            <p className="admin-empty">No hay facturas con problemas pendientes. 🎉</p>
          )}

          {facturasConProblemas.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Problema</th>
                    <th>Detalle</th>
                    <th>Intentos</th>
                    <th>Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasConProblemas.map(f => (
                    <tr key={f.id}>
                      <td>{f.pedido_id}</td>
                      <td>
                        {f.problema === 'error' ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Error al emitir</span>
                        ) : (
                          <span style={{ color: '#b45309', fontWeight: 600 }}>Sin PDF</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 380, whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
                        {f.problema === 'error' ? (f.respuesta_error ?? '—') : 'CAE emitido correctamente, pero el PDF no se generó/subió.'}
                      </td>
                      <td>{f.intentos}</td>
                      <td>{formatFechaPedido(f.actualizado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
