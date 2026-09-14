import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LogOut, Building2, Menu } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const { business } = useBusiness();

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
          className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>

        {business ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-200/60 dark:border-zinc-700/60">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs sm:text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                  {business.name}
                </span>
                <Badge variant="accent" size="sm" dot>
                  {business.subscription?.plan?.replace('_', ' ') || 'Free Trial'}
                </Badge>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                {business.category || 'Inventory Store'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold tracking-tight text-zinc-500">
            StockPulse QR
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dynamic Light/Dark Mode Switcher */}
        <ThemeToggle />

        {/* User profile capsule */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 text-right">
          <div className="flex flex-col text-right leading-tight">
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{user?.name}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{user?.email}</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200/80 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900/50 transition-colors active:scale-95"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
export default Navbar;
