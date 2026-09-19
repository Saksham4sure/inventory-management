import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showError } = useSnackbar();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(formData);
      if (data.user?.role === 'SUPER_ADMIN') {
        navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      } else if (data.user?.userType === 'CUSTOMER') {
        navigate(ROUTES.CUSTOMER_PURCHASES, { replace: true });
      } else {
        // Business user
        const hasAddress = Boolean(
          data.user?.location?.formattedAddress && data.user.location.formattedAddress.trim()
        );
        const hasKyc = Boolean(
          data.user?.kyc?.documentNumber &&
          data.user?.kyc?.frontImage &&
          data.user?.kyc?.backImage &&
          data.user?.kyc?.status &&
          data.user?.kyc?.status !== 'NOT_SUBMITTED' &&
          data.user?.kyc?.status !== 'REJECTED'
        );
        if (!hasAddress || !hasKyc) {
          navigate(ROUTES.ONBOARDING, { replace: true });
        } else if (data.hasBusiness) {
          const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
          navigate(from, { replace: true });
        } else {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }
      }
    } catch (err) {
      showError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Sign In
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Access your inventory workspace and QR scanner
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email or Username"
          id="email"
          type="text"
          placeholder="admin or name@company.com"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          label="Password"
          id="password"
          type="password"
          placeholder="••••••••"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />

        <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
          <LogIn className="h-3.5 w-3.5 mr-1" /> Continue to Workspace
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        New to StockPulse?{' '}
        <Link
          to={ROUTES.REGISTER}
          className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
};
export default LoginPage;
