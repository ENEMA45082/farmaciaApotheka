import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { errorBus } from '../utils/errorBus';
import { ErrorModal } from '../components/ui/ErrorModal';

interface ErrorModalContextValue {
  showError: (msg: string) => void;
}

const ErrorModalContext = createContext<ErrorModalContextValue | null>(null);

export function ErrorModalProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    errorBus.setHandler(setMessage);
    return () => { errorBus.setHandler(() => {}); };
  }, []);

  return (
    <ErrorModalContext.Provider value={{ showError: setMessage }}>
      {children}
      {message !== null && (
        <ErrorModal message={message} onClose={() => setMessage(null)} />
      )}
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  const ctx = useContext(ErrorModalContext);
  if (!ctx) throw new Error('useErrorModal debe usarse dentro de ErrorModalProvider');
  return ctx;
}
