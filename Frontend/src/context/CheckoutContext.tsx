import { createContext, useContext, useState, type ReactNode } from 'react';
import type { MetodoEnvio, SucursalAndreani, Direccion } from '../types';

interface CheckoutContextType {
  metodo:               MetodoEnvio;
  costoEnvio:           number;
  diasEstimados:        string;
  sucursalSeleccionada: SucursalAndreani | null;
  codigoPostal:         string;
  direccion:            Direccion | null;
  setMetodo:               (m: MetodoEnvio) => void;
  setCostoEnvio:           (c: number) => void;
  setDiasEstimados:        (d: string) => void;
  setSucursalSeleccionada: (s: SucursalAndreani | null) => void;
  setCodigoPostal:         (cp: string) => void;
  setDireccion:            (d: Direccion | null) => void;
  resetCheckout:           () => void;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [metodo,               setMetodo]               = useState<MetodoEnvio>('retiro_farmacia');
  const [costoEnvio,           setCostoEnvio]           = useState(0);
  const [diasEstimados,        setDiasEstimados]        = useState('');
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<SucursalAndreani | null>(null);
  const [codigoPostal,         setCodigoPostal]         = useState('');
  const [direccion,            setDireccion]            = useState<Direccion | null>(null);

  function resetCheckout() {
    setMetodo('retiro_farmacia');
    setCostoEnvio(0);
    setDiasEstimados('');
    setSucursalSeleccionada(null);
    setCodigoPostal('');
  }

  return (
    <CheckoutContext.Provider value={{
      metodo, costoEnvio, diasEstimados, sucursalSeleccionada, codigoPostal, direccion,
      setMetodo, setCostoEnvio, setDiasEstimados, setSucursalSeleccionada, setCodigoPostal,
      setDireccion, resetCheckout,
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
