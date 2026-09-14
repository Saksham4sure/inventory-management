import { Outlet } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export const AuthLayout = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm sm:max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs mb-3">
            <QrCode className="h-5 w-5 text-emerald-400 dark:text-emerald-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            StockPulse
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Minimal, modern QR-tracked inventory management
          </p>
        </div>

        {/* Auth form card */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
export default AuthLayout;
