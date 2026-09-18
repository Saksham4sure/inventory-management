import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBusiness } from '../hooks/useBusiness';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LocationSelect } from '../components/ui/LocationSelect';
import { formatDate } from '../utils/formatters';
import { useSnackbar } from '../hooks/useSnackbar';
import {
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Trash2,
  Building2,
  Calendar,
  Eye,
  MapPin,
  Phone,
  Mail,
  FileCheck2,
  ExternalLink,
  Clock,
} from 'lucide-react';

const formatDobForInput = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const formatBirthDate = (dateVal) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

const calculateAge = (dateVal) => {
  if (!dateVal) return null;
  try {
    const birth = new Date(dateVal);
    if (isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch {
    return null;
  }
};

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { business } = useBusiness();
  const { showSuccess, showError } = useSnackbar();

  // Profile details state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(formatDobForInput(user?.dob));
  const [locationState, setLocationState] = useState(user?.location || {});

  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // KYC Upload state (for users who have not uploaded citizenship or driving license)
  const [kycDocType, setKycDocType] = useState('CITIZENSHIP'); // CITIZENSHIP | DRIVING_LICENSE
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [kycFrontImage, setKycFrontImage] = useState('');
  const [kycBackImage, setKycBackImage] = useState('');
  const [kycLoading, setKycLoading] = useState(false);

  // Lightbox preview modal for KYC documents
  const [previewImage, setPreviewImage] = useState(null);

  // Sync state whenever user changes
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
      if (user.dob) setDob(formatDobForInput(user.dob));
      if (user.location) setLocationState(user.location);
    }
  }, [user]);

  // Max DOB allowed (must be at least 16 years old)
  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d.toISOString().split('T')[0];
  }, []);

  // Whether user already has verified/uploaded KYC documents
  const hasKyc = Boolean(
    user?.kyc?.frontImage &&
    user?.kyc?.backImage &&
    (user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING')
  );

  // Handle KYC image upload (convert to Base64)
  const handleImageFileSelect = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Document image size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (side === 'front') {
        setKycFrontImage(reader.result);
      } else {
        setKycBackImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit KYC (Citizenship or Driving License)
  const handleUploadKyc = async (e) => {
    e.preventDefault();

    if (!kycDocNumber.trim()) {
      showError(
        `Please enter your ${kycDocType === 'CITIZENSHIP' ? 'Citizenship' : 'Driving License'} number.`
      );
      return;
    }

    if (!kycFrontImage) {
      showError('Please upload the front side photo of your document.');
      return;
    }

    if (!kycBackImage) {
      showError('Please upload the back side photo of your document.');
      return;
    }

    try {
      setKycLoading(true);
      const res = await authService.uploadKyc({
        documentType: kycDocType,
        documentNumber: kycDocNumber.trim(),
        frontImage: kycFrontImage,
        backImage: kycBackImage,
      });

      if (res?.user) {
        updateUser(res.user);
      }
      showSuccess(
        'Identity document submitted for verification! Platform Compliance team will review your documents.'
      );
      setKycFrontImage('');
      setKycBackImage('');
      setKycDocNumber('');
    } catch (err) {
      showError(err.message || 'Failed to submit identity document');
    } finally {
      setKycLoading(false);
    }
  };

  // Submit Profile Changes (Name, Phone, DOB, Address)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Full name is required');
      return;
    }

    try {
      setProfileLoading(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        dob: dob || null,
        location: locationState,
      };

      const res = await authService.updateProfile(payload);
      if (res?.user) {
        updateUser(res.user);
      }
      showSuccess('Profile details and address updated successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      showError('Current password is required');
      return;
    }

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      await authService.updateProfile({
        name: user?.name || name,
        currentPassword,
        newPassword,
      });
      showSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const calculatedAge = calculateAge(user?.dob || dob);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          User Profile & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your verified credentials, government identity document, residential address, and security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Account Summary & Overview */}
        <div className="lg:col-span-4 space-y-5">
          {/* Main User Card */}
          <Card className="text-center p-6 flex flex-col items-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-2xl shadow-md ring-4 ring-black/[0.04] dark:ring-white/[0.06] mb-3.5">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              {hasKyc && (
                <span
                  title="Identity Document Verified"
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-zinc-900 shadow"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
            </div>

            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {user?.name || 'User'}
            </h2>

            {/* Email with Immutable lock */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              <Lock className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>{user?.email}</span>
            </div>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Badge variant="accent" dot>
                {user?.role || 'OWNER'}
              </Badge>
              {hasKyc ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  KYC Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                  <ShieldAlert className="h-3 w-3" />
                  KYC Pending
                </span>
              )}
            </div>

            {/* Detailed Account Spec Table */}
            <div className="w-full mt-6 pt-5 border-t border-black/[0.05] dark:border-white/[0.08] text-left space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between items-center">
                <span>Account ID</span>
                <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {user?._id ? user._id.slice(-8) : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Date of Birth</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {user?.dob ? formatBirthDate(user.dob) : 'Not specified'}
                </span>
              </div>

              {calculatedAge !== null && (
                <div className="flex justify-between items-center">
                  <span>Age</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {calculatedAge} years old
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Contact Phone</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {user?.phone || 'Not set'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Identity KYC</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {hasKyc
                    ? user?.kyc?.documentType === 'DRIVING_LICENSE'
                      ? 'Driving License'
                      : 'Citizenship'
                    : 'Not Uploaded'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Member Since</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {user?.createdAt ? formatDate(user.createdAt) : 'Recently'}
                </span>
              </div>
            </div>
          </Card>

          {/* Business & Organization Card (if available) */}
          {business && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-black/[0.05] dark:border-white/[0.08]">
                <Building2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Associated Business
                </h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{business.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Category</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{business.category || 'Retail'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">PAN / Tax ID</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {business.taxNumber || 'N/A'}
                  </span>
                </div>
                {business?.coordinates?.latitude !== null &&
                  business?.coordinates?.latitude !== undefined &&
                  business?.coordinates?.longitude !== null &&
                  business?.coordinates?.longitude !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 dark:text-zinc-400">GPS Location</span>
                      <a
                        href={`https://www.google.com/maps?q=${business.coordinates.latitude},${business.coordinates.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-zinc-700 dark:text-zinc-300 hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-[11px]"
                      >
                        {business.coordinates.latitude.toFixed(4)}, {business.coordinates.longitude.toFixed(4)}
                        <ExternalLink className="h-2.5 w-2.5 text-zinc-400" />
                      </a>
                    </div>
                  )}
                <div className="flex justify-between items-center pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
                  <span className="text-zinc-500 dark:text-zinc-400">Plan</span>
                  <Badge variant="accent">
                    {business.subscription?.plan || 'Standard'}
                  </Badge>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Profile Details, KYC, and Security */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: Personal Details & Address Form */}
          <Card className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Personal Details & Location
                  </h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Update your full name, phone number, date of birth, and residential address
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <Input
                  label="Full Name"
                  id="fullName"
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  helperText="First and last name"
                />

                {/* Email Address (Strictly Locked / Immutable) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                      Email Address
                    </label>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80">
                      <Lock className="h-2.5 w-2.5 text-zinc-400" /> Immutable
                    </span>
                  </div>
                  <Input
                    id="emailAddress"
                    type="email"
                    disabled
                    value={user?.email || ''}
                    helperText="Email is permanently bound to this account and cannot be changed."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Phone */}
                <Input
                  label="Contact Phone Number"
                  id="contactPhone"
                  type="tel"
                  placeholder="e.g. 9841234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  helperText="Primary mobile number for notifications"
                />

                {/* Date of Birth */}
                <DatePicker
                  label="Date of Birth (DOB)"
                  id="userDob"
                  maxDate={maxDobDate}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  helperText={
                    dob && calculateAge(dob) !== null
                      ? `Calculated Age: ${calculateAge(dob)} years old`
                      : 'Minimum age required: 16 years'
                  }
                />
              </div>

              {/* Nepal Cascading Location Selector */}
              <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
                <LocationSelect
                  label="Residential / Personal Location (Nepal)"
                  id="profile-location"
                  value={locationState}
                  onChange={(_e, _formatted, newState) => {
                    setLocationState(newState);
                  }}
                  showStreetInput={true}
                  helperText="Province, District, Municipality, Ward, and Street / Tole"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={profileLoading}
                  className="rounded-xl"
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* SECTION 2: Government Identity Verification (KYC - Citizenship or Driving License) */}
          <Card className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    hasKyc
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {hasKyc ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Government Identity Document (KYC)
                  </h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Official Nepali Citizenship or Driving License verification
                  </p>
                </div>
              </div>

              {hasKyc && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <Lock className="h-3 w-3" />
                  Verified & Immutable
                </span>
              )}
            </div>

            {/* Case A: KYC is already uploaded -> View submitted/verified documents */}
            {hasKyc ? (
              <div className="space-y-4">
                {user?.kyc?.status === 'VERIFIED' ? (
                  /* Verified Notice Banner */
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                          Identity Document Verified & Permanent
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <Lock className="h-2.5 w-2.5" /> Approved
                        </span>
                      </div>
                      <p className="text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
                        Your government-issued identity document is officially verified by Platform Compliance. Per platform security standards, your verified citizenship or driving license details are permanent and cannot be modified or replaced.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Pending Platform Compliance Review Banner */
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-amber-800 dark:text-amber-200">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-spin" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-amber-950 dark:text-amber-100">
                          Identity Document Under Platform Compliance Review
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                          Pending Validation
                        </span>
                      </div>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        Your government-issued identity document has been submitted and is currently awaiting validation by the Platform Compliance team. You can view your submitted copies below. You may continue operating while verification is in progress.
                      </p>
                    </div>
                  </div>
                )}

                {/* Verified Attributes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                      Document Type
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                      {user?.kyc?.documentType === 'DRIVING_LICENSE'
                        ? 'Driving License'
                        : 'Nepali Citizenship'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                      Document Identification No.
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                      {user?.kyc?.documentNumber || 'Verified on file'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                      Verification Status
                    </span>
                    {user?.kyc?.status === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        VERIFIED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                        <Clock className="h-3.5 w-3.5 animate-spin" />
                        UNDER REVIEW
                      </span>
                    )}
                  </div>
                </div>

                {/* Document Image Thumbnails */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Front Side Document
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5 text-emerald-500" /> Immutable
                      </span>
                    </div>
                    <div
                      onClick={() =>
                        setPreviewImage({
                          url: user.kyc.frontImage,
                          title: `${
                            user?.kyc?.documentType === 'DRIVING_LICENSE'
                              ? 'Driving License'
                              : 'Citizenship'
                          } - Front Side`,
                        })
                      }
                      className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group cursor-pointer aspect-[16/10] bg-zinc-100 dark:bg-zinc-900 shadow-sm"
                    >
                      <img
                        src={user.kyc.frontImage}
                        alt="Front Side Document"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                        <Eye className="h-4 w-4" />
                        <span>Click to view full image</span>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white font-medium">
                        Front Side
                      </span>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Back Side Document
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5 text-emerald-500" /> Immutable
                      </span>
                    </div>
                    <div
                      onClick={() =>
                        setPreviewImage({
                          url: user.kyc.backImage,
                          title: `${
                            user?.kyc?.documentType === 'DRIVING_LICENSE'
                              ? 'Driving License'
                              : 'Citizenship'
                          } - Back Side`,
                        })
                      }
                      className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group cursor-pointer aspect-[16/10] bg-zinc-100 dark:bg-zinc-900 shadow-sm"
                    >
                      <img
                        src={user.kyc.backImage}
                        alt="Back Side Document"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                        <Eye className="h-4 w-4" />
                        <span>Click to view full image</span>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white font-medium">
                        Back Side
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Case B: KYC is NOT uploaded or REJECTED -> Interactive upload widget */
              <form onSubmit={handleUploadKyc} className="space-y-4">
                {user?.kyc?.status === 'REJECTED' ? (
                  /* Rejection Alert Notice with Reason */
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/20 text-rose-900 dark:text-rose-200">
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-rose-950 dark:text-rose-100">
                          Identity Verification Rejected
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-[10px] font-semibold text-rose-800 dark:text-rose-300">
                          Re-upload Allowed
                        </span>
                      </div>
                      <p className="text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
                        Reason from Platform Compliance: <strong className="font-semibold text-rose-950 dark:text-white">"{user?.kyc?.rejectionReason || 'Document details or images could not be verified.'}"</strong>.
                        Please correct your document number and upload clearer photos of both sides to re-submit for review.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Pending Alert Notice */
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-amber-950 dark:text-amber-100">
                          Identity Document Pending
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                          Upload Required
                        </span>
                      </div>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        You did not complete identity document verification during onboarding. Please select your document type and upload front and back photos below to verify your account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Document Type Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Select Document Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setKycDocType('CITIZENSHIP')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        kycDocType === 'CITIZENSHIP'
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold ring-2 ring-black/10 dark:ring-white/10'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">Nepali Citizenship</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          नेपाली नागरिकता प्रमाणपत्र
                        </p>
                      </div>
                      {kycDocType === 'CITIZENSHIP' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setKycDocType('DRIVING_LICENSE')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        kycDocType === 'DRIVING_LICENSE'
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold ring-2 ring-black/10 dark:ring-white/10'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">Driving License</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          सवारी चालक अनुमतिपत्र
                        </p>
                      </div>
                      {kycDocType === 'DRIVING_LICENSE' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Document Number Input */}
                <Input
                  label={`${
                    kycDocType === 'CITIZENSHIP' ? 'Citizenship' : 'Driving License'
                  } Identification Number`}
                  id="profile-doc-number"
                  type="text"
                  placeholder={
                    kycDocType === 'CITIZENSHIP' ? 'e.g. 27-01-78-01234' : 'e.g. 01-06-00123456'
                  }
                  required
                  value={kycDocNumber}
                  onChange={(e) => setKycDocNumber(e.target.value)}
                  helperText="Official certificate number printed on your document"
                />

                {/* Upload Dropzones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Side */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Front Side Photo <span className="text-rose-500">*</span>
                    </span>

                    {kycFrontImage ? (
                      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group aspect-[16/10]">
                        <img
                          src={kycFrontImage}
                          alt="Front Side Preview"
                          className="w-full h-full object-cover bg-zinc-100 dark:bg-zinc-900"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setKycFrontImage('')}
                            className="p-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </button>
                        </div>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white font-medium">
                          Front Side
                        </span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/10] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-400 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer p-4 text-center">
                        <Upload className="h-6 w-6 text-zinc-400 dark:text-zinc-500 mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Upload Front Side
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">
                          PNG, JPG, or WEBP up to 5MB
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileSelect(e, 'front')}
                        />
                      </label>
                    )}
                  </div>

                  {/* Back Side */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Back Side Photo <span className="text-rose-500">*</span>
                    </span>

                    {kycBackImage ? (
                      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group aspect-[16/10]">
                        <img
                          src={kycBackImage}
                          alt="Back Side Preview"
                          className="w-full h-full object-cover bg-zinc-100 dark:bg-zinc-900"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setKycBackImage('')}
                            className="p-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </button>
                        </div>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white font-medium">
                          Back Side
                        </span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/10] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-400 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer p-4 text-center">
                        <Upload className="h-6 w-6 text-zinc-400 dark:text-zinc-500 mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Upload Back Side
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">
                          PNG, JPG, or WEBP up to 5MB
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileSelect(e, 'back')}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Verification process notice */}
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2.5">
                  <Lock className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>
                    <strong>Platform Compliance Review:</strong> Your uploaded documents will be forwarded to the Platform Compliance team for validation. Once approved, your identity status will be verified.
                  </span>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={kycLoading}
                    disabled={!kycDocNumber.trim() || !kycFrontImage || !kycBackImage}
                    className="rounded-xl"
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    {user?.kyc?.status === 'REJECTED'
                      ? 'Re-submit Identity Document for Review'
                      : 'Submit Identity Document for Review'}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* SECTION 3: Security & Password */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Security & Password
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Update your authentication password to keep your account secure
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <Input
                label="Current Password"
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="New Password"
                  id="newPassword"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <Input
                  label="Confirm New Password"
                  id="confirmNewPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={passwordLoading}
                  className="rounded-xl"
                  disabled={!currentPassword || !newPassword}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* Lightbox Modal for Document Image Zoom */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.title || 'Document Preview'}
        maxWidth="max-w-2xl"
      >
        {previewImage && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950/10 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-auto object-contain max-h-[65vh] rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Verified Government Identity Record</span>
              </div>
              <span className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                Immutable
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProfilePage;
