import { useState, useEffect, useCallback } from 'react';
import type { ItemCarrito, EstadoCarrito, Producto } from '../types';
import { precioEfectivo } from '../types';

const CLAVE_CARRITO = 'apotheka_carrito';

function cargarCarrito(): ItemCarrito[] {
  try {
    const raw = localStorage.getItem(CLAVE_CARRITO);
    return raw ? (JSON.parse(raw) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

function calcularEstado(items: ItemCarrito[]): EstadoCarrito {
  return {
    items,
    totalItems:    items.reduce((sum, i) => sum + i.cantidad, 0),
    totalPrecio:   items.reduce((sum, i) => sum + precioEfectivo(i.producto) * i.cantidad, 0),
    subtotalLista: items.reduce((sum, i) => sum + i.producto.precio * i.cantidad, 0),
  };
}

export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>(cargarCarrito);

  useEffect(() => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
  }, [items]);

  const agregarItem = useCallback((producto: Producto, cantidad = 1) => {
    if (!producto.en_stock) return;
    setItems(prev => {
      const existente = prev.find(i => i.producto.id === producto.id);
      if (existente) {
        return prev.map(i =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i
        );
      }
      return [...prev, { producto, cantidad }];
    });
  }, []);

  const quitarItem = useCallback((productoId: string) => {
    setItems(prev => prev.filter(i => i.producto.id !== productoId));
  }, []);

  const actualizarCantidad = useCallback((productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(prev => prev.filter(i => i.producto.id !== productoId));
    } else {
      setItems(prev =>
        prev.map(i =>
          i.producto.id === productoId
            ? { ...i, cantidad }
            : i
        )
      );
    }
  }, []);

  const vaciarCarrito = useCallback(() => setItems([]), []);

  return { ...calcularEstado(items), agregarItem, quitarItem, actualizarCantidad, vaciarCarrito };
}
