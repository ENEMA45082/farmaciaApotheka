interface Props {
  message: string;
  onClose: () => void;
}

export function ErrorModal({ message, onClose }: Props) {
  return (
    <div className="error-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="error-modal" onClick={e => e.stopPropagation()}>
        <div className="error-modal__header">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="error-modal__header-title">Ocurrió un error</span>
          <button className="error-modal__close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="error-modal__body">
          <p className="error-modal__message">{message}</p>
        </div>
        <div className="error-modal__footer">
          <button className="btn btn--primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
