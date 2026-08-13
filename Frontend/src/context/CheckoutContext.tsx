import { createContext, useContext, useState, type ReactNode } from 'react';
import type { MetodoEnvio, TipoServicioEnvio, SucursalCorreoArgentino, Direccion } from '../types';

interface CheckoutContextType {
  metodo:               MetodoEnvio;
  costoEnvio:           number;
  diasEstimados:        string;
  tipoServicioEnvio:    TipoServicioEnvio | null;
  sucursalSeleccionada: SucursalCorreoArgentino | null;
  provinciaCodigo:      string;
  direccion:            Direccion | null;
  destinatarioNombre:   string;
  destinatarioDni:      string;
  destinatarioCodArea:  string;
  destinatarioTelefono: string;
  setMetodo:               (m: MetodoEnvio) => void;
  setCostoEnvio:           (c: number) => void;
  setDiasEstimados:        (d: string) => void;
  setTipoServicioEnvio:    (t: TipoServicioEnvio | null) => void;
  setSucursalSeleccionada: (s: SucursalCorreoArgentino | null) => void;
  setProvinciaCodigo:      (p: string) => void;
  setDireccion:            (d: Direccion | null) => void;
  setDestinatarioNombre:   (v: string) => void;
  setDestinatarioDni:      (v: string) => void;
  setDestinatarioCodArea:  (v: string) => void;
  setDestinatarioTelefono: (v: string) => void;
  resetCheckout:           () => void;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [metodo,               setMetodo]               = useState<MetodoEnvio>('retiro_farmacia');
  const [costoEnvio,           setCostoEnvio]           = useState(0);
  const [diasEstimados,        setDiasEstimados]        = useState('');
  const [tipoServicioEnvio,    setTipoServicioEnvio]    = useState<TipoServicioEnvio | null>(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<SucursalCorreoArgentino | null>(null);
  const [provinciaCodigo,      setProvinciaCodigo]      = useState('');
  const [direccion,            setDireccion]            = useState<Direccion | null>(null);
  const [destinatarioNombre,   setDestinatarioNombre]   = useState('');
  const [destinatarioDni,      setDestinatarioDni]      = useState('');
  const [destinatarioCodArea,  setDestinatarioCodArea]  = useState('');
  const [destinatarioTelefono, setDestinatarioTelefono] = useState('');

  function resetCheckout() {
    setMetodo('retiro_farmacia');
    setCostoEnvio(0);
    setDiasEstimados('');
    setTipoServicioEnvio(null);
    setSucursalSeleccionada(null);
    setProvinciaCodigo('');
    setDestinatarioNombre('');
    setDestinatarioDni('');
    setDestinatarioCodArea('');
    setDestinatarioTelefono('');
  }

  return (
    <CheckoutContext.Provider value={{
      metodo, costoEnvio, diasEstimados, tipoServicioEnvio, sucursalSeleccionada, provinciaCodigo, direccion,
      destinatarioNombre, destinatarioDni, destinatarioCodArea, destinatarioTelefono,
      setMetodo, setCostoEnvio, setDiasEstimados, setTipoServicioEnvio, setSucursalSeleccionada, setProvinciaCodigo,
      setDireccion, setDestinatarioNombre, setDestinatarioDni, setDestinatarioCodArea,
      setDestinatarioTelefono, resetCheckout,
    }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout debe usarse dentro de CheckoutProvider');
  return ctx;
}
