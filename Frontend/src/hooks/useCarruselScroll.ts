import { useCallback, useEffect, useRef, useState } from 'react';

export function useCarruselScroll(dep: unknown) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(true);

  const actualizarFlechas = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setPuedeIzq(track.scrollLeft > 4);
    setPuedeDer(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => { actualizarFlechas(); }, [dep, actualizarFlechas]);

  useEffect(() => {
    window.addEventListener('resize', actualizarFlechas);
    return () => window.removeEventListener('resize', actualizarFlechas);
  }, [actualizarFlechas]);

  function desplazar(direccion: 1 | -1) {
    trackRef.current?.scrollBy({ left: direccion * trackRef.current.clientWidth * 0.85, behavior: 'smooth' });
  }

  return { trackRef, puedeIzq, puedeDer, actualizarFlechas, desplazar };
}
