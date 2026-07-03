import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchDireccion, guardarDireccion } from '../api/direcciones.api';
import { DireccionForm } from '../components/direcciones/DireccionForm';
import { PerfilLayout } from '../components/layout/PerfilLayout';
import type { Direccion, GuardarDireccionDTO } from '../types';

export function DireccionesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [direccion, setDireccion] = useState<Direccion | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchDireccion()
      .then(setDireccion)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [user]);

  async function handleGuardar(dto: GuardarDireccionDTO) {
    setGuardando(true);
    setMensaje(null);
    try {
      const guardada = await guardarDireccion(dto);
      setDireccion(guardada);
      setEditando(false);
      setMensaje({ tipo: 'ok', texto: 'Dirección guardada correctamente.' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar la dirección.' });
    } finally {
      setGuardando(false);
    }
  }

  if (!authLoading && !user) return null;

  if (authLoading || cargando) return <PerfilLayout><div className="perfil-loading">Cargando...</div></PerfilLayout>;

  return (
    <PerfilLayout>
      <div className="dir-tab-header">
        <h2 className="perfil-titulo" style={{ margin: 0 }}>Direcciones</h2>
        {!editando && !direccion && (
          <button className="btn btn--primary" onClick={() => setEditando(true)}>AÑADIR DIRECCIÓN</button>
        )}
      </div>

      {mensaje && (
        <p className={`perfil-mensaje perfil-mensaje--${mensaje.tipo}`} style={{ marginBottom: '1rem' }}>
          {mensaje.texto}
        </p>
      )}

      {editando ? (
        <DireccionForm
          inicial={direccion}
          onGuardar={handleGuardar}
          guardando={guardando}
          onCancelar={() => { setEditando(false); setMensaje(null); }}
        />
      ) : direccion ? (
        <div className="dir-cards">
          <div className="dir-card">
            <div className="dir-card__info">
              <p>
                {direccion.calle} {direccion.altura}
                {direccion.piso ? `, piso ${direccion.piso}` : ''}
                {direccion.depto ? ` dpto ${direccion.depto}` : ''}
              </p>
              {direccion.codigo_postal && <p>{direccion.codigo_postal}</p>}
              <p>{direccion.ciudad} - {direccion.provincia.toUpperCase()}</p>
              <p>{direccion.pais}</p>
            </div>
            <button className="btn btn--primary dir-card__btn" onClick={() => { setMensaje(null); setEditando(true); }}>
              EDITAR
            </button>
          </div>
        </div>
      ) : (
        <div className="dir-vacio">
          <p>No tenés ninguna dirección guardada.</p>
          <button className="btn btn--primary" style={{ marginTop: '1rem' }} onClick={() => setEditando(true)}>
            AÑADIR DIRECCIÓN
          </button>
        </div>
      )}
    </PerfilLayout>
  );
}
