import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export const BottomNav = () => {
  const tabs = [
    { label: 'Overview', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Products', path: ROUTES.PRODUCTS, icon: Boxes },
    { label: 'Scan & POS', path: ROUTES.SCAN, icon: ScanLine, isPrimary: true },
    { label: 'Sales', path: ROUTES.SALES, icon: TrendingUp },
    { label: 'Purchases', path: ROUTES.PURCHASES, icon: ShoppingCart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-zinc-200/80 bg-white/95 backdrop-blur-lg dark:border-zinc-800/80 dark:bg-zinc-950/95 transition-colors px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.isPrimary) {
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center -mt-5 transition-transform active:scale-95 ${
                    isActive ? 'scale-105' : ''
                  }`
                }
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md border-2 border-white dark:border-zinc-950">
                  <Icon className="h-5 w-5 text-emerald-400 dark:text-emerald-600" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {tab.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
export default BottomNav;
