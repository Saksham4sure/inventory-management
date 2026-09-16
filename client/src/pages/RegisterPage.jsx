import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { UserPlus, AlertCircle, ArrowRight } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [skipBusiness, setSkipBusiness] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (skipBusiness) {
        navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        navigate(ROUTES.BUSINESS_SETUP, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create Account
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Sign up to access your personal workspace and inventory
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name"
          id="name"
          type="text"
          placeholder="e.g. Alex Mercer"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <Input
          label="Work Email"
          id="email"
          type="email"
          placeholder="name@company.com"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          label="Password"
          id="password"
          type="password"
          placeholder="Min. 6 characters"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />

        <Input
          label="Confirm Password"
          id="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          required
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        />

        {/* Skip business creation option */}
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={skipBusiness}
            onChange={(e) => setSkipBusiness(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 accent-emerald-500"
          />
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Skip business profile setup for now (configure later)
          </span>
        </label>

        <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
          {skipBusiness ? (
            <>
              Create Account & Go to Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Create Account & Setup Business
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Already registered?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};
export default RegisterPage;
