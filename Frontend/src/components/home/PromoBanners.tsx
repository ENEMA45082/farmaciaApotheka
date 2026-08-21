import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBannersPromo } from '../../api/bannersPromo.api';
import type { BannerPromo } from '../../types';

export function PromoBanners() {
  const [banners, setBanners] = useState<BannerPromo[]>([]);

  useEffect(() => {
    fetchBannersPromo().then(setBanners).catch(() => setBanners([]));
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="promo-banners">
      {banners.map((banner, i) => {
        const contenido = (
          <>
            <div className="promo-banner-card__contenido">
              {banner.vigencia_texto && (
                <span className="promo-banner-card__vigencia">{banner.vigencia_texto}</span>
              )}
              <h3 className="promo-banner-card__titulo">{banner.titulo}</h3>
              {banner.link_url && <span className="promo-banner-card__boton">Ver más</span>}
            </div>
            <div className="promo-banner-card__imagen-wrap">
              {banner.badge_texto && (
                <span className="promo-banner-card__badge">{banner.badge_texto}</span>
              )}
              <img
                src={banner.imagen_url}
                alt={banner.titulo}
                className="promo-banner-card__imagen"
                loading="lazy"
              />
            </div>
          </>
        );

        const claseCard = `promo-banner-card promo-banner-card--${banner.tema}${i === 0 ? ' promo-banner-card--full' : ''}`;

        return banner.link_url ? (
          <Link key={banner.id} to={banner.link_url} className={claseCard}>
            {contenido}
          </Link>
        ) : (
          <div key={banner.id} className={claseCard}>
            {contenido}
          </div>
        );
      })}
    </div>
  );
}
