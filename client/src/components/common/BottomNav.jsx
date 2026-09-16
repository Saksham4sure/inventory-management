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
    { label: 'Scan QR', path: ROUTES.SCAN, icon: ScanLine, isPrimary: true },
    { label: 'Sales', path: ROUTES.SALES, icon: TrendingUp },
    { label: 'Purchases', path: ROUTES.PURCHASES, icon: ShoppingCart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-[#151821]/90 backdrop-blur-xl transition-colors px-3 pt-2 pb-5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_28px_rgba(0,0,0,0.4)]">
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
                <div className="flex h-13 w-13 items-center justify-center rounded-[20px] bg-purple-600 text-white shadow-[0_4px_16px_rgba(168,85,247,0.3)] ring-4 ring-[#F4F5F7] dark:ring-[#0f1117] border border-purple-400/30">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
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
                `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-85 ${
                  isActive
                    ? 'text-zinc-900 dark:text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="h-4.5 w-4.5" />
                    {isActive && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                    )}
                  </div>
                  <span className="text-[10px] mt-2 tracking-tight font-medium">
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
