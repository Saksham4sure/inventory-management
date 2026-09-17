import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-zinc-950/45 dark:bg-zinc-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-ios-backdrop"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-t-[32px] sm:rounded-[26px] border-t sm:border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181b22]/95 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl ring-1 ring-white/60 dark:ring-white/[0.06] text-zinc-900 dark:text-zinc-100 animate-ios-sheet sm:animate-ios-alert max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="block sm:hidden w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto -mt-1 mb-4" />

        <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.05] dark:border-white/[0.08]">
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all duration-200 hover:rotate-90 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
export default Modal;
