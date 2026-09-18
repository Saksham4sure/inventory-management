import { createContext, useState, useCallback, useRef, useEffect } from 'react';
import { SnackbarContainer } from '../components/ui/Snackbar';

export const SnackbarContext = createContext(null);

export const SnackbarProvider = ({ children }) => {
  const [snackbars, setSnackbars] = useState([]);
  const timersRef = useRef(new Map());

  const removeSnackbar = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setSnackbars((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const showSnackbar = useCallback(
    ({ message, title, type = 'info', duration = 4000 }) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newSnackbar = { id, message, title, type, duration };

      setSnackbars((prev) => [...prev.slice(-4), newSnackbar]); // keep maximum 5 active

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeSnackbar(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeSnackbar]
  );

  const showSuccess = useCallback(
    (message, title, duration = 4000) => {
      return showSnackbar({ message, title, type: 'success', duration });
    },
    [showSnackbar]
  );

  const showError = useCallback(
    (message, title, duration = 5000) => {
      return showSnackbar({ message, title, type: 'error', duration });
    },
    [showSnackbar]
  );

  const showWarning = useCallback(
    (message, title, duration = 4500) => {
      return showSnackbar({ message, title, type: 'warning', duration });
    },
    [showSnackbar]
  );

  const showInfo = useCallback(
    (message, title, duration = 4000) => {
      return showSnackbar({ message, title, type: 'info', duration });
    },
    [showSnackbar]
  );

  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <SnackbarContext.Provider
      value={{
        showSnackbar,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeSnackbar,
      }}
    >
      {children}
      <SnackbarContainer snackbars={snackbars} onDismiss={removeSnackbar} />
    </SnackbarContext.Provider>
  );
};
