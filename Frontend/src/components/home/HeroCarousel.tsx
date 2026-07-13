import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { carouselFadeVariants } from '../ui/motion';

interface Slide {
  src: string;
  alt: string;
  href?: string;
}

// Editar acá para cambiar fotos, textos alternativos o el link de cada slide.
// Las 5 imagenes deben pesar y medir lo mismo (1600x600px, JPG) para que el
// carrusel no salte de alto al cambiar de foto.
const SLIDES: Slide[] = [
  { src: '/carousel/promo-1.png', alt: 'Equilibra tus emociones', href: '/ofertas' },
  { src: '/carousel/promo-2.png', alt: 'Julio hasta 50% off', href: '/ofertas' },
];

const INTERVALO_MS = 5000;

export function HeroCarousel() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || SLIDES.length <= 1) return;
    const id = setInterval(() => {
      setIndice(i => (i + 1) % SLIDES.length);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [pausado]);

  const irA = (i: number) => setIndice(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);

  const slide = SLIDES[indice];
  const imagen = (
    <img
      src={slide.src}
      alt={slide.alt}
      className="hero-carousel__img"
      width={1600}
      height={600}
    />
  );

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={indice}
          className="hero-carousel__slide"
          variants={carouselFadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {slide.href ? <Link to={slide.href}>{imagen}</Link> : imagen}
        </motion.div>
      </AnimatePresence>

      {SLIDES.length > 1 && (
        <>
          <button
            type="button"
            className="hero-carousel__arrow hero-carousel__arrow--prev"
            aria-label="Foto anterior"
            onClick={() => irA(indice - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-carousel__arrow hero-carousel__arrow--next"
            aria-label="Foto siguiente"
            onClick={() => irA(indice + 1)}
          >
            ›
          </button>

          <div className="hero-carousel__dots">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                type="button"
                className={`hero-carousel__dot${i === indice ? ' hero-carousel__dot--activo' : ''}`}
                aria-label={`Ir a la foto ${i + 1}`}
                aria-current={i === indice}
                onClick={() => irA(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
