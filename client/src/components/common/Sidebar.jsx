import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  ScanLine,
  QrCode,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const Sidebar = ({ isMobileOpen, onClose }) => {
  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Products & Stock', path: ROUTES.PRODUCTS, icon: Boxes },
    { label: 'Scan & Track QR', path: ROUTES.SCAN, icon: ScanLine, highlight: true },
    { label: 'Transactions', path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  ];

  const content = (
    <div className="flex flex-col justify-between h-full bg-zinc-50/60 dark:bg-zinc-950 p-4 select-none">
      <div>
        {/* Brand header */}
        <div className="flex h-12 items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                  StockPulse
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                Inventory & QR OS
              </span>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950'
                      : item.highlight
                      ? 'text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/15 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-500/20'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    Live
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Subscription info badge card */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
            Active Tenant Tier
          </p>
        </div>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          Standard tier active. Full QR generation, audit trails, and stock operations unlocked.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-zinc-200/80 dark:border-zinc-800/80 flex-col h-screen sticky top-0 transition-colors">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl border-r border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
export default Sidebar;
