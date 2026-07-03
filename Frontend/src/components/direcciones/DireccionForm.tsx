import { useState, useRef } from 'react';
import type { GuardarDireccionDTO, Direccion, ProvinciaCodigo } from '../../types';
import { PROVINCIAS } from '../../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface Sugerencia {
  place_name: string;
  center: [number, number];
  context?: { id: string; text: string }[];
  text: string;
  address?: string;
}

interface Props {
  inicial: Direccion | null;
  onGuardar: (dto: GuardarDireccionDTO) => Promise<void>;
  guardando: boolean;
  onCancelar: () => void;
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Resolución best-effort del nombre de provincia devuelto por Mapbox al código
// de una letra que exige Correo Argentino. El usuario siempre puede corregirlo
// manualmente en el selector si el mapeo no coincide.
function resolverCodigoProvincia(nombreMapbox: string): ProvinciaCodigo | '' {
  const n = normalizar(nombreMapbox);
  if (n.includes('ciudad autonoma') || n.includes('caba') || n.includes('capital federal')) return 'C';
  const match = PROVINCIAS.find(p => n.includes(normalizar(p.nombre)));
  return match?.codigo ?? '';
}

function formDesde(d: Direccion | null): GuardarDireccionDTO {
  return {
    calle:            d?.calle            ?? '',
    altura:           d?.altura           ?? '',
    piso:             d?.piso             ?? '',
    depto:            d?.depto            ?? '',
    ciudad:           d?.ciudad           ?? '',
    provincia:        d?.provincia        ?? '',
    provincia_codigo: d?.provincia_codigo ?? ('' as ProvinciaCodigo),
    pais:             d?.pais             ?? 'Argentina',
    codigo_postal:    d?.codigo_postal    ?? '',
    lat:              d?.lat              ?? null,
    lng:              d?.lng              ?? null,
  };
}

export function DireccionForm({ inicial, onGuardar, guardando, onCancelar }: Props) {
  const [form, setForm] = useState<GuardarDireccionDTO>(formDesde(inicial));
  const [busqueda, setBusqueda] = useState(inicial?.calle ?? '');
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [mostrarSug, setMostrarSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function buscarMapbox(q: string) {
    if (q.length < 3) { setSugerencias([]); return; }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
      + `?access_token=${MAPBOX_TOKEN}&country=AR&language=es&types=address&limit=5`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      setSugerencias(json.features ?? []);
      setMostrarSug(true);
    } catch { /* silencioso */ }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setBusqueda(val);
    setForm(f => ({ ...f, calle: val, lat: null, lng: null }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarMapbox(val), 350);
  }

  function seleccionarSugerencia(sug: Sugerencia) {
    const ctx = sug.context ?? [];
    const ciudad          = ctx.find(c => c.id.startsWith('place'))?.text    ?? '';
    const provinciaNombre = ctx.find(c => c.id.startsWith('region'))?.text   ?? '';
    const codigo_postal   = ctx.find(c => c.id.startsWith('postcode'))?.text ?? '';

    setBusqueda(sug.text);
    setSugerencias([]);
    setMostrarSug(false);
    setForm(f => ({
      ...f,
      calle:            sug.text,
      altura:           sug.address ?? f.altura,
      ciudad:           ciudad,
      provincia:        provinciaNombre,
      provincia_codigo: resolverCodigoProvincia(provinciaNombre) || f.provincia_codigo,
      codigo_postal:    codigo_postal || null,
      lat:              sug.center[1],
      lng:              sug.center[0],
    }));
  }

  const puedeGuardar =
    !!form.calle?.trim() &&
    !!form.altura?.trim() &&
    !!form.ciudad?.trim() &&
    !!form.provincia_codigo;

  return (
    <div className="dir-form">
      {/* Autocomplete de calle */}
      <div className="dir-campo dir-campo--full">
        <label>Calle</label>
        <div className="dir-autocomplete">
          <input
            type="text"
            placeholder=""
            value={busqueda}
            onChange={handleInputChange}
            onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
            onBlur={() => setTimeout(() => setMostrarSug(false), 150)}
          />
          {mostrarSug && sugerencias.length > 0 && (
            <ul className="dir-autocomplete__lista">
              {sugerencias.map((s, i) => (
                <li key={i}>
                  <button className="dir-autocomplete__item" onMouseDown={() => seleccionarSugerencia(s)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {s.place_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Altura / piso / depto */}
      <div className="dir-grid">
        <div className="dir-campo">
          <label>Altura</label>
          <input
            type="text"
            value={form.altura}
            onChange={e => setForm(f => ({ ...f, altura: e.target.value }))}
            placeholder=""
          />
        </div>
        <div className="dir-campo">
          <label>Piso (opcional)</label>
          <input
            type="text"
            value={form.piso ?? ''}
            onChange={e => setForm(f => ({ ...f, piso: e.target.value || null }))}
            placeholder=""
          />
        </div>
        <div className="dir-campo">
          <label>Depto (opcional)</label>
          <input
            type="text"
            value={form.depto ?? ''}
            onChange={e => setForm(f => ({ ...f, depto: e.target.value || null }))}
            placeholder=""
          />
        </div>
      </div>

      {/* Campos detalles */}
      <div className="dir-grid">
        <div className="dir-campo">
          <label>Ciudad</label>
          <input
            type="text"
            value={form.ciudad}
            onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
            placeholder=""
          />
        </div>
        <div className="dir-campo">
          <label>Provincia</label>
          <select
            value={form.provincia_codigo}
            onChange={e => {
              const codigo = e.target.value as ProvinciaCodigo;
              const nombre = PROVINCIAS.find(p => p.codigo === codigo)?.nombre ?? '';
              setForm(f => ({ ...f, provincia_codigo: codigo, provincia: nombre }));
            }}
          >
            <option value="">Elegí tu provincia</option>
            {PROVINCIAS.map(p => (
              <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="dir-campo">
          <label>País</label>
          <input
            type="text"
            value={form.pais}
            onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}
          />
        </div>
        <div className="dir-campo">
          <label>Código postal</label>
          <input
            type="text"
            value={form.codigo_postal ?? ''}
            onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value || null }))}
            placeholder=""
          />
        </div>
      </div>

      <div className="dir-acciones">
        <button className="btn btn--ghost" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button
          className="btn btn--primary"
          onClick={() => onGuardar(form)}
          disabled={guardando || !puedeGuardar}
        >
          {guardando ? 'Guardando...' : 'GUARDAR DIRECCIÓN'}
        </button>
      </div>
    </div>
  );
}
