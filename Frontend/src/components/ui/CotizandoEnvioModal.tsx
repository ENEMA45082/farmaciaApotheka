export function CotizandoEnvioModal() {
  return (
    <div className="cotizando-modal-overlay" role="alertdialog" aria-modal="true" aria-live="polite">
      <div className="cotizando-modal">
        <div className="spinner" />
        <p className="cotizando-modal__titulo">Estamos cotizando tu envío</p>
        <p className="cotizando-modal__texto">Por favor, aguardá unos segundos…</p>
      </div>
    </div>
  );
}
