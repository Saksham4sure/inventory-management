import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { authService } from '../services/authService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { LogIn, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showError, showSuccess } = useSnackbar();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

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
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      if (
        msg.toLowerCase().includes('verify') ||
        err.response?.data?.data?.requiresEmailVerification ||
        err.response?.status === 403
      ) {
        setUnverifiedEmail(err.response?.data?.data?.email || formData.email);
        showError(msg);
      } else {
        showError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await authService.resendVerification(unverifiedEmail);
      setResendDone(true);
      showSuccess('Verification email resent. Please check your inbox.', 'Email Sent');
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
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

      {unverifiedEmail && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-950 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Email Verification Required</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
            Your email is not verified yet. To prevent spam, please click the link in your email to proceed to onboarding.
          </p>
          {resendDone ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>New verification link dispatched to your inbox!</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-semibold text-amber-900 dark:text-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>
          )}
        </div>
      )}

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
