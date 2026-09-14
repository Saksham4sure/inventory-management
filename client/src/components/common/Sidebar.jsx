import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  QrCode,
  ArrowLeftRight,
  ScanLine,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const Sidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Products & Stock', path: ROUTES.PRODUCTS, icon: Boxes },
    { label: 'Scan & Track QR', path: ROUTES.SCAN, icon: ScanLine, highlight: true },
    { label: 'Transactions', path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand header */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">StockPulse</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              QR System
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100/60'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-200/60 text-indigo-900">
                    Live
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Subscription note footer info */}
      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100/60">
        <p className="text-xs font-semibold text-slate-800">Subscription Tier</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
          Standard business trial active. QR generation & tracking enabled.
        </p>
      </div>
    </aside>
  );
};
