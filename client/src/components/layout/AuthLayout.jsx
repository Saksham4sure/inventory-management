import { Outlet } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export const AuthLayout = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F4F5F7] dark:bg-[#0f1117] p-4 transition-colors duration-300">
      {/* Ambient Light Glow Layer */}
      <div className="app-ambient-glow" />

      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DBFE80] text-zinc-950 shadow-[0_2px_14px_rgba(219,254,128,0.3)] ring-4 ring-[#DBFE80]/20 mb-3.5">
            <QrCode className="h-6 w-6 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            StockPulse
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Minimal modern inventory & QR management
          </p>
        </div>

        {/* Auth form frosted glass card */}
        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#181b22]/75 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.4)] ring-1 ring-white/80 dark:ring-white/[0.05] transition-all">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
export default AuthLayout;
