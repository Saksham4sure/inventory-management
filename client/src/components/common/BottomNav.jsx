import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  TrendingUp,
  ShoppingCart,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const BottomNav = () => {
  const { user } = useAuth();
  const isKycVerified = user?.role === 'SUPER_ADMIN' || user?.kyc?.status === 'VERIFIED';

  const tabs = [
    { label: 'Overview', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Products', path: ROUTES.PRODUCTS, icon: Boxes },
    { label: 'Scan QR', path: ROUTES.SCAN, icon: ScanLine, isPrimary: true },
    { label: 'Sales', path: ROUTES.SALES, icon: TrendingUp, requiresKyc: true },
    { label: 'Purchases', path: ROUTES.PURCHASES, icon: ShoppingCart, requiresKyc: true },
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
                <div className="flex h-13 w-13 items-center justify-center rounded-[20px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-md ring-4 ring-[#F4F5F7] dark:ring-[#0f1117] border border-black/10 dark:border-white/10 font-bold">
                  <Icon className="h-6 w-6 stroke-[2.2]" />
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
                    {tab.requiresKyc && !isKycVerified && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                        <Lock className="h-1.5 w-1.5" />
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
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
