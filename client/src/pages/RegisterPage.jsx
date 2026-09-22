import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { authService } from '../services/authService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { UserPlus, AlertCircle, ArrowRight, Building2, User, ShieldAlert, Mail, CheckCircle2, RefreshCw } from 'lucide-react';

import {
  validateFullName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateAge,
  getPasswordCriteria,
} from '../utils/inputValidator';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    password: '',
    confirmPassword: '',
    userType: 'CUSTOMER', // 'CUSTOMER' (Normal user) | 'BUSINESS' (Store / Business user)
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email verification flow states
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const passwordCriteria = getPasswordCriteria(formData.password);

  const handleBlur = (field) => {
    let err = '';
    if (field === 'name') err = validateFullName(formData.name);
    if (field === 'email') err = validateEmail(formData.email);
    if (field === 'age') err = validateAge(formData.age);
    if (field === 'password') err = validatePassword(formData.password);
    if (field === 'confirmPassword')
      err = validateConfirmPassword(formData.password, formData.confirmPassword);

    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nameErr = validateFullName(formData.name);
    const emailErr = validateEmail(formData.email);
    const ageErr = validateAge(formData.age);
    const passErr = validatePassword(formData.password);
    const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);

    const errors = {
      name: nameErr,
      email: emailErr,
      age: ageErr,
      password: passErr,
      confirmPassword: confirmErr,
    };

    setFieldErrors(errors);

    if (nameErr || emailErr || ageErr || passErr || confirmErr) {
      setError('Please resolve all validation errors before proceeding.');
      return;
    }

    setLoading(true);

    try {
      const email = formData.email.toLowerCase().trim();
      await register({
        name: formData.name.trim(),
        email,
        age: Number(formData.age),
        password: formData.password,
        userType: formData.userType,
      });

      setSubmittedEmail(email);
      setIsVerificationPending(true);
      showSuccess(
        'Registration successful! Please check your email inbox to verify your account.',
        'Verification Email Sent'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!submittedEmail || resending || resendCooldown > 0) return;
    setResending(true);
    try {
      await authService.resendVerification(submittedEmail);
      showSuccess('Verification email resent. Please check your inbox.', 'Email Sent');
      setResendCooldown(60);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  if (isVerificationPending) {
    return (
      <div>
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs mb-3">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Verify Your Email
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            We’ve sent a verification link to{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{submittedEmail}</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              Verification Required to Continue
            </p>
            <p className="text-[11.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              To prevent spam and keep accounts authentic, you must verify your email address to proceed. Click the link in your email to continue directly to onboarding to verify your KYC and details.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={resending || resendCooldown > 0}
            onClick={handleResendVerification}
            className="w-full"
          >
            {resending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Mail className="h-4 w-4 mr-1.5" />
            )}
            <span>
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : 'Resend Verification Email'}
            </span>
          </Button>

          <div className="pt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsVerificationPending(false);
                setError('');
              }}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 cursor-pointer"
            >
              ← Edit details
            </button>
            <Link
              to={ROUTES.LOGIN}
              className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              Go to Sign In →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create Account
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Sign up with your verified details to begin workspace setup
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {/* Account Type Selector: Normal User vs Business */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Choose Account Type
          </label>
          <div className="grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, userType: 'CUSTOMER' })}
              className={`flex flex-col items-center justify-center text-center py-3 px-2.5 rounded-xl transition-all ${
                formData.userType === 'CUSTOMER'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white border border-black/5 dark:border-white/10'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <User className="h-4 w-4 shrink-0" />
                <span>Normal User</span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                Customer & Purchases
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, userType: 'BUSINESS' })}
              className={`flex flex-col items-center justify-center text-center py-3 px-2.5 rounded-xl transition-all ${
                formData.userType === 'BUSINESS'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white border border-black/5 dark:border-white/10'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Business</span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                Store, POS & Inventory
              </span>
            </button>
          </div>

          {formData.userType === 'BUSINESS' ? (
            <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  Mandatory Verification Required
                </p>
                <p className="text-[10.5px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                  Business accounts require immediate completion of 2 mandatory steps right after account creation:
                  <br />
                  <span className="font-semibold">Step 1:</span> Verify official address (applied across the app)
                  <br />
                  <span className="font-semibold">Step 2:</span> Upload government-issued KYC details
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 px-1">
              Personal customer account: view your purchase invoices, track store credits, and manage your account.
            </p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <Input
            label="Full Name (First & Last Name)"
            id="name"
            type="text"
            placeholder="e.g. Ram Bahadur Thapa"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
            }}
            onBlur={() => handleBlur('name')}
            error={fieldErrors.name}
          />
        </div>

        {/* Email */}
        <div>
          <Input
            label="Valid Email Address"
            id="email"
            type="email"
            placeholder="name@company.com"
            required
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
            }}
            onBlur={() => handleBlur('email')}
            error={fieldErrors.email}
          />
        </div>

        {/* Age */}
        <div>
          <Input
            label="Age (Years, 16 - 120)"
            id="age"
            type="number"
            min="16"
            max="120"
            placeholder="e.g. 25"
            required
            value={formData.age}
            onChange={(e) => {
              setFormData({ ...formData, age: e.target.value });
              if (fieldErrors.age) setFieldErrors({ ...fieldErrors, age: '' });
            }}
            onBlur={() => handleBlur('age')}
            error={fieldErrors.age}
          />
        </div>

        {/* Password */}
        <div>
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            required
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
            }}
            onBlur={() => handleBlur('password')}
            error={fieldErrors.password}
          />
          {formData.password && (
            <div className="mt-2 grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-[11px]">
              <span className={`flex items-center gap-1 ${passwordCriteria.minLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                <CheckCircle2 className="h-3 w-3 shrink-0" /> 8-128 characters
              </span>
              <span className={`flex items-center gap-1 ${passwordCriteria.hasUpper && passwordCriteria.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Upper & lowercase
              </span>
              <span className={`flex items-center gap-1 ${passwordCriteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                <CheckCircle2 className="h-3 w-3 shrink-0" /> One number (0-9)
              </span>
              <span className={`flex items-center gap-1 ${passwordCriteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Special symbol (!@#$)
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <Input
            label="Confirm Password"
            id="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            required
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (fieldErrors.confirmPassword)
                setFieldErrors({ ...fieldErrors, confirmPassword: '' });
            }}
            onBlur={() => handleBlur('confirmPassword')}
            error={fieldErrors.confirmPassword}
          />
        </div>

        <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          <span>
            {formData.userType === 'BUSINESS'
              ? 'Create Business Account & Verify Address'
              : 'Create Account & Continue'}
          </span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Already registered?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
