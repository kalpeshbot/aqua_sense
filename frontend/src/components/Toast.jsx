import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  // Listen for custom toast events from DataContext
  useEffect(() => {
    const handler = (e) => {
      addToast(e.detail.message, e.detail.type);
    };
    window.addEventListener('aquasense-toast', handler);
    return () => window.removeEventListener('aquasense-toast', handler);
  }, [addToast]);

  const colors = {
    success: 'bg-success text-black',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-black',
    info: 'bg-accent text-white',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${colors[t.type]} transition-all`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
