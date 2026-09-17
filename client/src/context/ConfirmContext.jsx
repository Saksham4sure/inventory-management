import { useState, useRef, useCallback } from 'react';
import { ConfirmContext } from './confirm-context';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const ConfirmProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    isAlert: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : options || {};
      const isDanger = opts.variant === 'danger' || !opts.variant;

      setDialogState({
        isOpen: true,
        title: opts.title || (isDanger ? 'Confirm Deletion' : 'Confirm Action'),
        message: opts.message || 'Are you sure you want to proceed?',
        confirmText: opts.confirmText || (isDanger ? 'Delete' : 'Confirm'),
        cancelText: opts.cancelText || 'Cancel',
        variant: opts.variant || 'danger',
        isAlert: false,
      });
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : options || {};

      setDialogState({
        isOpen: true,
        title: opts.title || 'Notice',
        message: opts.message || '',
        confirmText: opts.buttonText || opts.confirmText || 'OK',
        cancelText: 'Cancel',
        variant: opts.variant || 'warning',
        isAlert: true,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        isAlert={dialogState.isAlert}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
