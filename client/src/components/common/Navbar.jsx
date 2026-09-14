import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { LogOut, Building2, User, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { business } = useBusiness();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {business && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{business.name}</span>
                <Badge variant="primary" size="sm">
                  <Sparkles className="h-3 w-3 inline text-indigo-500 mr-1" />
                  {business.subscription?.plan || 'Free Trial'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">{business.category || 'Inventory Store'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-right">
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-xs shadow-sm">
            {user?.name ? user.name[0].toUpperCase() : <User className="h-4 w-4" />}
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
