import { useState, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useBanners } from '../hooks/useBanners';
import { subirImagenes } from '../api/productos.api';
import { crearBanner, actualizarBanner } from '../api/banners.api';
import type { Banner } from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import { EliminarBannerModal } from '../components/admin/EliminarBannerModal';

const FORM_BANNER_VACIO = { link_url: '', alt_texto: '' };

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

  async function handleMoverBanner(index: number, direccion: -1 | 1) {
    const actual = banners[index];
    const vecino = banners[index + direccion];
    if (!actual || !vecino) return;
    try {
      await Promise.all([
        actualizarBanner(actual.id, { orden: vecino.orden }),
        actualizarBanner(vecino.id, { orden: actual.orden }),
      ]);
      recargarBanners();
    } catch {
      setErrorBannerForm('No se pudo reordenar. Intentá de nuevo.');
    }
  }

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
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Alt</th>
                    <th>Link</th>
                    <th>Activo</th>
                    <th>Orden</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((b, i) => (
                    <tr key={b.id} className={bannerEditando?.id === b.id ? 'row-editando' : ''}>
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
                        <button className="btn-tabla" onClick={() => handleMoverBanner(i, -1)} disabled={i === 0} aria-label="Mover arriba" title="Mover arriba">
                          ▲
                        </button>
                        <button className="btn-tabla" onClick={() => handleMoverBanner(i, 1)} disabled={i === banners.length - 1} aria-label="Mover abajo" title="Mover abajo">
                          ▼
                        </button>
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
    </AdminLayout>
  );
}
