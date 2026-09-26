import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { Building2, Menu } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ROUTES } from '../../constants/routes';

export const Navbar = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const isNormalUser = user?.userType === 'CUSTOMER' || (!user?.businessId && user?.role === 'USER');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#12141a]/85 px-4 sm:px-6 backdrop-blur-xl transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.03] text-zinc-700 hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.1] transition-all duration-200 active:scale-90"
        >
          <Menu className="h-4 w-4" />
        </button>

        {business ? (
          <Link
            to={`${ROUTES.PROFILE}?tab=business`}
            title="Manage Business Profile"
            className="flex items-center gap-2.5 p-1 -m-1 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 font-bold border border-black/[0.06] dark:border-white/[0.08] shadow-2xs">
              <Building2 className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                  {business.name}
                </span>
                <Badge variant="primary" size="sm" dot>
                  {business.subscription?.plan?.replace('_', ' ') || 'Pro Plan'}
                </Badge>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                {business.category || 'Inventory Store'}
              </span>
            </div>
          </Link>
        ) : isNormalUser ? (
          <Link
            to={ROUTES.CUSTOMER_PURCHASES}
            title="StockPulse"
            className="flex items-center gap-2 text-xs font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 hover:opacity-80 transition-opacity"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            StockPulse
          </Link>
        ) : (
          <Link
            to={`${ROUTES.PROFILE}?tab=business`}
            title="Set up Business Profile"
            className="flex items-center gap-2 text-xs font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 hover:opacity-80 transition-opacity"
          >
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            StockPulse
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal underline ml-1">
              (Setup Business)
            </span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dynamic Theme Switcher */}
        <ThemeToggle />

        {/* Notifications Bell for Admin & Every User */}
        <NotificationBell />

        {/* User profile capsule */}
        <Link
          to={`${ROUTES.PROFILE}?tab=personal`}
          title="Manage User Profile"
          className="hidden sm:flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-md hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-all active:scale-[0.98]"
        >
          <div className="flex flex-col text-right leading-tight pl-2">
            <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[120px] truncate">
              {user?.email || ''}
            </span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs shadow-2xs overflow-hidden">
            {user?.profilePicture || user?.avatar ? (
              <img
                src={user.profilePicture || user.avatar}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : user?.name ? (
              user.name[0].toUpperCase()
            ) : (
              'U'
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};
export default Navbar;
