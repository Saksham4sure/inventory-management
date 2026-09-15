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
    { label: 'Scan POS', path: ROUTES.SCAN, icon: ScanLine, isPrimary: true },
    { label: 'Sales', path: ROUTES.SALES, icon: TrendingUp },
    { label: 'Purchases', path: ROUTES.PURCHASES, icon: ShoppingCart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-xl transition-colors px-3 pt-2 pb-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.isPrimary) {
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center -mt-6 transition-all duration-200 active:scale-90 ${
                    isActive ? 'scale-105' : ''
                  }`
                }
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md ring-4 ring-zinc-100/80 dark:ring-black">
                  <Icon className="h-5 w-5 text-emerald-400 dark:text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
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
                `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-90 ${
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
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1.5 tracking-tight font-medium">
                    {tab.label}
                  </span>
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
