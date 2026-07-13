import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchBanners } from '../../api/banners.api';
import type { Banner } from '../../types';
import { carouselFadeVariants } from '../ui/motion';

const INTERVALO_MS = 5000;

export function HeroCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    fetchBanners().then(setBanners).catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (pausado || banners.length <= 1) return;
    const id = setInterval(() => {
      setIndice(i => (i + 1) % banners.length);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [pausado, banners.length]);

  if (banners.length === 0) return null;

  const irA = (i: number) => setIndice(((i % banners.length) + banners.length) % banners.length);

  const banner = banners[indice];
  const imagen = (
    <img
      src={banner.imagen_url}
      alt={banner.alt_texto}
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
          key={banner.id}
          className="hero-carousel__slide"
          variants={carouselFadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {banner.link_url ? <Link to={banner.link_url}>{imagen}</Link> : imagen}
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
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
            {banners.map((b, i) => (
              <button
                key={b.id}
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
