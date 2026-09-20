import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ROUTES } from '../constants/routes';
import { CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token. Please use the link sent to your email.');
      return;
    }

    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    const verify = async () => {
      try {
        const data = await authService.verifyEmail(token);
        setStatus('success');
        setAuthSession(data.user, data.token, data.hasBusiness);
        showSuccess('Email verified successfully! Welcome to StockPulse.', 'Email Verified');

        // Redirect to onboarding so they can complete address & KYC
        setTimeout(() => {
          navigate(ROUTES.ONBOARDING, { replace: true });
        }, 1800);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.message ||
            err.message ||
            'The verification link is invalid or has expired.'
        );
      }
    };

    verify();
  }, [token, setAuthSession, showSuccess, navigate]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      showError('Please enter your email address.');
      return;
    }

    setResending(true);
    try {
      await authService.resendVerification(resendEmail.trim());
      setResendSuccess(true);
      showSuccess('A fresh verification link has been sent to your email.', 'Email Sent');
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full">
      {status === 'loading' && (
        <div className="py-8 flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Verifying Your Email
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Please wait while we validate your email address and authenticate your account...
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 mb-2">
              Email Verified
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Email Confirmed Successfully!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-sm">
              Your account email is verified. Redirecting you to complete your identity onboarding and mandatory KYC setup...
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full mt-2"
            onClick={() => navigate(ROUTES.ONBOARDING, { replace: true })}
          >
            <span>Proceed to Onboarding</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="py-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Verification Failed
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                {errorMessage}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
            Verification links expire after 24 hours to keep accounts secure and prevent spam. You can request a fresh verification link below:
          </div>

          {resendSuccess ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>A new verification link has been sent to your email. Please check your inbox!</span>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-3">
              <Input
                label="Your Registered Email"
                id="resend-email"
                type="email"
                placeholder="name@company.com"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <Button type="submit" variant="primary" loading={resending} className="w-full">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                <span>Resend Verification Link</span>
              </Button>
            </form>
          )}

          <div className="pt-2 text-center">
            <Link
              to={ROUTES.LOGIN}
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyEmailPage;
