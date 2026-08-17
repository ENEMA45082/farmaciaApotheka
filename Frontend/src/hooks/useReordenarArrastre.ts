import { useState } from 'react';

interface ItemOrdenable {
  id: string;
  orden: number;
}

// Reordenamiento por drag-and-drop para tablas admin con columna "Orden"
// (banners, banners promocionales, productos destacados). Con solo ▲▼ mover
// un ítem del final al principio implica un click por cada posición del
// medio; arrastrar lo deja directo donde se suelta.
export function useReordenarArrastre<T extends ItemOrdenable>(
  items: T[],
  actualizarOrden: (id: string, orden: number) => Promise<unknown>,
  onReordenado: () => void,
  onError: (mensaje: string) => void
) {
  const [indiceArrastrado, setIndiceArrastrado] = useState<number | null>(null);
  const [indiceSobreArrastre, setIndiceSobreArrastre] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setIndiceArrastrado(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (indiceArrastrado !== null && index !== indiceSobreArrastre) {
      setIndiceSobreArrastre(index);
    }
  }

  function handleDragEnd() {
    setIndiceArrastrado(null);
    setIndiceSobreArrastre(null);
  }

  async function handleDrop(index: number) {
    const origen = indiceArrastrado;
    setIndiceArrastrado(null);
    setIndiceSobreArrastre(null);
    if (origen === null || origen === index) return;

    const reordenado = [...items];
    const [movido] = reordenado.splice(origen, 1);
    reordenado.splice(index, 0, movido);

    // Renumera todo secuencialmente y solo persiste lo que efectivamente
    // cambió de posición (evita mandar N-1 PUTs por cada arrastre).
    const cambios = reordenado
      .map((item, i) => ({ id: item.id, ordenAnterior: item.orden, ordenNuevo: i }))
      .filter(c => c.ordenAnterior !== c.ordenNuevo);

    if (cambios.length === 0) return;

    try {
      await Promise.all(cambios.map(c => actualizarOrden(c.id, c.ordenNuevo)));
      onReordenado();
    } catch {
      onError('No se pudo reordenar. Intentá de nuevo.');
    }
  }

  return { indiceArrastrado, indiceSobreArrastre, handleDragStart, handleDragOver, handleDragEnd, handleDrop };
}
