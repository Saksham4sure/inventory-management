import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'primary' | 'warning' | 'alert'
  onConfirm,
  onCancel,
  isAlert = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-full bg-rose-500/12 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 mx-auto mb-3 flex items-center justify-center ring-4 ring-rose-500/5 animate-ios-icon">
          <Trash2 className="w-5 h-5" />
        </div>
      );
    }
    if (variant === 'warning') {
      return (
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mx-auto mb-3 flex items-center justify-center ring-4 ring-black/[0.04] dark:ring-white/[0.06] animate-ios-icon">
          <AlertCircle className="w-5 h-5" />
        </div>
      );
    }
    if (variant === 'primary') {
      return (
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mx-auto mb-3 flex items-center justify-center ring-4 ring-black/[0.04] dark:ring-white/[0.06] animate-ios-icon">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mx-auto mb-3 flex items-center justify-center ring-4 ring-black/[0.04] dark:ring-white/[0.06] animate-ios-icon">
        <HelpCircle className="w-5 h-5" />
      </div>
    );
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/65 backdrop-blur-md animate-ios-backdrop"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative w-full max-w-[310px] rounded-[22px] bg-white/90 dark:bg-[#1e2026]/90 backdrop-blur-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.12] overflow-hidden select-none animate-ios-alert"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Alert Content */}
        <div className="pt-6 pb-5 px-5 text-center">
          {getIcon()}
          <h3
            id="confirm-dialog-title"
            className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-center"
          >
            {title}
          </h3>
          <p
            id="confirm-dialog-message"
            className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 text-center mt-1.5 px-1 font-normal"
          >
            {message}
          </p>
        </div>

        {/* iOS System Alert Actions (Horizontal Split) */}
        <div className="border-t border-black/[0.08] dark:border-white/[0.1]">
          {isAlert ? (
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3.5 text-[16px] font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-black/[0.035] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.98] transition-all duration-150 focus:outline-none select-none"
            >
              {confirmText || 'OK'}
            </button>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-black/[0.08] dark:divide-white/[0.1]">
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3.5 text-[16px] font-normal text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.035] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.98] transition-all duration-150 focus:outline-none select-none"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`w-full py-3.5 text-[16px] font-semibold transition-all duration-150 focus:outline-none hover:bg-black/[0.035] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.98] select-none ${
                  variant === 'danger'
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialog, document.body)
    : dialog;
};

export default ConfirmDialog;
