import { useState, useRef } from 'react';
import { previewImportarPrecios, confirmarImportarPrecios } from '../api/productos.api';
import type { PreviewImportarPreciosResponse, ResultadoConfirmarPrecios } from '../api/productos.api';
import { formatPrecio } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';

export function AdminImportarPreciosPage() {
  // — Importar precios CSV —
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvArchivo, setCsvArchivo] = useState<File | null>(null);
  type EstadoImport = 'idle' | 'cargando_preview' | 'preview' | 'confirmando' | 'resultado';
  const [estadoImport, setEstadoImport] = useState<EstadoImport>('idle');
  const [errorImport, setErrorImport] = useState<string | null>(null);
  const [previewImport, setPreviewImport] = useState<PreviewImportarPreciosResponse | null>(null);
  const [resultadoImport, setResultadoImport] = useState<ResultadoConfirmarPrecios | null>(null);
  const [crearSeleccionados, setCrearSeleccionados] = useState<Set<string>>(new Set());

  function resetImport() {
    setCsvArchivo(null);
    setEstadoImport('idle');
    setErrorImport(null);
    setPreviewImport(null);
    setResultadoImport(null);
    setCrearSeleccionados(new Set());
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  async function handleCargarPreview() {
    if (!csvArchivo) return;
    setEstadoImport('cargando_preview');
    setErrorImport(null);
    try {
      const preview = await previewImportarPrecios(csvArchivo);
      setPreviewImport(preview);
      setCrearSeleccionados(new Set(preview.no_encontrados.map(nf => nf.codigo_barras)));
      setEstadoImport('preview');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Error al procesar el archivo.';
      setErrorImport(msg);
      setEstadoImport('idle');
    }
  }

  function toggleCrearSeleccionado(codigoBarras: string) {
    setCrearSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(codigoBarras)) next.delete(codigoBarras);
      else next.add(codigoBarras);
      return next;
    });
  }

  async function handleConfirmar() {
    if (!previewImport) return;
    setEstadoImport('confirmando');
    setErrorImport(null);
    try {
      const items = [
        ...previewImport.actualizaciones.map(a => ({
          codigo_barras: a.codigo_barras,
          precio_nuevo:  a.precio_nuevo,
        })),
        ...previewImport.no_encontrados
          .filter(nf => crearSeleccionados.has(nf.codigo_barras))
          .map(nf => ({
            codigo_barras: nf.codigo_barras,
            precio_nuevo:  nf.precio_csv,
            nombre:        nf.nombre,
          })),
      ];
      const resultado = await confirmarImportarPrecios(items);
      setResultadoImport(resultado);
      setEstadoImport('resultado');
    } catch {
      setErrorImport('Error al confirmar los cambios. Intentá de nuevo.');
      setEstadoImport('preview');
    }
  }

  return (
    <AdminLayout subtitle="Actualización masiva de precios por CSV">
      <div className="admin-section">
        <div className="admin-form-card">
          <h2>Importar precios desde CSV</h2>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Cargá un archivo CSV (separado por punto y coma o coma). Se usará la columna
            {' '}<strong>CodBarraPrinc</strong> para identificar productos, <strong>Precio</strong> para
            el nuevo precio de lista, y <strong>Producto</strong> como nombre para los productos que no existan todavía.
          </p>

          {errorImport && <div className="admin-error">{errorImport}</div>}

          {(estadoImport === 'idle' || estadoImport === 'cargando_preview') && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={csvInputRef}
                id="csv-file-input"
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={e => setCsvArchivo(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="csv-file-input" className="btn btn--ghost" style={{ cursor: 'pointer' }}>
                Elegir archivo
              </label>
              <span style={{ color: csvArchivo ? '#111' : '#999', fontSize: 14 }}>
                {csvArchivo ? csvArchivo.name : 'Ningún archivo seleccionado'}
              </span>
              <button
                className="btn btn--primary"
                onClick={handleCargarPreview}
                disabled={!csvArchivo || estadoImport === 'cargando_preview'}
              >
                {estadoImport === 'cargando_preview' ? 'Procesando…' : 'Vista previa'}
              </button>
            </div>
          )}

          {(estadoImport === 'preview' || estadoImport === 'confirmando') && previewImport && (
            <>
              {previewImport.no_encontrados.length > 0 && (
                <div style={{ background: '#fef9c3', border: '1px solid #ca8a04', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
                  <strong>{previewImport.no_encontrados.length} código(s) no encontrado(s) en la base de datos</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#713f12' }}>
                    Los que dejes tildados se van a crear como productos nuevos (sin categoría ni stock) con el nombre y precio del CSV.
                  </p>
                  <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, fontSize: 13 }}>
                    {previewImport.no_encontrados.map(nf => (
                      <li key={nf.codigo_barras} style={{ padding: '3px 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={crearSeleccionados.has(nf.codigo_barras)}
                            onChange={() => toggleCrearSeleccionado(nf.codigo_barras)}
                          />
                          <code>{nf.codigo_barras}</code>
                          <span>{nf.nombre || '(sin nombre en el CSV)'}</span>
                          <span>— ${formatPrecio(nf.precio_csv)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="admin-table-wrapper" style={{ marginBottom: 16 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Código de barras</th>
                      <th>Producto</th>
                      <th>Precio actual</th>
                      <th>Precio nuevo</th>
                      <th>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewImport.actualizaciones.map(fila => {
                      const diff = fila.precio_nuevo - fila.precio_actual;
                      const color = diff > 0 ? '#166534' : diff < 0 ? '#991b1b' : '#6b7280';
                      return (
                        <tr key={fila.codigo_barras}>
                          <td><code>{fila.codigo_barras}</code></td>
                          <td>{fila.nombre}</td>
                          <td>${formatPrecio(fila.precio_actual)}</td>
                          <td><strong>${formatPrecio(fila.precio_nuevo)}</strong></td>
                          <td style={{ color }}>
                            {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatPrecio(diff)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p style={{ marginBottom: 12 }}>
                Se actualizarán <strong>{previewImport.actualizaciones.length}</strong> producto(s)
                {crearSeleccionados.size > 0 && (
                  <> y se crearán <strong>{crearSeleccionados.size}</strong> producto(s) nuevo(s)</>
                )}.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn--primary"
                  onClick={handleConfirmar}
                  disabled={
                    estadoImport === 'confirmando' ||
                    (previewImport.actualizaciones.length === 0 && crearSeleccionados.size === 0)
                  }
                >
                  {estadoImport === 'confirmando' ? 'Aplicando…' : 'Confirmar actualización'}
                </button>
                <button className="btn btn--ghost" onClick={resetImport}>
                  Cancelar
                </button>
              </div>
            </>
          )}

          {estadoImport === 'resultado' && resultadoImport && (
            <div>
              <div style={{ background: '#d1fae5', border: '1px solid #059669', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                <strong>{resultadoImport.actualizados} precio(s) actualizados y {resultadoImport.creados} producto(s) creado(s) correctamente.</strong>
              </div>
              {resultadoImport.fallidos.length > 0 && (
                <div style={{ background: '#fee2e2', border: '1px solid #dc2626', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                  <strong>{resultadoImport.fallidos.length} error(es):</strong>
                  <ul style={{ margin: '6px 0 0 16px', fontSize: 13 }}>
                    {resultadoImport.fallidos.map(f => (
                      <li key={f.codigo_barras}>{f.codigo_barras}: {f.razon}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button className="btn btn--primary" onClick={resetImport}>
                Importar otro archivo
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
