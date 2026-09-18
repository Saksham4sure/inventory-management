import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationBell } from '../common/NotificationBell';
import {
  ShieldAlert,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Server,
  Zap,
} from 'lucide-react';

export const PlatformAdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.ADMIN_LOGIN);
  };

  const navItems = [
    {
      label: 'Overview & Metrics',
      path: ROUTES.ADMIN_DASHBOARD,
      icon: LayoutDashboard,
      description: 'System-wide telemetry',
    },
    {
      label: 'Businesses & Tenants',
      path: ROUTES.ADMIN_BUSINESSES,
      icon: Building2,
      description: 'Manage businesses & plans',
    },
    {
      label: 'Platform Users',
      path: ROUTES.ADMIN_USERS,
      icon: Users,
      description: 'Global accounts & security',
    },
    {
      label: 'Subscription Tiers',
      path: ROUTES.ADMIN_SUBSCRIPTIONS,
      icon: CreditCard,
      description: 'Dynamic 3 tiers & trial system',
    },
    {
      label: 'Platform Settings',
      path: ROUTES.ADMIN_SETTINGS,
      icon: Settings,
      description: 'Maintenance & global rules',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 bg-zinc-950 text-zinc-200 border-r border-zinc-800/80">
      <div>
        {/* Brand */}
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white font-mono">StockPulse</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                  ROOT
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Platform Super Admin</p>
            </div>
          </div>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-zinc-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Live status badge */}
        <div className="mb-6 rounded-xl bg-zinc-900/90 border border-zinc-800 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-zinc-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Platform Core
            </span>
            <span className="text-[10px] font-mono text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Active
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <Server className="h-3 w-3 text-zinc-400" /> Multi-Tenant System
          </p>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-2 font-mono">
            Administration
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-zinc-400 group-hover:text-indigo-400'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="leading-tight">{item.label}</span>
                      <span
                        className={`text-[10px] leading-tight ${
                          isActive ? 'text-indigo-200' : 'text-zinc-400'
                        }`}
                      >
                        {item.description}
                      </span>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="pt-4 border-t border-zinc-800/80 space-y-3">
        <NavLink
          to={ROUTES.DASHBOARD}
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            Switch to Tenant App
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">/app</span>
        </NavLink>

        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
              A
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-zinc-200">{user?.username || 'admin'}</span>
              <span className="text-[10px] text-zinc-400">Super Admin</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out of Admin"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 h-full">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Admin Top Header */}
        <header className="h-16 shrink-0 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500"></div>
              <span className="font-semibold text-xs sm:text-sm tracking-tight">
                Platform Administration Console
              </span>
              <span className="hidden sm:inline-block rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                Super Admin Protected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>Node API 200 OK</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformAdminLayout;
