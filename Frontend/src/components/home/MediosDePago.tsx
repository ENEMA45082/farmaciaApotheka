const PROMOS_PAGO = [
  { id: 'visa', archivo: '/pagos/visa-promo.png', alt: 'Visa: miércoles y sábados, 3 cuotas sin interés' },
  { id: 'mastercard', archivo: '/pagos/mastercard-promo.png', alt: 'Mastercard: miércoles y sábados, 3 cuotas sin interés' },
  { id: 'mercadopago', archivo: '/pagos/mercadopago-promo.png', alt: 'Mercado Pago: pagos con QR, rápido y seguro' },
  { id: 'modo', archivo: '/pagos/modo-promo.png', alt: 'MODO: conectá tus bancos' },
];

// 8 copias: solo 4 imágenes, cada una bastante ancha (tarjetas promocionales,
// no íconos chicos), así que una sola copia de la lista no alcanza a cubrir
// el contenedor. Con 8 copias sobra margen para cualquier ancho de pantalla
// razonable. El track anima de 0% a -12.5% (1/8 del ancho total = una copia).
const REPETICIONES = 8;
const ITEMS = Array.from({ length: REPETICIONES }, () => PROMOS_PAGO).flat();

export function MediosDePago() {
  return (
    <div className="medios-pago">
      <p className="medios-pago__titulo">medios de pago</p>
      <div className="medios-pago__mascara">
        <div className="medios-pago__track">
          {ITEMS.map((promo, i) => (
            <div className="medios-pago__item" key={`${promo.id}-${i}`}>
              <img src={promo.archivo} alt={promo.alt} className="medios-pago__img" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
