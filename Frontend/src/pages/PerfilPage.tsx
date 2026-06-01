import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPerfil, actualizarPerfil } from '../api/perfil.api';
import { PerfilLayout } from '../components/layout/PerfilLayout';
import type { ActualizarPerfilDTO } from '../types';

const FORM_VACIO: ActualizarPerfilDTO = {
  nombre: '',
  apellido: '',
  dni: '',
  genero: '',
  fecha_nacimiento: '',
  telefono: '',
};

export function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<ActualizarPerfilDTO>(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [errores, setErrores] = useState<{ nombre?: string; apellido?: string; dni?: string; telefono?: string }>({});

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchPerfil()
      .then(p => setForm({
        nombre:           p.nombre ?? '',
        apellido:         p.apellido ?? '',
        dni:              p.dni ?? '',
        genero:           p.genero ?? '',
        fecha_nacimiento: p.fecha_nacimiento ?? '',
        telefono:         p.telefono ?? '',
      }))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [user]);

  async function handleGuardar() {
    const nuevosErrores: typeof errores = {};
    if (!form.nombre?.trim())             nuevosErrores.nombre   = 'El nombre es obligatorio';
    if (!form.apellido?.trim())           nuevosErrores.apellido = 'El apellido es obligatorio';
    if (!form.dni?.trim())                nuevosErrores.dni      = 'El DNI es obligatorio';
    else if (/\D/.test(form.dni))         nuevosErrores.dni      = 'El DNI debe contener solo números';
    if (form.telefono?.trim() && /\D/.test(form.telefono)) nuevosErrores.telefono = 'El teléfono debe contener solo números';
    if (Object.keys(nuevosErrores).length > 0) { setErrores(nuevosErrores); return; }

    setErrores({});
    setGuardando(true);
    setMensaje(null);
    try {
      const dto: ActualizarPerfilDTO = {};
      if (form.nombre)           dto.nombre           = form.nombre;
      if (form.apellido)         dto.apellido         = form.apellido;
      if (form.dni)              dto.dni              = form.dni;
      if (form.genero)           dto.genero           = form.genero;
      if (form.fecha_nacimiento) dto.fecha_nacimiento = form.fecha_nacimiento;
      if (form.telefono)         dto.telefono         = form.telefono;
      await actualizarPerfil(dto);
      setEditando(false);
      setMensaje({ tipo: 'ok', texto: 'Datos guardados correctamente.' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar. Intentá de nuevo.' });
    } finally {
      setGuardando(false);
    }
  }

  if (!authLoading && !user) return null;
  if (authLoading || cargando) return <PerfilLayout><div className="perfil-loading">Cargando...</div></PerfilLayout>;
  if (!user) return null;

  return (
    <PerfilLayout>
      <h2 className="perfil-titulo">Perfil</h2>

      {mensaje && (
        <p className={`perfil-mensaje perfil-mensaje--${mensaje.tipo}`}>{mensaje.texto}</p>
      )}

      <div className="perfil-form">
        <div className="perfil-grid">
          <div className="perfil-campo">
            <label>Nombre</label>
            <input
              type="text"
              value={form.nombre}
              disabled={!editando}
              onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setErrores(er => ({ ...er, nombre: undefined })); }}
            />
            {errores.nombre && <span className="perfil-campo__error">{errores.nombre}</span>}
          </div>
          <div className="perfil-campo">
            <label>Apellido</label>
            <input
              type="text"
              value={form.apellido}
              disabled={!editando}
              onChange={e => { setForm(f => ({ ...f, apellido: e.target.value })); setErrores(er => ({ ...er, apellido: undefined })); }}
            />
            {errores.apellido && <span className="perfil-campo__error">{errores.apellido}</span>}
          </div>
          <div className="perfil-campo perfil-campo--full">
            <label>Email</label>
            <input type="email" value={user.email ?? ''} disabled />
          </div>
          <div className="perfil-campo">
            <label>DNI</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.dni}
              disabled={!editando}
              onChange={e => {
                const soloNumeros = e.target.value.replace(/\D/g, '');
                setForm(f => ({ ...f, dni: soloNumeros }));
                setErrores(er => ({ ...er, dni: undefined }));
              }}
            />
            {errores.dni && <span className="perfil-campo__error">{errores.dni}</span>}
          </div>
          <div className="perfil-campo">
            <label>Género</label>
            <select
              value={form.genero}
              disabled={!editando}
              onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}
            >
              <option value="">— Seleccionar —</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="no_declara">Prefiero no decir</option>
            </select>
          </div>
          <div className="perfil-campo">
            <label>Fecha de nacimiento</label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              disabled={!editando}
              onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
            />
          </div>
          <div className="perfil-campo">
            <label>Teléfono</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.telefono}
              disabled={!editando}
              onChange={e => {
                const soloNumeros = e.target.value.replace(/\D/g, '');
                setForm(f => ({ ...f, telefono: soloNumeros }));
                setErrores(er => ({ ...er, telefono: undefined }));
              }}
            />
            {errores.telefono && <span className="perfil-campo__error">{errores.telefono}</span>}
          </div>
        </div>

        <div className="perfil-acciones">
          {editando ? (
            <>
              <button className="btn btn--ghost" onClick={() => { setEditando(false); setErrores({}); }} disabled={guardando}>
                Cancelar
              </button>
              <button className="btn btn--primary perfil-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'GUARDAR'}
              </button>
            </>
          ) : (
            <button className="btn btn--primary perfil-btn-guardar" onClick={() => { setMensaje(null); setEditando(true); }}>
              EDITAR
            </button>
          )}
        </div>
      </div>
    </PerfilLayout>
  );
}
