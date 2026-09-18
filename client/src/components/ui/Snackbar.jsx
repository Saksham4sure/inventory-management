import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const SnackbarItem = ({ snackbar, onDismiss }) => {
  const { id, type = 'info', message, title } = snackbar;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
        return 'border-rose-500/30 dark:border-rose-500/30';
      case 'success':
        return 'border-emerald-500/30 dark:border-emerald-500/20';
      case 'warning':
        return 'border-amber-500/30 dark:border-amber-500/20';
      default:
        return 'border-zinc-200 dark:border-zinc-800';
    }
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181b22]/95 border ${getBorderColor()} shadow-xl dark:shadow-2xl shadow-zinc-950/5 dark:shadow-black/50 backdrop-blur-xl transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4`}
    >
      <div className="pt-0.5">{getIcon()}</div>

      <div className="flex-1 min-w-0 pr-1">
        {title && (
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-0.5">
            {title}
          </p>
        )}
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="p-1 -mr-1 -mt-0.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const SnackbarContainer = ({ snackbars, onDismiss }) => {
  if (!snackbars || snackbars.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full pointer-events-none"
    >
      {snackbars.map((s) => (
        <SnackbarItem key={s.id} snackbar={s} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
};
