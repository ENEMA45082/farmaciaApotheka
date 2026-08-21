import { useState, useRef } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { useBanners } from '../hooks/useBanners';
import { useBannersPromo } from '../hooks/useBannersPromo';
import { useProductosDestacados } from '../hooks/useProductosDestacados';
import { useReordenarArrastre } from '../hooks/useReordenarArrastre';
import { subirImagenes, fetchProductos } from '../api/productos.api';
import { crearBanner, actualizarBanner } from '../api/banners.api';
import { crearBannerPromo, actualizarBannerPromo } from '../api/bannersPromo.api';
import {
  agregarProductoDestacado,
  actualizarProductoDestacado,
  eliminarProductoDestacado,
} from '../api/productosDestacados.api';
import type { Banner, BannerPromo, Producto, ProductoDestacado, TemaBannerPromo } from '../types';
import { formatPrecio, precioEfectivo } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import { EliminarBannerModal } from '../components/admin/EliminarBannerModal';
import { EliminarBannerPromoModal } from '../components/admin/EliminarBannerPromoModal';

const FORM_BANNER_VACIO = { link_url: '', alt_texto: '' };

const TEMAS_BANNER_PROMO: { value: TemaBannerPromo; label: string }[] = [
  { value: 'turquesa', label: 'Turquesa' },
  { value: 'azul', label: 'Azul' },
  { value: 'coral', label: 'Coral' },
  { value: 'violeta', label: 'Violeta' },
  { value: 'verde', label: 'Verde' },
];

const FORM_BANNER_PROMO_VACIO = {
  titulo: '',
  vigencia_texto: '',
  badge_texto: '',
  tema: 'turquesa' as TemaBannerPromo,
  link_url: '',
};

export function AdminCarteleriaPage() {
  // — Cartelería (banners del carrusel de la home) —
  const { banners, cargando: cargandoBanners, error: errorBanners, recargar: recargarBanners } = useBanners();

  const [formBanner, setFormBanner] = useState(FORM_BANNER_VACIO);
  const [bannerEditando, setBannerEditando] = useState<Banner | null>(null);
  const [imagenBannerExistente, setImagenBannerExistente] = useState<string | null>(null);
  const [archivoBannerNuevo, setArchivoBannerNuevo] = useState<File | null>(null);
  const [previewBannerNuevo, setPreviewBannerNuevo] = useState<string | null>(null);
  const [guardandoBanner, setGuardandoBanner] = useState(false);
  const [errorBannerForm, setErrorBannerForm] = useState<string | null>(null);
  const inputBannerRef = useRef<HTMLInputElement>(null);

  function iniciarEdicionBanner(b: Banner) {
    setBannerEditando(b);
    setFormBanner({ link_url: b.link_url ?? '', alt_texto: b.alt_texto });
    setImagenBannerExistente(b.imagen_url);
    setArchivoBannerNuevo(null);
    setPreviewBannerNuevo(null);
    setErrorBannerForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicionBanner() {
    setBannerEditando(null);
    setFormBanner(FORM_BANNER_VACIO);
    setImagenBannerExistente(null);
    if (previewBannerNuevo) URL.revokeObjectURL(previewBannerNuevo);
    setArchivoBannerNuevo(null);
    setPreviewBannerNuevo(null);
    setErrorBannerForm(null);
    if (inputBannerRef.current) inputBannerRef.current.value = '';
  }

  function seleccionarArchivoBanner(files: FileList) {
    const archivo = files[0];
    if (!archivo) return;
    if (previewBannerNuevo) URL.revokeObjectURL(previewBannerNuevo);
    setArchivoBannerNuevo(archivo);
    setPreviewBannerNuevo(URL.createObjectURL(archivo));
    setImagenBannerExistente(null);
    if (inputBannerRef.current) inputBannerRef.current.value = '';
  }

  async function handleSubmitBanner(e: React.FormEvent) {
    e.preventDefault();
    setErrorBannerForm(null);
    if (!formBanner.alt_texto.trim()) {
      setErrorBannerForm('El texto alternativo es obligatorio.');
      return;
    }
    if (!bannerEditando && !archivoBannerNuevo) {
      setErrorBannerForm('La imagen es obligatoria.');
      return;
    }
    setGuardandoBanner(true);
    try {
      let imagenUrl = imagenBannerExistente;
      if (archivoBannerNuevo) {
        const [url] = await subirImagenes([archivoBannerNuevo]);
        imagenUrl = url;
      }
      if (bannerEditando) {
        await actualizarBanner(bannerEditando.id, {
          imagen_url: imagenUrl ?? undefined,
          link_url: formBanner.link_url.trim() || null,
          alt_texto: formBanner.alt_texto.trim(),
        });
      } else {
        const ordenMax = banners.length ? Math.max(...banners.map(b => b.orden)) + 1 : 0;
        await crearBanner({
          imagen_url: imagenUrl!,
          link_url: formBanner.link_url.trim() || null,
          alt_texto: formBanner.alt_texto.trim(),
          orden: ordenMax,
        });
      }
      cancelarEdicionBanner();
      recargarBanners();
    } catch {
      setErrorBannerForm('Error al guardar el banner. Intentá de nuevo.');
    } finally {
      setGuardandoBanner(false);
    }
  }

  const [bannerAEliminar, setBannerAEliminar] = useState<Banner | null>(null);

  function handleEliminarBanner(b: Banner) {
    setBannerAEliminar(b);
  }

  async function handleToggleActivoBanner(b: Banner) {
    try {
      await actualizarBanner(b.id, { activo: !b.activo });
      recargarBanners();
    } catch {
      setErrorBannerForm('No se pudo actualizar el banner.');
    }
  }

  const arrastreBanners = useReordenarArrastre(
    banners,
    (id, orden) => actualizarBanner(id, { orden }),
    recargarBanners,
    setErrorBannerForm
  );

  // — Banners promocionales (tarjetas debajo de "medios de pago") —
  const {
    banners: bannersPromo,
    cargando: cargandoBannersPromo,
    error: errorBannersPromo,
    recargar: recargarBannersPromo,
  } = useBannersPromo();

  const [formBannerPromo, setFormBannerPromo] = useState(FORM_BANNER_PROMO_VACIO);
  const [bannerPromoEditando, setBannerPromoEditando] = useState<BannerPromo | null>(null);
  const [imagenBannerPromoExistente, setImagenBannerPromoExistente] = useState<string | null>(null);
  const [archivoBannerPromoNuevo, setArchivoBannerPromoNuevo] = useState<File | null>(null);
  const [previewBannerPromoNuevo, setPreviewBannerPromoNuevo] = useState<string | null>(null);
  const [guardandoBannerPromo, setGuardandoBannerPromo] = useState(false);
  const [errorBannerPromoForm, setErrorBannerPromoForm] = useState<string | null>(null);
  const inputBannerPromoRef = useRef<HTMLInputElement>(null);

  function iniciarEdicionBannerPromo(b: BannerPromo) {
    setBannerPromoEditando(b);
    setFormBannerPromo({
      titulo: b.titulo,
      vigencia_texto: b.vigencia_texto ?? '',
      badge_texto: b.badge_texto ?? '',
      tema: b.tema,
      link_url: b.link_url ?? '',
    });
    setImagenBannerPromoExistente(b.imagen_url);
    setArchivoBannerPromoNuevo(null);
    setPreviewBannerPromoNuevo(null);
    setErrorBannerPromoForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicionBannerPromo() {
    setBannerPromoEditando(null);
    setFormBannerPromo(FORM_BANNER_PROMO_VACIO);
    setImagenBannerPromoExistente(null);
    if (previewBannerPromoNuevo) URL.revokeObjectURL(previewBannerPromoNuevo);
    setArchivoBannerPromoNuevo(null);
    setPreviewBannerPromoNuevo(null);
    setErrorBannerPromoForm(null);
    if (inputBannerPromoRef.current) inputBannerPromoRef.current.value = '';
  }

  function seleccionarArchivoBannerPromo(files: FileList) {
    const archivo = files[0];
    if (!archivo) return;
    if (previewBannerPromoNuevo) URL.revokeObjectURL(previewBannerPromoNuevo);
    setArchivoBannerPromoNuevo(archivo);
    setPreviewBannerPromoNuevo(URL.createObjectURL(archivo));
    setImagenBannerPromoExistente(null);
    if (inputBannerPromoRef.current) inputBannerPromoRef.current.value = '';
  }

  async function handleSubmitBannerPromo(e: React.FormEvent) {
    e.preventDefault();
    setErrorBannerPromoForm(null);
    if (!formBannerPromo.titulo.trim()) {
      setErrorBannerPromoForm('El título es obligatorio.');
      return;
    }
    if (!bannerPromoEditando && !archivoBannerPromoNuevo) {
      setErrorBannerPromoForm('La imagen es obligatoria.');
      return;
    }
    setGuardandoBannerPromo(true);
    try {
      let imagenUrl = imagenBannerPromoExistente;
      if (archivoBannerPromoNuevo) {
        const [url] = await subirImagenes([archivoBannerPromoNuevo]);
        imagenUrl = url;
      }
      if (bannerPromoEditando) {
        await actualizarBannerPromo(bannerPromoEditando.id, {
          imagen_url: imagenUrl ?? undefined,
          titulo: formBannerPromo.titulo.trim(),
          vigencia_texto: formBannerPromo.vigencia_texto.trim() || null,
          badge_texto: formBannerPromo.badge_texto.trim() || null,
          tema: formBannerPromo.tema,
          link_url: formBannerPromo.link_url.trim() || null,
        });
      } else {
        const ordenMax = bannersPromo.length ? Math.max(...bannersPromo.map(b => b.orden)) + 1 : 0;
        await crearBannerPromo({
          imagen_url: imagenUrl!,
          titulo: formBannerPromo.titulo.trim(),
          vigencia_texto: formBannerPromo.vigencia_texto.trim() || null,
          badge_texto: formBannerPromo.badge_texto.trim() || null,
          tema: formBannerPromo.tema,
          link_url: formBannerPromo.link_url.trim() || null,
          orden: ordenMax,
        });
      }
      cancelarEdicionBannerPromo();
      recargarBannersPromo();
    } catch {
      setErrorBannerPromoForm('Error al guardar el banner. Intentá de nuevo.');
    } finally {
      setGuardandoBannerPromo(false);
    }
  }

  const [bannerPromoAEliminar, setBannerPromoAEliminar] = useState<BannerPromo | null>(null);

  function handleEliminarBannerPromo(b: BannerPromo) {
    setBannerPromoAEliminar(b);
  }

  async function handleToggleActivoBannerPromo(b: BannerPromo) {
    try {
      await actualizarBannerPromo(b.id, { activo: !b.activo });
      recargarBannersPromo();
    } catch {
      setErrorBannerPromoForm('No se pudo actualizar el banner.');
    }
  }

  const arrastreBannersPromo = useReordenarArrastre(
    bannersPromo,
    (id, orden) => actualizarBannerPromo(id, { orden }),
    recargarBannersPromo,
    setErrorBannerPromoForm
  );

  // — Productos destacados ("Los elegidos de Apotheka") —
  const {
    productosDestacados,
    cargando: cargandoDestacados,
    error: errorDestacados,
    recargar: recargarDestacados,
  } = useProductosDestacados();

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [errorDestacadosForm, setErrorDestacadosForm] = useState<string | null>(null);
  const debounceBusquedaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function buscarProductosParaCarrusel(query: string) {
    if (query.trim().length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscandoProductos(true);
    try {
      const yaAgregados = new Set(productosDestacados.map(pd => pd.producto_id));
      const resultado = await fetchProductos({ busqueda: query.trim(), limite: 8 });
      setResultadosBusqueda(resultado.datos.filter(p => !yaAgregados.has(p.id)));
      setMostrarResultados(true);
    } catch {
      setResultadosBusqueda([]);
    } finally {
      setBuscandoProductos(false);
    }
  }

  function handleBusquedaProductoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setBusquedaProducto(valor);
    if (debounceBusquedaRef.current) clearTimeout(debounceBusquedaRef.current);
    debounceBusquedaRef.current = setTimeout(() => buscarProductosParaCarrusel(valor), 300);
  }

  async function handleAgregarProductoDestacado(producto: Producto) {
    setErrorDestacadosForm(null);
    try {
      await agregarProductoDestacado({ producto_id: producto.id });
      setBusquedaProducto('');
      setResultadosBusqueda([]);
      setMostrarResultados(false);
      recargarDestacados();
    } catch {
      setErrorDestacadosForm('No se pudo agregar el producto. Intentá de nuevo.');
    }
  }

  async function handleQuitarProductoDestacado(pd: ProductoDestacado) {
    setErrorDestacadosForm(null);
    try {
      await eliminarProductoDestacado(pd.id);
      recargarDestacados();
    } catch {
      setErrorDestacadosForm('No se pudo quitar el producto.');
    }
  }

  const arrastreDestacados = useReordenarArrastre(
    productosDestacados,
    (id, orden) => actualizarProductoDestacado(id, { orden }),
    recargarDestacados,
    setErrorDestacadosForm
  );

  return (
    <AdminLayout subtitle="Banners del carrusel de la home">
      <div className="admin-section">
        <div className={`admin-form-card${bannerEditando ? ' admin-form-card--editando' : ''}`}>
          <h2>{bannerEditando ? 'Editando banner' : 'Agregar banner'}</h2>
          <p className="admin-subtitle">Recomendado: hasta 5 banners activos a la vez, fotos de 1600×600px.</p>

          {errorBannerForm && <div className="admin-error">{errorBannerForm}</div>}

          <form onSubmit={handleSubmitBanner} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="b-alt">Texto alternativo *</label>
                <input
                  id="b-alt"
                  type="text"
                  value={formBanner.alt_texto}
                  onChange={e => setFormBanner(f => ({ ...f, alt_texto: e.target.value }))}
                  placeholder="Ej: Julio hasta 50% off"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="b-link">Link (opcional)</label>
                <input
                  id="b-link"
                  type="text"
                  value={formBanner.link_url}
                  onChange={e => setFormBanner(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="/ofertas"
                />
              </div>
            </div>

            {(previewBannerNuevo || imagenBannerExistente) && (
              <div className="imagen-strip">
                <div className="imagen-thumb">
                  <img src={previewBannerNuevo ?? imagenBannerExistente ?? ''} alt="" />
                </div>
              </div>
            )}

            <input
              ref={inputBannerRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files && seleccionarArchivoBanner(e.target.files)}
            />

            <div className="admin-form-actions">
              <button type="button" className="btn btn-fotos" onClick={() => inputBannerRef.current?.click()}>
                {imagenBannerExistente || previewBannerNuevo ? 'Cambiar foto' : 'Elegir foto'}
              </button>

              <button type="submit" className="btn btn-primary" disabled={guardandoBanner}>
                {guardandoBanner ? 'Guardando...' : bannerEditando ? 'Guardar cambios' : 'Agregar banner'}
              </button>
              {bannerEditando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicionBanner}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-table-card">
          <h2>Banners ({banners.length})</h2>

          {cargandoBanners && <p className="admin-loading">Cargando banners...</p>}
          {errorBanners && <div className="admin-error">{errorBanners}</div>}
          {!cargandoBanners && banners.length === 0 && (
            <p className="admin-empty">No hay banners creados aún.</p>
          )}

          {banners.length > 0 && (
            <div className="admin-table-wrapper">
              <p className="admin-aviso admin-aviso--arrastre">Arrastrá una fila (☰) para reordenarla directamente.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Imagen</th>
                    <th>Alt</th>
                    <th>Link</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((b, i) => (
                    <tr
                      key={b.id}
                      draggable
                      onDragStart={() => arrastreBanners.handleDragStart(i)}
                      onDragOver={e => arrastreBanners.handleDragOver(e, i)}
                      onDrop={e => { e.preventDefault(); arrastreBanners.handleDrop(i); }}
                      onDragEnd={arrastreBanners.handleDragEnd}
                      className={[
                        bannerEditando?.id === b.id ? 'row-editando' : '',
                        arrastreBanners.indiceArrastrado === i ? 'row-arrastrando' : '',
                        arrastreBanners.indiceSobreArrastre === i && arrastreBanners.indiceArrastrado !== i ? 'row-sobre-arrastre' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <td className="celda-arrastre" title="Arrastrar para reordenar">
                        <GripVertical size={16} />
                      </td>
                      <td><img src={b.imagen_url} alt="" style={{ width: 64, height: 24, objectFit: 'cover', borderRadius: 4 }} /></td>
                      <td>{b.alt_texto}</td>
                      <td>{b.link_url || <span style={{color:'#aaa'}}>—</span>}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={b.activo}
                          onChange={() => handleToggleActivoBanner(b)}
                          aria-label={b.activo ? 'Desactivar banner' : 'Activar banner'}
                        />
                      </td>
                      <td className="acciones">
                        <button className="btn-tabla btn-editar" onClick={() => iniciarEdicionBanner(b)} aria-label="Editar banner" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-tabla btn-eliminar" onClick={() => handleEliminarBanner(b)} aria-label="Eliminar banner" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`admin-form-card${bannerPromoEditando ? ' admin-form-card--editando' : ''}`}>
          <h2>{bannerPromoEditando ? 'Editando banner promocional' : 'Agregar banner promocional'}</h2>
          <p className="admin-subtitle">Tarjetas que aparecen debajo de "medios de pago" en la home (ej: Skincare, Cuidado Capilar, Fragancias).</p>

          {errorBannerPromoForm && <div className="admin-error">{errorBannerPromoForm}</div>}

          <form onSubmit={handleSubmitBannerPromo} className="admin-form">
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="bp-titulo">Título *</label>
                <input
                  id="bp-titulo"
                  type="text"
                  value={formBannerPromo.titulo}
                  onChange={e => setFormBannerPromo(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Skincare"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="bp-tema">Color</label>
                <select
                  id="bp-tema"
                  value={formBannerPromo.tema}
                  onChange={e => setFormBannerPromo(f => ({ ...f, tema: e.target.value as TemaBannerPromo }))}
                >
                  {TEMAS_BANNER_PROMO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bp-vigencia">Vigencia (opcional)</label>
                <input
                  id="bp-vigencia"
                  type="text"
                  value={formBannerPromo.vigencia_texto}
                  onChange={e => setFormBannerPromo(f => ({ ...f, vigencia_texto: e.target.value }))}
                  placeholder="Ej: Del 1 al 16 de agosto"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bp-badge">Insignia (opcional)</label>
                <input
                  id="bp-badge"
                  type="text"
                  value={formBannerPromo.badge_texto}
                  onChange={e => setFormBannerPromo(f => ({ ...f, badge_texto: e.target.value }))}
                  placeholder="Ej: Hasta -40% ó 2x1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bp-link">Link (opcional)</label>
                <input
                  id="bp-link"
                  type="text"
                  value={formBannerPromo.link_url}
                  onChange={e => setFormBannerPromo(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="/categoria/dermocosmetica"
                />
              </div>
            </div>

            {(previewBannerPromoNuevo || imagenBannerPromoExistente) && (
              <div className="imagen-strip">
                <div className="imagen-thumb">
                  <img src={previewBannerPromoNuevo ?? imagenBannerPromoExistente ?? ''} alt="" />
                </div>
              </div>
            )}

            <input
              ref={inputBannerPromoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files && seleccionarArchivoBannerPromo(e.target.files)}
            />

            <div className="admin-form-actions">
              <button type="button" className="btn btn-fotos" onClick={() => inputBannerPromoRef.current?.click()}>
                {imagenBannerPromoExistente || previewBannerPromoNuevo ? 'Cambiar foto' : 'Elegir foto'}
              </button>

              <button type="submit" className="btn btn-primary" disabled={guardandoBannerPromo}>
                {guardandoBannerPromo ? 'Guardando...' : bannerPromoEditando ? 'Guardar cambios' : 'Agregar banner'}
              </button>
              {bannerPromoEditando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicionBannerPromo}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-table-card">
          <h2>Banners promocionales ({bannersPromo.length})</h2>

          {cargandoBannersPromo && <p className="admin-loading">Cargando banners...</p>}
          {errorBannersPromo && <div className="admin-error">{errorBannersPromo}</div>}
          {!cargandoBannersPromo && bannersPromo.length === 0 && (
            <p className="admin-empty">No hay banners promocionales creados aún.</p>
          )}

          {bannersPromo.length > 0 && (
            <div className="admin-table-wrapper">
              <p className="admin-aviso admin-aviso--arrastre">Arrastrá una fila (☰) para reordenarla directamente.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Imagen</th>
                    <th>Título</th>
                    <th>Color</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bannersPromo.map((b, i) => (
                    <tr
                      key={b.id}
                      draggable
                      onDragStart={() => arrastreBannersPromo.handleDragStart(i)}
                      onDragOver={e => arrastreBannersPromo.handleDragOver(e, i)}
                      onDrop={e => { e.preventDefault(); arrastreBannersPromo.handleDrop(i); }}
                      onDragEnd={arrastreBannersPromo.handleDragEnd}
                      className={[
                        bannerPromoEditando?.id === b.id ? 'row-editando' : '',
                        arrastreBannersPromo.indiceArrastrado === i ? 'row-arrastrando' : '',
                        arrastreBannersPromo.indiceSobreArrastre === i && arrastreBannersPromo.indiceArrastrado !== i ? 'row-sobre-arrastre' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <td className="celda-arrastre" title="Arrastrar para reordenar">
                        <GripVertical size={16} />
                      </td>
                      <td><img src={b.imagen_url} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 4 }} /></td>
                      <td>{b.titulo}</td>
                      <td>{TEMAS_BANNER_PROMO.find(t => t.value === b.tema)?.label ?? b.tema}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={b.activo}
                          onChange={() => handleToggleActivoBannerPromo(b)}
                          aria-label={b.activo ? 'Desactivar banner' : 'Activar banner'}
                        />
                      </td>
                      <td className="acciones">
                        <button className="btn-tabla btn-editar" onClick={() => iniciarEdicionBannerPromo(b)} aria-label="Editar banner" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-tabla btn-eliminar" onClick={() => handleEliminarBannerPromo(b)} aria-label="Eliminar banner" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-form-card">
          <h2>Agregar productos al carrusel</h2>
          <p className="admin-subtitle">Elegí qué productos del catálogo se muestran en "Los elegidos de Apotheka", en la home.</p>

          {errorDestacadosForm && <div className="admin-error">{errorDestacadosForm}</div>}

          <div className="form-group admin-buscador-producto">
            <label htmlFor="buscar-producto-destacado">Buscar producto</label>
            <input
              id="buscar-producto-destacado"
              type="text"
              value={busquedaProducto}
              onChange={handleBusquedaProductoChange}
              onFocus={() => resultadosBusqueda.length > 0 && setMostrarResultados(true)}
              onBlur={() => setTimeout(() => setMostrarResultados(false), 150)}
              placeholder="Escribí el nombre de un producto..."
              autoComplete="off"
            />

            {mostrarResultados && resultadosBusqueda.length > 0 && (
              <ul className="admin-buscador-producto__lista">
                {resultadosBusqueda.map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="admin-buscador-producto__item"
                      onMouseDown={() => handleAgregarProductoDestacado(p)}
                    >
                      <img src={p.imagen_url ?? p.imagenes[0] ?? ''} alt="" className="admin-buscador-producto__thumb" />
                      <span className="admin-buscador-producto__info">
                        <span className="admin-buscador-producto__nombre">{p.nombre}</span>
                        <span className="admin-buscador-producto__precio">${formatPrecio(precioEfectivo(p))}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {mostrarResultados && !buscandoProductos && busquedaProducto.trim().length >= 2 && resultadosBusqueda.length === 0 && (
              <ul className="admin-buscador-producto__lista">
                <li className="admin-buscador-producto__vacio">No se encontraron productos disponibles para agregar.</li>
              </ul>
            )}
          </div>
        </div>

        <div className="admin-table-card">
          <h2>Productos en el carrusel ({productosDestacados.length})</h2>

          {cargandoDestacados && <p className="admin-loading">Cargando productos...</p>}
          {errorDestacados && <div className="admin-error">{errorDestacados}</div>}
          {!cargandoDestacados && productosDestacados.length === 0 && (
            <p className="admin-empty">Todavía no elegiste productos para este carrusel.</p>
          )}

          {productosDestacados.length > 0 && (
            <div className="admin-table-wrapper">
              <p className="admin-aviso admin-aviso--arrastre">Arrastrá una fila (☰) para reordenarla directamente.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Imagen</th>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosDestacados.map((pd, i) => (
                    <tr
                      key={pd.id}
                      draggable
                      onDragStart={() => arrastreDestacados.handleDragStart(i)}
                      onDragOver={e => arrastreDestacados.handleDragOver(e, i)}
                      onDrop={e => { e.preventDefault(); arrastreDestacados.handleDrop(i); }}
                      onDragEnd={arrastreDestacados.handleDragEnd}
                      className={
                        (arrastreDestacados.indiceArrastrado === i ? 'row-arrastrando' : '') +
                        (arrastreDestacados.indiceSobreArrastre === i && arrastreDestacados.indiceArrastrado !== i ? ' row-sobre-arrastre' : '')
                      }
                    >
                      <td className="celda-arrastre" title="Arrastrar para reordenar">
                        <GripVertical size={16} />
                      </td>
                      <td><img src={pd.producto.imagen_url ?? ''} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} /></td>
                      <td>{pd.producto.nombre}</td>
                      <td>${formatPrecio(precioEfectivo(pd.producto))}</td>
                      <td className="acciones">
                        <button className="btn-tabla btn-eliminar" onClick={() => handleQuitarProductoDestacado(pd)} aria-label="Quitar del carrusel" title="Quitar del carrusel">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {bannerAEliminar && (
        <EliminarBannerModal
          banner={bannerAEliminar}
          onClose={() => setBannerAEliminar(null)}
          onEliminado={() => {
            setBannerAEliminar(null);
            recargarBanners();
          }}
        />
      )}

      {bannerPromoAEliminar && (
        <EliminarBannerPromoModal
          banner={bannerPromoAEliminar}
          onClose={() => setBannerPromoAEliminar(null)}
          onEliminado={() => {
            setBannerPromoAEliminar(null);
            recargarBannersPromo();
          }}
        />
      )}
    </AdminLayout>
  );
}
