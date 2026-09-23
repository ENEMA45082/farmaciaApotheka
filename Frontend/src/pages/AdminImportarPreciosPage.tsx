import { useRef, useState } from 'react';
import { previewImportarPrecios } from '../api/productos.api';
import type {
  CoincidenciaPrecio,
  ProductoSinCoincidencia,
  ResumenImportarPrecios,
} from '../api/productos.api';
import { AdminLayout } from '../components/admin/AdminLayout';
import { RevisarCambiosPreciosModal } from '../components/admin/RevisarCambiosPreciosModal';
import { ProductosSinCoincidenciaModal } from '../components/admin/ProductosSinCoincidenciaModal';
import { useToast } from '../context/ToastContext';
import { mensajeDeErrorApi } from '../utils/mensajeError';

interface Analisis {
  id: number;
  resumen: ResumenImportarPrecios;
  coincidencias: CoincidenciaPrecio[];
  sinCoincidencia: ProductoSinCoincidencia[];
}

function describirFilasIgnoradas(r: ResumenImportarPrecios): string[] {
  const partes: string[] = [];
  if (r.sin_codigo) partes.push(`${r.sin_codigo} sin código de barras`);
  if (r.codigo_invalido) partes.push(`${r.codigo_invalido} con código inválido (Excel pudo convertirlo a notación científica)`);
  if (r.precio_invalido) partes.push(`${r.precio_invalido} sin un precio público válido`);
  if (r.mal_formadas) partes.push(`${r.mal_formadas} con distinta cantidad de columnas que el encabezado`);
  if (r.duplicados_ambiguos) partes.push(`${r.duplicados_ambiguos} código(s) repetido(s) con precios distintos (no se propone cambio; los que existen en el sistema quedan en «Sin coincidencia»)`);
  return partes;
}

export function AdminImportarPreciosPage() {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo]       = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [analisis, setAnalisis]     = useState<Analisis | null>(null);
  const [modal, setModal]           = useState<'cambios' | 'sin_coincidencia' | null>(null);
  const [totalActualizados, setTotalActualizados] = useState(0);

  function reiniciar() {
    setArchivo(null);
    setError(null);
    setAnalisis(null);
    setModal(null);
    setTotalActualizados(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleAnalizar() {
    if (!archivo) return;
    setAnalizando(true);
    setError(null);
    try {
      const preview = await previewImportarPrecios(archivo);
      setAnalisis({
        id: Date.now(),
        resumen: preview.resumen,
        coincidencias: preview.coincidencias,
        sinCoincidencia: preview.sin_coincidencia,
      });
      setTotalActualizados(0);
    } catch (e) {
      setError(mensajeDeErrorApi(e, 'Error al procesar el archivo.'));
    } finally {
      setAnalizando(false);
    }
  }

  // Los dos modales aplican por id de producto; lo aplicado sale de ambas
  // listas (un producto está en una sola, pero así no hay que saber en cuál).
  function handleAplicados(productoIds: string[]) {
    const aplicados = new Set(productoIds);
    setAnalisis(prev => prev && {
      ...prev,
      coincidencias:   prev.coincidencias.filter(c => !aplicados.has(c.producto_id)),
      sinCoincidencia: prev.sinCoincidencia.filter(p => !aplicados.has(p.producto_id)),
    });
    setTotalActualizados(total => total + productoIds.length);
    showToast(`${productoIds.length} precio${productoIds.length === 1 ? '' : 's'} actualizado${productoIds.length === 1 ? '' : 's'}`);
  }

  const ignoradas = analisis ? describirFilasIgnoradas(analisis.resumen) : [];

  return (
    <AdminLayout subtitle="Actualización masiva de precios por CSV">
      <div className="admin-section">
        <div className="admin-form-card">
          <h2>Importar precios desde CSV</h2>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Cargá el archivo CSV (separado por punto y coma o por coma). Se usa la columna{' '}
            <strong>CodBarraPrinc</strong> para encontrar el producto, <strong>precioPublico</strong> como
            nuevo precio y <strong>Producto</strong> para que compares que sea el mismo producto. Las
            demás columnas (precio, neto) se ignoran.
          </p>

          {error && <div className="admin-error">{error}</div>}

          {!analisis && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={inputRef}
                id="csv-file-input"
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={e => setArchivo(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="csv-file-input" className="btn btn--ghost" style={{ cursor: 'pointer' }}>
                Elegir archivo
              </label>
              <span style={{ color: archivo ? '#111' : '#999', fontSize: 14 }}>
                {archivo ? archivo.name : 'Ningún archivo seleccionado'}
              </span>
              <button
                className="btn btn--primary"
                onClick={handleAnalizar}
                disabled={!archivo || analizando}
              >
                {analizando ? 'Analizando…' : 'Analizar'}
              </button>
            </div>
          )}

          {analisis && (
            <>
              <p style={{ margin: 0, fontSize: 14 }}>
                Archivo analizado: <strong>{archivo?.name}</strong>
              </p>

              <div className="import-resumen">
                <div className="import-resumen__item">
                  <strong>{analisis.resumen.filas_csv}</strong>
                  <span>filas en el CSV</span>
                </div>
                <div className="import-resumen__item">
                  <strong>{analisis.coincidencias.length}</strong>
                  <span>con cambio de precio pendientes</span>
                </div>
                <div className="import-resumen__item">
                  <strong>{analisis.resumen.sin_cambio}</strong>
                  <span>ya tienen el mismo precio</span>
                </div>
                <div className="import-resumen__item">
                  <strong>{analisis.sinCoincidencia.length}</strong>
                  <span>del sistema sin coincidencia en el CSV</span>
                </div>
                <div className="import-resumen__item">
                  <strong>{analisis.resumen.solo_en_csv}</strong>
                  <span>códigos del CSV que no están en el sistema (ignorados)</span>
                </div>
                <div className="import-resumen__item">
                  <strong>{totalActualizados}</strong>
                  <span>precios actualizados en esta sesión</span>
                </div>
              </div>

              {ignoradas.length > 0 && (
                <div className="import-aviso">
                  <strong>Filas del CSV que se descartaron:</strong>
                  <ul>
                    {ignoradas.map(texto => <li key={texto}>{texto}</li>)}
                  </ul>
                </div>
              )}

              <div className="import-acciones">
                <button
                  className="btn btn--primary"
                  onClick={() => setModal('cambios')}
                  disabled={analisis.coincidencias.length === 0}
                >
                  Revisar cambios de precio ({analisis.coincidencias.length})
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setModal('sin_coincidencia')}
                  disabled={analisis.sinCoincidencia.length === 0}
                >
                  Productos sin coincidencia ({analisis.sinCoincidencia.length})
                </button>
                <button className="btn btn--ghost" onClick={reiniciar}>
                  Cargar otro archivo
                </button>
              </div>

              {analisis.coincidencias.length === 0 && (
                <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
                  No quedan cambios de precio pendientes para los productos del sistema.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {analisis && (
        <>
          <RevisarCambiosPreciosModal
            key={`cambios-${analisis.id}`}
            abierto={modal === 'cambios'}
            coincidencias={analisis.coincidencias}
            onClose={() => setModal(null)}
            onAplicados={handleAplicados}
          />
          <ProductosSinCoincidenciaModal
            key={`sin-coincidencia-${analisis.id}`}
            abierto={modal === 'sin_coincidencia'}
            productos={analisis.sinCoincidencia}
            onClose={() => setModal(null)}
            onAplicados={handleAplicados}
          />
        </>
      )}
    </AdminLayout>
  );
}
