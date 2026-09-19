import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { UserPlus, AlertCircle, ArrowRight, Building2, User, ShieldAlert } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess } = useSnackbar();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'CUSTOMER', // 'CUSTOMER' (Normal user) | 'BUSINESS' (Store / Business user)
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateFullName = (name) => {
    if (!name || !name.trim()) return 'Full name is required';
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const regex = /^[a-zA-Z\s.'-]+$/;
    if (!regex.test(trimmed)) {
      return 'Name should contain letters, spaces, hyphens, or periods only';
    }
    if (parts.length < 2) {
      return 'Please enter your full name (both first and last name)';
    }
    if (trimmed.length < 3) {
      return 'Full name must be at least 3 characters long';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email || !email.trim()) return 'Email address is required';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email.trim())) {
      return 'Please enter a valid email address (e.g. name@company.com)';
    }
    return '';
  };

  const validatePassword = (pass) => {
    if (!pass) return 'Password is required';
    if (pass.length < 6) return 'Password must be at least 6 characters long';
    return '';
  };

  const validateConfirmPassword = (pass, confirm) => {
    if (!confirm) return 'Please re-enter your password';
    if (pass !== confirm) return 'Passwords do not match';
    return '';
  };

  const handleBlur = (field) => {
    let err = '';
    if (field === 'name') err = validateFullName(formData.name);
    if (field === 'email') err = validateEmail(formData.email);
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
    const passErr = validatePassword(formData.password);
    const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);

    const errors = {
      name: nameErr,
      email: emailErr,
      password: passErr,
      confirmPassword: confirmErr,
    };

    setFieldErrors(errors);

    if (nameErr || emailErr || passErr || confirmErr) {
      setError('Please resolve all validation errors before proceeding.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        userType: formData.userType,
      });

      if (formData.userType === 'CUSTOMER') {
        showSuccess(
          'Account created successfully! Welcome to StockPulse.',
          'Account Created'
        );
        navigate(ROUTES.CUSTOMER_PURCHASES, { replace: true });
      } else {
        showSuccess(
          'Business account created! Please complete mandatory address verification and KYC upload to proceed.',
          'Mandatory Verification Required'
        );
        navigate(ROUTES.ONBOARDING, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

        {/* Password */}
        <div>
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="Min. 6 characters"
            required
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
            }}
            onBlur={() => handleBlur('password')}
            error={fieldErrors.password}
          />
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
