const MEDIOS_PAGO = [
  { id: 'visa', render: () => <span className="medios-pago__visa">VISA</span> },
  { id: 'mastercard', render: () => <span className="medios-pago__mastercard">Mastercard</span> },
  { id: 'amex', render: () => <span className="medios-pago__amex">AMEX</span> },
  { id: 'mercadopago', render: () => <span className="medios-pago__mercadopago">Mercado Pago</span> },
  {
    id: 'paypal',
    render: () => (
      <span className="medios-pago__paypal">
        <span className="medios-pago__paypal-pay">Pay</span>
        <span className="medios-pago__paypal-pal">Pal</span>
      </span>
    ),
  },
  { id: 'naranjax', render: () => <span className="medios-pago__naranjax">NaranjaX</span> },
];

// 4 copias (no 2): con la lista contenida a ~1200px, una sola copia de estos
// 6 logos es más angosta que el contenedor, así que con solo 2 copias se ve
// un hueco en blanco antes de que la segunda copia complete la pantalla.
// El track anima de 0% a -25% (un cuarto del ancho total = una copia),
// dando el loop infinito sin salto ni hueco.
const REPETICIONES = 4;
const ITEMS = Array.from({ length: REPETICIONES }, () => MEDIOS_PAGO).flat();

export function MediosDePago() {
  return (
    <div className="medios-pago">
      <p className="medios-pago__titulo">medios de pago</p>
      <div className="medios-pago__mascara">
        <div className="medios-pago__track">
          {ITEMS.map((medio, i) => (
            <div className="medios-pago__item" key={`${medio.id}-${i}`}>
              {medio.render()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
