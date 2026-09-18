import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { ShieldAlert, Lock, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export const PlatformAdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ username, password });
      if (data.user?.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. This account does not possess Platform Administrator privileges.');
      }
      const from = location.state?.from?.pathname || ROUTES.ADMIN_DASHBOARD;
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Platform administrator authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = () => {
    setUsername('admin');
    setPassword('password');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 p-4 text-zinc-100 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-3">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 mb-1">
            Restricted Clearance
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">Platform Administrator</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Direct console access for multi-tenant businesses, global user base, and dynamic subscription controls.
          </p>
        </div>

        {/* Notice helper pill for testing */}
        <div className="mb-5 rounded-xl bg-indigo-950/50 border border-indigo-800/40 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <div className="text-[11px] text-zinc-300">
              Dev Credentials: <code className="font-mono text-indigo-300 bg-indigo-900/40 px-1 py-0.5 rounded">admin</code> / <code className="font-mono text-indigo-300 bg-indigo-900/40 px-1 py-0.5 rounded">password</code>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutofill}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline shrink-0 cursor-pointer ml-2"
          >
            Autofill
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/50 p-3 text-xs text-rose-300 border border-rose-800/50">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Administrator Username / Email
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700/80 px-3.5 py-2.5 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700/80 px-3.5 py-2.5 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-2.5 text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Authorize & Enter Console</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            ← Return to standard workspace login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlatformAdminLoginPage;
