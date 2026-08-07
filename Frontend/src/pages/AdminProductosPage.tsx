import { useState, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useProductos } from '../hooks/useProductos';
import { useCategorias } from '../hooks/useCategorias';
import { crearProducto, actualizarProducto, subirImagenes } from '../api/productos.api';
import type { Producto, CrearProductoDTO, ActualizarProductoDTO } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import { EliminarProductoModal } from '../components/admin/EliminarProductoModal';

const MAX_IMAGENES = 5;

const FORM_PRODUCTO_VACIO = {
  nombre: '',
  precio: '',
  descripcion: '',
  stock: '0',
  codigo_barras: '',
  categoria_id: '',
  fecha_vencimiento: '',
  en_oferta: false,
  precio_oferta: '',
  porcentaje_oferta: '',
  es_2x1: false,
  es_venta_libre: true,
  peso_gramos: '',
  alicuota_iva: '21',
};

const FILTRO_FORM_VACIO = {
  busqueda: '',
  codigo_barras: '',
  en_oferta: '',
  precio_min: '',
  precio_max: '',
  stock_min: '',
  stock_max: '',
  vencimiento_desde: '',
  vencimiento_hasta: '',
};

type FiltroForm = typeof FILTRO_FORM_VACIO;

export function AdminProductosPage() {
  // — Filtros de la tabla de productos —
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroForm, setFiltroForm] = useState<FiltroForm>(FILTRO_FORM_VACIO);
  const [filtrosAplicados, setFiltrosAplicados] = useState<{
    busqueda?: string;
    codigo_barras?: string;
    en_oferta?: boolean;
    precio_min?: number;
    precio_max?: number;
    stock_min?: number;
    stock_max?: number;
    vencimiento_desde?: string;
    vencimiento_hasta?: string;
  }>({});

  const filtrosActivos = Object.values(filtrosAplicados).some(v => v !== undefined);

  function aplicarFiltros() {
    setFiltrosAplicados({
      busqueda:          filtroForm.busqueda.trim()       || undefined,
      codigo_barras:     filtroForm.codigo_barras.trim()  || undefined,
      en_oferta:         filtroForm.en_oferta === 'true' ? true : filtroForm.en_oferta === 'false' ? false : undefined,
      precio_min:        filtroForm.precio_min  ? parseFloat(filtroForm.precio_min)  : undefined,
      precio_max:        filtroForm.precio_max  ? parseFloat(filtroForm.precio_max)  : undefined,
      stock_min:         filtroForm.stock_min   ? parseInt(filtroForm.stock_min)     : undefined,
      stock_max:         filtroForm.stock_max   ? parseInt(filtroForm.stock_max)     : undefined,
      vencimiento_desde: filtroForm.vencimiento_desde || undefined,
      vencimiento_hasta: filtroForm.vencimiento_hasta || undefined,
    });
    setPaginaAdmin(1);
  }

  function limpiarFiltros() {
    setFiltroForm(FILTRO_FORM_VACIO);
    setFiltrosAplicados({});
    setPaginaAdmin(1);
  }

  const [paginaAdmin, setPaginaAdmin] = useState(1);
  const { productos, totalPaginas: totalPaginasAdmin, cargando: cargandoProductos, error: errorProductos, recargar: recargarProductos } =
    useProductos({ limite: 20, pagina: paginaAdmin, ...filtrosAplicados });
  const { categorias } = useCategorias();

  // — Productos —
  const [formProducto, setFormProducto] = useState(FORM_PRODUCTO_VACIO);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [errorProductoForm, setErrorProductoForm] = useState<string | null>(null);

  // — Imágenes —
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [previewsNuevos, setPreviewsNuevos] = useState<string[]>([]);
  const [imagenesExistentes, setImagenesExistentes] = useState<string[]>([]);
  const inputImagenRef = useRef<HTMLInputElement>(null);

  const totalImagenes = () => imagenesExistentes.length + archivosNuevos.length;

  function agregarArchivos(files: FileList) {
    const disponibles = MAX_IMAGENES - totalImagenes();
    if (disponibles <= 0) return;
    const nuevos = Array.from(files).slice(0, disponibles);
    const urls = nuevos.map(f => URL.createObjectURL(f));
    setArchivosNuevos(prev => [...prev, ...nuevos]);
    setPreviewsNuevos(prev => [...prev, ...urls]);
    if (inputImagenRef.current) inputImagenRef.current.value = '';
  }

  function quitarNuevo(i: number) {
    URL.revokeObjectURL(previewsNuevos[i]);
    setArchivosNuevos(prev => prev.filter((_, idx) => idx !== i));
    setPreviewsNuevos(prev => prev.filter((_, idx) => idx !== i));
  }

  function quitarExistente(i: number) {
    setImagenesExistentes(prev => prev.filter((_, idx) => idx !== i));
  }

  function limpiarImagenes() {
    previewsNuevos.forEach(url => URL.revokeObjectURL(url));
    setArchivosNuevos([]);
    setPreviewsNuevos([]);
    setImagenesExistentes([]);
    if (inputImagenRef.current) inputImagenRef.current.value = '';
  }

  function iniciarEdicionProducto(p: Producto) {
    setProductoEditando(p);
    setFormProducto({
      nombre: p.nombre,
      precio: String(p.precio),
      descripcion: p.descripcion ?? '',
      stock: String(p.stock),
      codigo_barras: p.codigo_barras ?? '',
      categoria_id: p.categoria_id ?? '',
      fecha_vencimiento: p.fecha_vencimiento ?? '',
      en_oferta: p.en_oferta,
      precio_oferta: p.precio_oferta != null ? String(p.precio_oferta) : '',
      porcentaje_oferta: p.porcentaje_oferta != null ? String(p.porcentaje_oferta) : '',
      es_2x1: p.es_2x1,
      es_venta_libre: p.es_venta_libre,
      peso_gramos: p.peso_gramos ? String(p.peso_gramos) : '',
      alicuota_iva: String(p.alicuota_iva ?? 21),
    });
    setImagenesExistentes(
      p.imagenes?.length ? p.imagenes : p.imagen_url ? [p.imagen_url] : []
    );
    setArchivosNuevos([]);
    setPreviewsNuevos([]);
    setErrorProductoForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicionProducto() {
    setProductoEditando(null);
    setFormProducto(FORM_PRODUCTO_VACIO);
    limpiarImagenes();
    setErrorProductoForm(null);
  }

  async function handleSubmitProducto(e: React.FormEvent) {
    e.preventDefault();
    setErrorProductoForm(null);

    if (!formProducto.nombre.trim()) {
      setErrorProductoForm('El nombre es obligatorio.');
      return;
    }
    const precio = parseFloat(formProducto.precio);
    if (isNaN(precio) || precio < 0) {
      setErrorProductoForm('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    setGuardandoProducto(true);
    try {
      const urlsNuevas = archivosNuevos.length > 0 ? await subirImagenes(archivosNuevos) : [];
      const todasLasImagenes = [...imagenesExistentes, ...urlsNuevas];

      const precioOferta = formProducto.precio_oferta !== '' ? parseFloat(formProducto.precio_oferta) : null;
      const pctOferta    = formProducto.porcentaje_oferta !== '' ? parseInt(formProducto.porcentaje_oferta) : null;

      const payload: CrearProductoDTO | ActualizarProductoDTO = {
        nombre: formProducto.nombre.trim(),
        precio,
        en_oferta:         formProducto.en_oferta,
        precio_oferta:     formProducto.en_oferta && !formProducto.es_2x1 ? precioOferta : null,
        porcentaje_oferta: formProducto.en_oferta && !formProducto.es_2x1 ? pctOferta    : null,
        es_2x1:            formProducto.en_oferta && formProducto.es_2x1,
        descripcion: formProducto.descripcion.trim() || undefined,
        stock: formProducto.stock !== '' ? parseInt(formProducto.stock) : 0,
        categoria_id: formProducto.categoria_id || undefined,
        imagen_url: todasLasImagenes[0] ?? undefined,
        imagenes: todasLasImagenes,
        codigo_barras: formProducto.codigo_barras.trim() || undefined,
        fecha_vencimiento: formProducto.fecha_vencimiento || undefined,
        es_venta_libre: formProducto.es_venta_libre,
        peso_gramos: formProducto.peso_gramos !== '' ? parseInt(formProducto.peso_gramos) : 0,
        alicuota_iva: formProducto.alicuota_iva !== '' ? parseFloat(formProducto.alicuota_iva) : 21,
      };

      if (productoEditando) {
        await actualizarProducto(productoEditando.id, payload as ActualizarProductoDTO);
      } else {
        await crearProducto(payload as CrearProductoDTO);
      }

      cancelarEdicionProducto();
      setPaginaAdmin(1);
      recargarProductos();
    } catch {
      setErrorProductoForm('Error al guardar el producto. Verificá los datos e intentá de nuevo.');
    } finally {
      setGuardandoProducto(false);
    }
  }

  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);

  function handleEliminarProducto(p: Producto) {
    setProductoAEliminar(p);
  }

  return (
    <AdminLayout>
      <div className="admin-section">
        <div className="admin-form-card">
          <h2>{productoEditando ? `Editando: ${productoEditando.nombre}` : 'Agregar producto'}</h2>

          {errorProductoForm && <div className="admin-error">{errorProductoForm}</div>}

          <form onSubmit={handleSubmitProducto} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="p-nombre">Nombre *</label>
                <input
                  id="p-nombre"
                  type="text"
                  value={formProducto.nombre}
                  onChange={e => setFormProducto(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Ibuprofeno 400mg"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="p-precio">Precio de lista ($) *</label>
                <input
                  id="p-precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formProducto.precio}
                  onChange={e => {
                    const lista = e.target.value;
                    setFormProducto(f => {
                      const listaNum = parseFloat(lista);
                      const ofertaNum = parseFloat(f.precio_oferta);
                      const pct = !isNaN(listaNum) && !isNaN(ofertaNum) && listaNum > 0
                        ? String(Math.round((1 - ofertaNum / listaNum) * 100))
                        : f.porcentaje_oferta;
                      return { ...f, precio: lista, porcentaje_oferta: pct };
                    });
                  }}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="p-stock">Stock</label>
                <input
                  id="p-stock"
                  type="number"
                  min="0"
                  value={formProducto.stock}
                  onChange={e => setFormProducto(f => ({ ...f, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="p-categoria">Categoría</label>
                <select
                  id="p-categoria"
                  value={formProducto.categoria_id}
                  onChange={e => setFormProducto(f => ({ ...f, categoria_id: e.target.value }))}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="p-barcode">Código de barras (opcional)</label>
                <input
                  id="p-barcode"
                  type="text"
                  value={formProducto.codigo_barras}
                  onChange={e => setFormProducto(f => ({ ...f, codigo_barras: e.target.value }))}
                  placeholder="Ej: 7890000000001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="p-vencimiento">Fecha de vencimiento (opcional)</label>
                <input
                  id="p-vencimiento"
                  type="date"
                  value={formProducto.fecha_vencimiento}
                  onChange={e => setFormProducto(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="p-peso">Peso (gramos)</label>
                <input
                  id="p-peso"
                  type="number"
                  min="1"
                  step="1"
                  value={formProducto.peso_gramos}
                  onChange={e => setFormProducto(f => ({ ...f, peso_gramos: e.target.value }))}
                  placeholder="500"
                />
              </div>

              <div className="form-group">
                <label htmlFor="p-iva">Alícuota de IVA</label>
                <select
                  id="p-iva"
                  value={formProducto.alicuota_iva}
                  onChange={e => setFormProducto(f => ({ ...f, alicuota_iva: e.target.value }))}
                >
                  <option value="21">21% (general)</option>
                  <option value="10.5">10,5% (medicamentos)</option>
                  <option value="27">27%</option>
                  <option value="0">0% (exento)</option>
                </select>
              </div>

            </div>

            {/* Venta libre */}
            <div className="oferta-section">
              <label className="oferta-checkbox-label">
                <input
                  type="checkbox"
                  checked={formProducto.es_venta_libre}
                  onChange={e => setFormProducto(f => ({ ...f, es_venta_libre: e.target.checked }))}
                />
                ¿Venta libre? <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 400 }}>(si no está activado, el producto no se muestra en la tienda)</span>
              </label>
            </div>

            {/* Sección oferta */}
            <div className="oferta-section">
              <label className="oferta-checkbox-label">
                <input
                  type="checkbox"
                  checked={formProducto.en_oferta}
                  onChange={e => setFormProducto(f => ({
                    ...f,
                    en_oferta: e.target.checked,
                    es_2x1: e.target.checked ? f.es_2x1 : false,
                    precio_oferta: e.target.checked ? f.precio_oferta : '',
                    porcentaje_oferta: e.target.checked ? f.porcentaje_oferta : '',
                  }))}
                />
                ¿En oferta?
              </label>

              {formProducto.en_oferta && (
                <>
                  <div className="oferta-tipo-selector">
                    <label className="oferta-tipo-opcion">
                      <input
                        type="radio"
                        name="tipo-oferta"
                        checked={!formProducto.es_2x1}
                        onChange={() => setFormProducto(f => ({ ...f, es_2x1: false }))}
                      />
                      % de descuento
                    </label>
                    <label className="oferta-tipo-opcion">
                      <input
                        type="radio"
                        name="tipo-oferta"
                        checked={formProducto.es_2x1}
                        onChange={() => setFormProducto(f => ({ ...f, es_2x1: true, precio_oferta: '', porcentaje_oferta: '' }))}
                      />
                      2x1
                    </label>
                  </div>

                  {formProducto.es_2x1 ? (
                    <p className="oferta-2x1-nota">
                      Al llevar 2 unidades se cobra 1 sola (la unidad suelta de una cantidad impar se cobra completa).
                      El descuento se calcula solo según la cantidad en el carrito — no hace falta cargar un precio acá.
                    </p>
                  ) : (
                    <div className="oferta-fields">
                      <div className="form-group">
                        <label htmlFor="p-precio-oferta">Precio de oferta ($)</label>
                        <input
                          id="p-precio-oferta"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formProducto.precio_oferta}
                          onChange={e => {
                            const oferta = e.target.value;
                            setFormProducto(f => {
                              const listaNum = parseFloat(f.precio);
                              const ofertaNum = parseFloat(oferta);
                              const pct = !isNaN(listaNum) && !isNaN(ofertaNum) && listaNum > 0
                                ? String(Math.round((1 - ofertaNum / listaNum) * 100))
                                : f.porcentaje_oferta;
                              return { ...f, precio_oferta: oferta, porcentaje_oferta: pct };
                            });
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="p-pct-oferta">% descuento</label>
                        <input
                          id="p-pct-oferta"
                          type="number"
                          min="1"
                          max="99"
                          step="1"
                          value={formProducto.porcentaje_oferta}
                          onChange={e => {
                            const pct = e.target.value;
                            setFormProducto(f => {
                              const listaNum = parseFloat(f.precio);
                              const pctNum = parseFloat(pct);
                              const oferta = !isNaN(listaNum) && !isNaN(pctNum)
                                ? String((listaNum * (1 - pctNum / 100)).toFixed(2))
                                : f.precio_oferta;
                              return { ...f, porcentaje_oferta: pct, precio_oferta: oferta };
                            });
                          }}
                          placeholder="10"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="p-descripcion">Descripción</label>
              <textarea
                id="p-descripcion"
                value={formProducto.descripcion}
                onChange={e => setFormProducto(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción del producto..."
                rows={3}
              />
            </div>

            {/* Strip de miniaturas */}
            {totalImagenes() > 0 && (
              <div className="imagen-strip">
                {imagenesExistentes.map((url, i) => (
                  <div className="imagen-thumb" key={`exist-${i}`}>
                    <img src={url} alt="" />
                    <button type="button" className="imagen-thumb__quitar" onClick={() => quitarExistente(i)}>×</button>
                  </div>
                ))}
                {previewsNuevos.map((url, i) => (
                  <div className="imagen-thumb imagen-thumb--nueva" key={`nuevo-${i}`}>
                    <img src={url} alt="" />
                    <button type="button" className="imagen-thumb__quitar" onClick={() => quitarNuevo(i)}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Input oculto */}
            <input
              ref={inputImagenRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && agregarArchivos(e.target.files)}
            />

            <div className="admin-form-actions">
              <button
                type="button"
                className="btn btn-fotos"
                disabled={totalImagenes() >= MAX_IMAGENES}
                onClick={() => inputImagenRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.35rem' }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Fotos{totalImagenes() > 0 ? ` (${totalImagenes()}/${MAX_IMAGENES})` : ''}
              </button>

              <button type="submit" className="btn btn-primary" disabled={guardandoProducto}>
                {guardandoProducto ? 'Guardando...' : productoEditando ? 'Guardar cambios' : 'Agregar producto'}
              </button>

              {productoEditando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicionProducto}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-table-card">
          <div className="admin-filtros-header">
            <h2>Productos</h2>
            <button
              type="button"
              className={`admin-filtros-toggle${filtrosActivos ? ' admin-filtros-toggle--activo' : ''}`}
              onClick={() => setFiltroAbierto(v => !v)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filtros{filtrosActivos ? ' ●' : ''}
              <span className={`admin-filtros-arrow${filtroAbierto ? ' admin-filtros-arrow--open' : ''}`}>▾</span>
            </button>
          </div>

          {filtroAbierto && (
            <div className="admin-filtros-panel">
              <div className="admin-filtros-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Buscar por nombre…"
                    value={filtroForm.busqueda}
                    onChange={e => setFiltroForm(f => ({ ...f, busqueda: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                  />
                </div>

                <div className="form-group">
                  <label>Cód. barras</label>
                  <input
                    type="text"
                    placeholder="Buscar por código…"
                    value={filtroForm.codigo_barras}
                    onChange={e => setFiltroForm(f => ({ ...f, codigo_barras: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                  />
                </div>

                <div className="form-group">
                  <label>Oferta</label>
                  <select
                    value={filtroForm.en_oferta}
                    onChange={e => setFiltroForm(f => ({ ...f, en_oferta: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="true">En oferta</option>
                    <option value="false">Sin oferta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Precio mín. ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filtroForm.precio_min}
                    onChange={e => setFiltroForm(f => ({ ...f, precio_min: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Precio máx. ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="9999"
                    value={filtroForm.precio_max}
                    onChange={e => setFiltroForm(f => ({ ...f, precio_max: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Stock mín.</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filtroForm.stock_min}
                    onChange={e => setFiltroForm(f => ({ ...f, stock_min: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Stock máx.</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="9999"
                    value={filtroForm.stock_max}
                    onChange={e => setFiltroForm(f => ({ ...f, stock_max: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Vencimiento desde</label>
                  <input
                    type="date"
                    value={filtroForm.vencimiento_desde}
                    onChange={e => setFiltroForm(f => ({ ...f, vencimiento_desde: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Vencimiento hasta</label>
                  <input
                    type="date"
                    value={filtroForm.vencimiento_hasta}
                    onChange={e => setFiltroForm(f => ({ ...f, vencimiento_hasta: e.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-filtros-actions">
                <button type="button" className="btn btn-primary" onClick={aplicarFiltros}>
                  Buscar
                </button>
                {filtrosActivos && (
                  <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {cargandoProductos && <p className="admin-loading">Cargando productos...</p>}
          {errorProductos && <div className="admin-error">{errorProductos}</div>}

          {!cargandoProductos && productos.length === 0 && (
            <p className="admin-empty">{filtrosActivos ? 'No hay productos que coincidan con los filtros.' : 'No hay productos cargados aún.'}</p>
          )}

          {productos.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Precio lista</th>
                    <th>Precio oferta</th>
                    <th>Stock</th>
                    <th>Categoría</th>
                    <th>Cód. barras</th>
                    <th>Vencimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => (
                    <tr key={p.id} className={productoEditando?.id === p.id ? 'row-editando' : ''}>
                      <td>{p.nombre}</td>
                      <td>${p.precio.toFixed(2)}</td>
                      <td>
                        {p.en_oferta && p.precio_oferta != null
                          ? <span className="tabla-oferta-precio">${p.precio_oferta.toFixed(2)}{p.porcentaje_oferta != null && <span className="tabla-oferta-badge"> -{p.porcentaje_oferta}%</span>}</span>
                          : p.es_2x1
                            ? <span className="tabla-oferta-badge">2x1</span>
                            : '—'}
                      </td>
                      <td>{p.stock}</td>
                      <td>{p.categoria?.nombre ?? '—'}</td>
                      <td>{p.codigo_barras ?? '—'}</td>
                      <td>{p.fecha_vencimiento ?? '—'}</td>
                      <td className="acciones">
                        <button className="btn-tabla btn-editar" onClick={() => iniciarEdicionProducto(p)} aria-label="Editar producto" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-tabla btn-eliminar" onClick={() => handleEliminarProducto(p)} aria-label="Eliminar producto" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {productos.length > 0 && (
            <div className="pagination">
              <button
                className="btn btn--ghost"
                onClick={() => setPaginaAdmin(p => p - 1)}
                disabled={paginaAdmin === 1}
              >
                ← Anterior
              </button>
              <span className="pagination__info">Página {paginaAdmin} de {totalPaginasAdmin}</span>
              <button
                className="btn btn--ghost"
                onClick={() => setPaginaAdmin(p => p + 1)}
                disabled={paginaAdmin >= totalPaginasAdmin}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {productoAEliminar && (
        <EliminarProductoModal
          producto={productoAEliminar}
          onClose={() => setProductoAEliminar(null)}
          onEliminado={() => {
            setProductoAEliminar(null);
            setPaginaAdmin(1);
            recargarProductos();
          }}
        />
      )}
    </AdminLayout>
  );
}
