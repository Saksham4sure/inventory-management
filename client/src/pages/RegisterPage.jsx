import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { UserPlus, AlertCircle, Calendar, ArrowRight, Building2, User } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess } = useSnackbar();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
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

  const validatePhone = (phone) => {
    if (!phone || !phone.trim()) return 'Contact phone number is required';
    const clean = phone.replace(/[\s()-]/g, '');
    const regex = /^[0-9+]{7,15}$/;
    if (!regex.test(clean)) {
      return 'Please enter a valid contact phone number (e.g. 9801234567 or +977-98...)';
    }
    return '';
  };

  const validateDob = (dob) => {
    if (!dob) return 'Date of birth is required';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return 'Please enter a valid date of birth';
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (birthDate > today) {
      return 'Date of birth cannot be in the future';
    }
    if (age < 16) {
      return 'You must be at least 16 years old to create an account';
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
    if (field === 'phone') err = validatePhone(formData.phone);
    if (field === 'dob') err = validateDob(formData.dob);
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
    const phoneErr = validatePhone(formData.phone);
    const dobErr = validateDob(formData.dob);
    const passErr = validatePassword(formData.password);
    const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);

    const errors = {
      name: nameErr,
      email: emailErr,
      phone: phoneErr,
      dob: dobErr,
      password: passErr,
      confirmPassword: confirmErr,
    };

    setFieldErrors(errors);

    if (nameErr || emailErr || phoneErr || dobErr || passErr || confirmErr) {
      setError('Please resolve all validation errors before proceeding.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        dob: formData.dob,
        password: formData.password,
        userType: formData.userType,
      });

      showSuccess(
        'Account created successfully! Please upload your identity document for KYC verification.',
        'Welcome to StockPulse'
      );

      // Redirect user directly to the KYC document upload onboarding wizard
      navigate(ROUTES.ONBOARDING, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Compute maximum allowed DOB date string (today's date)
  const maxDobDate = new Date().toISOString().split('T')[0];

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
        {/* Account Type Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            I am registering as
          </label>
          <div className="grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, userType: 'CUSTOMER' })}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                formData.userType === 'CUSTOMER'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white border border-black/5 dark:border-white/10'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <User className="h-4 w-4 shrink-0" />
              <span>Normal Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, userType: 'BUSINESS' })}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                formData.userType === 'BUSINESS'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white border border-black/5 dark:border-white/10'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Business Owner</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 px-1">
            {formData.userType === 'CUSTOMER'
              ? 'View what you bought, track left-to-pay credits, and manage your customer identity.'
              : 'Set up store/warehouse, manage inventory catalog, POS scan checkout, and track ledger.'}
          </p>
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

        {/* Phone Number & Date of Birth (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Contact Phone */}
          <div>
            <Input
              label="Contact Phone Number"
              id="phone"
              type="tel"
              placeholder="e.g. 9801234567"
              required
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
              }}
              onBlur={() => handleBlur('phone')}
              error={fieldErrors.phone}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <DatePicker
              label="Date of Birth (DOB)"
              id="dob"
              maxDate={maxDobDate}
              required
              value={formData.dob}
              onChange={(e) => {
                setFormData({ ...formData, dob: e.target.value });
                if (fieldErrors.dob) setFieldErrors({ ...fieldErrors, dob: '' });
              }}
              error={fieldErrors.dob}
              helperText="Must be at least 16 years old"
            />
          </div>
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
          <span>Create Account & Continue to Profile</span>
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
