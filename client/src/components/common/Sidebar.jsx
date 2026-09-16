import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  ScanLine,
  QrCode,
  X,
  ShieldCheck,
  TrendingUp,
  ShoppingCart,
  Building2,
  User,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const Sidebar = ({ isMobileOpen, onClose }) => {
  const mainNavItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Products & Stock', path: ROUTES.PRODUCTS, icon: Boxes },
    { label: 'Scan & Register', path: ROUTES.SCAN, icon: ScanLine, highlight: true },
    { label: 'Sales & Returns', path: ROUTES.SALES, icon: TrendingUp },
    { label: 'Purchases & Stock In', path: ROUTES.PURCHASES, icon: ShoppingCart },
    { label: 'Full Audit Trail', path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  ];

  const profileNavItems = [
    { label: 'Business Profile', path: ROUTES.BUSINESS_PROFILE, icon: Building2 },
    { label: 'User Profile', path: ROUTES.PROFILE, icon: User },
  ];

  const renderNavList = (items) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={({ isActive }) =>
            `group flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] ${
              isActive
                ? 'bg-zinc-900 text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] dark:bg-white dark:text-zinc-950 dark:shadow-[0_4px_16px_rgba(255,255,255,0.15)] font-semibold'
                : item.highlight
                ? 'text-purple-700 bg-purple-500/10 hover:bg-purple-500/18 dark:text-purple-300 dark:bg-purple-500/12 dark:hover:bg-purple-500/22 border border-purple-500/20'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'text-white dark:text-zinc-950'
                      : item.highlight
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.highlight && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                  Scan
                </span>
              )}
            </>
          )}
        </NavLink>
      );
    });

  const content = (
    <div className="flex flex-col justify-between h-full bg-white/80 dark:bg-[#12141a]/90 backdrop-blur-xl p-4 select-none overflow-y-auto">
      <div>
        {/* Brand header */}
        <div className="flex h-12 items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 text-white shadow-[0_2px_10px_rgba(168,85,247,0.3)]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-md tracking-tight text-zinc-900 dark:text-zinc-100">
                  StockPulse
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.7)]" />
              </div>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation sections */}
        <div className="space-y-4">
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Operations
            </p>
            {renderNavList(mainNavItems)}
          </nav>

          <nav className="space-y-1 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Account & Settings
            </p>
            {renderNavList(profileNavItems)}
          </nav>
        </div>
      </div>

      {/* Subscription info badge card */}
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#181b22]/70 p-4 shadow-2xs backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Pro Engine Active
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
          High-performance QR generation, camera scanning, and stock metrics active.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-black/[0.06] dark:border-white/[0.08] flex-col h-screen sticky top-0 transition-colors">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl border-r border-black/[0.06] dark:border-white/[0.08] animate-in slide-in-from-left duration-250 ease-out">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
export default Sidebar;
