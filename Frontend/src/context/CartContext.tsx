import { createContext, useContext, useState } from 'react';
import { useCarrito } from '../hooks/useCarrito';
import type { EstadoCarrito, Producto } from '../types';

interface ContextoCarrito extends EstadoCarrito {
  abierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  agregarItem: (producto: Producto, cantidad?: number) => void;
  quitarItem: (productoId: string) => void;
  actualizarCantidad: (productoId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
}

const CarritoContext = createContext<ContextoCarrito | null>(null);

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const carrito = useCarrito();
  const [abierto, setAbierto] = useState(false);

  return (
    <CarritoContext.Provider
      value={{
        ...carrito,
        abierto,
        abrirCarrito:  () => setAbierto(true),
        cerrarCarrito: () => setAbierto(false),
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarritoContext(): ContextoCarrito {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error('useCarritoContext debe usarse dentro de <CarritoProvider>');
  return ctx;
}
