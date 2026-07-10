import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toastBus } from '../utils/toastBus';
import { Toast } from '../components/ui/Toast';

interface ToastContextValue {
  showToast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 2500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    toastBus.setHandler(setMessage);
    return () => { toastBus.setHandler(() => {}); };
  }, []);

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(() => setMessage(null), DURACION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <ToastContext.Provider value={{ showToast: setMessage }}>
      {children}
      <AnimatePresence>
        {message !== null && <Toast key={message} message={message} />}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
