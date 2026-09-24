import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { authService } from '../../services/authService';
import { LocationSelect } from '../ui/LocationSelect';
import { CoordinateInput } from '../ui/CoordinateInput';
import { Input } from '../ui/Input';
import { PhoneInput } from '../ui/PhoneInput';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { useSnackbar } from '../../hooks/useSnackbar';
import { validateFullName } from '../../utils/inputValidator';
import { validateNepaliPhone } from '../../utils/phoneValidator';
import { formatLocationAddress } from '../../utils/nepalLocations';
import {
  User,
  MapPin,
  FileText,
  FileCheck2,
  Upload,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  Receipt,
  Users,
} from 'lucide-react';

export const OnboardingModal = ({ isOpen = true, onClose, isMandatory = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser, logout } = useAuth();
  const { refreshBusiness } = useBusiness();
  const { showSuccess, showError } = useSnackbar();

  const searchParams = new URLSearchParams(location.search);
  const isKycRequiredRedirect = searchParams.get('required') === 'kyc';

  // Determine initial step:
  const hasExistingAddress = Boolean(
    user?.location?.formattedAddress && user?.location?.formattedAddress.trim()
  );
  const isKycSubmitted = Boolean(
    user?.kyc?.documentNumber &&
      user?.kyc?.frontImage &&
      user?.kyc?.backImage &&
      user?.kyc?.status &&
      user?.kyc?.status !== 'NOT_SUBMITTED'
  );

  // If user already completed address, skipped KYC previously, or was redirected from a KYC-mandatory feature:
  // previous steps (Step 1 Personal Details & Step 2 Address) are permanently disabled/completed.
  const isPreviousStepsDisabled = Boolean(
    hasExistingAddress || user?.kycSkipped || isKycRequiredRedirect
  );

  const [currentStep, setCurrentStep] = useState(() => {
    if (hasExistingAddress && isKycSubmitted) {
      if (user?.kyc?.status === 'REJECTED') return 3;
      return 5; // Completed state
    }
    if (hasExistingAddress || user?.kycSkipped || isKycRequiredRedirect) {
      return 3; // Document selection
    }
    return 1; // Start at step 1
  });

  const [loading, setLoading] = useState(false);

  // STEP 1 STATE: Personal Details & Contact
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(
    user?.dob ? new Date(user.dob).toISOString().split('T')[0] : ''
  );
  const [phoneError, setPhoneError] = useState('');
  const [dobError, setDobError] = useState('');

  // STEP 2 STATE: Official Address Hierarchy & Coordinates
  const [locationValue, setLocationValue] = useState(() => {
    if (user?.location && typeof user.location === 'object') {
      return {
        province: user.location.province || '',
        district: user.location.district || '',
        municipality: user.location.municipality || '',
        ward: user.location.ward || '',
        street: user.location.street || '',
        formattedAddress: user.location.formattedAddress || '',
      };
    }
    return user?.location?.formattedAddress || user?.location || '';
  });
  const [coordinates, setCoordinates] = useState({
    latitude: null,
    longitude: null,
  });
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // STEP 3 STATE: Identity Document Information
  const [documentType, setDocumentType] = useState(
    user?.kyc?.documentType && user?.kyc?.documentType !== 'NONE'
      ? user.kyc.documentType
      : 'CITIZENSHIP'
  );
  const [documentNumber, setDocumentNumber] = useState(user?.kyc?.documentNumber || '');

  // STEP 4 STATE: Document Photo Uploads
  const [frontImage, setFrontImage] = useState(user?.kyc?.frontImage || '');
  const [backImage, setBackImage] = useState(user?.kyc?.backImage || '');

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.dob && !dob) {
      setDob(new Date(user.dob).toISOString().split('T')[0]);
    }
    if (user?.location && !locationValue) {
      setLocationValue(user.location);
    }
    if (user?.kyc?.documentNumber && !documentNumber) {
      setDocumentNumber(user.kyc.documentNumber);
    }
    if (user?.kyc?.frontImage && !frontImage) {
      setFrontImage(user.kyc.frontImage);
    }
    if (user?.kyc?.backImage && !backImage) {
      setBackImage(user.kyc.backImage);
    }
    if (user?.kyc?.documentType && user.kyc.documentType !== 'NONE') {
      setDocumentType(user.kyc.documentType);
    }
  }, [user]);

  // Validation functions
  const validatePhone = (val) => {
    const res = validateNepaliPhone(val, true);
    return res.isValid ? '' : (res.error || 'Please enter a valid Nepali contact number.');
  };

  const validateDob = (val) => {
    if (!val) return 'Date of birth is required';
    const birthDate = new Date(val);
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
      return 'You must be at least 16 years old to complete account registration';
    }
    return '';
  };

  // Image Upload Handler
  const handleImageUpload = (e, side) => {
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
        setFrontImage(reader.result);
      } else {
        setBackImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // STEP 1 SUBMIT: Personal Info & Contact
  const handleStep1PersonalSubmit = (e) => {
    e.preventDefault();

    const nameErr = validateFullName(name);
    if (nameErr) {
      showError(nameErr);
      return;
    }

    const pErr = validatePhone(phone);
    const dErr = validateDob(dob);

    setPhoneError(pErr);
    setDobError(dErr);

    if (pErr || dErr) {
      showError('Please resolve phone and date of birth validation errors.');
      return;
    }

    setCurrentStep(2);
  };

  // STEP 2 SUBMIT: Address Hierarchy & Location
  const handleStep2AddressSubmit = async (e) => {
    e.preventDefault();

    const hasLoc =
      typeof locationValue === 'object'
        ? Boolean(
            locationValue.province &&
              locationValue.district &&
              locationValue.municipality &&
              locationValue.ward
          )
        : Boolean(locationValue && String(locationValue).trim());

    if (!hasLoc) {
      showError('Please select your Province, District, Municipality, and Ward.');
      return;
    }

    try {
      setLoading(true);
      const locPayload =
        typeof locationValue === 'object'
          ? {
              province: locationValue.province || '',
              district: locationValue.district || '',
              municipality: locationValue.municipality || '',
              ward: locationValue.ward ? String(locationValue.ward) : '',
              street: locationValue.street || '',
              formattedAddress:
                locationValue.formattedAddress ||
                formatLocationAddress(locationValue),
            }
          : { formattedAddress: String(locationValue).trim() };

      const res = await authService.updateOnboarding({
        step: 1,
        profile: {
          name: name.trim(),
          phone: phone.trim(),
          dob,
          location: locPayload,
        },
        coordinates,
        googleMapsUrl,
      });

      if (res?.user) updateUser(res.user);
      showSuccess(
        'Official address and personal details saved successfully!'
      );
      setCurrentStep(3);
    } catch (err) {
      showError(err.message || 'Failed to verify address.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 SUBMIT: Document Details
  const handleStep3DocSubmit = (e) => {
    e.preventDefault();

    if (!documentNumber.trim()) {
      showError(
        `Please enter your ${
          documentType === 'CITIZENSHIP'
            ? 'Citizenship'
            : documentType === 'DRIVING_LICENSE'
            ? 'Driving License'
            : 'Passport / ID'
        } number.`
      );
      return;
    }

    setCurrentStep(4);
  };

  // STEP 4 SUBMIT: Upload Document Photos
  const handleStep4PhotosSubmit = async (e) => {
    e.preventDefault();

    if (!frontImage) {
      showError('Please upload the front photo of your identity document.');
      return;
    }

    if (!backImage) {
      showError('Please upload the back photo of your identity document.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.updateOnboarding({
        step: 2,
        kyc: {
          documentType,
          documentNumber: documentNumber.trim(),
          frontImage,
          backImage,
        },
      });

      if (res?.user) updateUser(res.user);
      if (refreshBusiness) refreshBusiness();

      showSuccess('KYC documents submitted successfully to Platform Compliance!');
      setCurrentStep(5); // Go to Completion screen
    } catch (err) {
      showError(err.message || 'Failed to submit KYC details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (onClose) onClose();
    if (user?.userType === 'CUSTOMER') {
      navigate(ROUTES.CUSTOMER_PURCHASES, { replace: true });
    } else {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  };

  const handleSkipKyc = async () => {
    try {
      setLoading(true);
      const res = await authService.updateOnboarding({ skipKyc: true });
      if (res?.user) updateUser(res.user);
      if (refreshBusiness) refreshBusiness();
      showSuccess('KYC skipped. You can access the app and complete verification later.');
      if (onClose) onClose();
      if (user?.userType === 'CUSTOMER') {
        navigate(ROUTES.CUSTOMER_PURCHASES, { replace: true });
      } else {
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (err) {
      showError(err.message || 'Failed to skip KYC.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    if (onClose) onClose();
    if (user?.userType === 'CUSTOMER') {
      navigate(ROUTES.CUSTOMER_PURCHASES, { replace: true });
    } else {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  };

  const handleSignOut = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  if (!isOpen) return null;

  // Multiple steps progression: Step 1 (25%), Step 2 (50%), Step 3 (75%), Step 4 (100%), Step 5 (100%)
  const progressPercent = isPreviousStepsDisabled
    ? currentStep === 3
      ? 50
      : 100
    : currentStep === 1
    ? 25
    : currentStep === 2
    ? 50
    : currentStep === 3
    ? 75
    : 100;

  const maxDobDate = new Date().toISOString().split('T')[0];
  const formattedAddressDisplay =
    user?.location?.formattedAddress ||
    (typeof locationValue === 'object' ? locationValue?.formattedAddress : locationValue) ||
    'Not yet specified';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 pt-14 pb-4 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#14161f] border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-xs shrink-0">
                {currentStep === 1 && <User className="h-4 w-4 sm:h-5 sm:w-5" />}
                {currentStep === 2 && <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />}
                {currentStep === 3 && <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                {currentStep === 4 && <Upload className="h-4 w-4 sm:h-5 sm:w-5" />}
                {currentStep === 5 && <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                  <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 shrink-0 whitespace-nowrap">
                    {currentStep === 5
                      ? 'Completed'
                      : isPreviousStepsDisabled
                      ? `KYC Step ${currentStep - 2} of 2`
                      : `Step ${currentStep} of 4`}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    {currentStep === 1 && 'Personal Information'}
                    {currentStep === 2 && 'Official Address'}
                    {currentStep === 3 &&
                      (isPreviousStepsDisabled
                        ? 'Document Information (Steps 1-2 Completed & Locked)'
                        : 'Document Information')}
                    {currentStep === 4 && 'Upload KYC Photos'}
                    {currentStep === 5 && 'Verification Submitted'}
                  </span>
                </div>
                <h2 className="text-sm sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                  {currentStep === 1 && 'Personal & Contact Details'}
                  {currentStep === 2 && 'Verify Official Address'}
                  {currentStep === 3 && 'Identity Document Selection'}
                  {currentStep === 4 && 'Upload Government ID Photos'}
                  {currentStep === 5 && 'Verification Under Review'}
                </h2>
              </div>
            </div>

            {/* Header Right: Sign Out Option */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of account"
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-7 overflow-y-auto max-h-[calc(88dvh-120px)] sm:max-h-[68vh]">
          {/* STEP 1: PERSONAL & CONTACT INFORMATION */}
          {currentStep === 1 && (
            <form
              id="step-1-personal-form"
              onSubmit={handleStep1PersonalSubmit}
              className="space-y-4"
            >
              {/* Mandatory Info Banner */}
              <div className="p-3.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5 text-zinc-900 dark:text-zinc-100">
                    Mandatory Account Verification
                  </span>
                  <span>
                    To prevent spam and ensure verified account ownership, please complete the onboarding steps below. Your verified information will be used across your workspace and documents.
                  </span>
                </div>
              </div>

              {/* Contact Information & Date of Birth */}
              <div className="space-y-3.5 pt-1">
                <Input
                  label="Registered Full Name (First & Last Name)"
                  id="step1-name"
                  type="text"
                  placeholder="e.g. Ram Bahadur Thapa"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <PhoneInput
                    label="Contact Phone Number"
                    id="step1-phone"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    error={phoneError}
                    helperText="Nepali 10-digit mobile (+977) or landline"
                  />

                  <DatePicker
                    label="Date of Birth (DOB)"
                    id="step1-dob"
                    maxDate={maxDobDate}
                    required
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (dobError) setDobError('');
                    }}
                    error={dobError}
                    helperText="Must be 16+ years"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400">
                Your email address (<span className="font-semibold text-zinc-800 dark:text-zinc-200">{user?.email}</span>) was verified. Next, configure your official address and identification documents.
              </div>
            </form>
          )}

          {/* STEP 2: OFFICIAL ADDRESS */}
          {currentStep === 2 && (
            <form
              id="step-2-address-form"
              onSubmit={handleStep2AddressSubmit}
              className="space-y-4"
            >
              {/* Verified Address Scope Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <Building2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Business Profile
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <Receipt className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    POS Receipts
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Customer Records
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    KYC Compliance
                  </span>
                </div>
              </div>

              {/* Cascading Nepal Location Selector */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span>Official Address (Nepal Administrative Hierarchy)</span>
                </label>
                <LocationSelect
                  id="step2-location"
                  name="step2-location"
                  value={locationValue}
                  onChange={(_e, formatted, newState) => {
                    setLocationValue(newState || formatted);
                  }}
                  required
                  isBusinessSetup={true}
                  showStreetInput={true}
                />
              </div>

              {/* Optional GPS Coordinates / Map Link */}
              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                <CoordinateInput
                  coordinates={coordinates}
                  googleMapsUrl={googleMapsUrl}
                  onChange={({ coordinates: coords, googleMapsUrl: url }) => {
                    setCoordinates(coords);
                    setGoogleMapsUrl(url);
                  }}
                />
              </div>
            </form>
          )}

          {/* STEP 3: IDENTITY DOCUMENT SELECTION & NUMBER */}
          {currentStep === 3 && (
            <form
              id="step-3-doc-form"
              onSubmit={handleStep3DocSubmit}
              className="space-y-4"
            >
              {/* KYC Required Alert Banner */}
              {isKycRequiredRedirect && (
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-zinc-900 dark:text-zinc-100">
                      Identity Verification (KYC) Required
                    </span>
                    <span>
                      KYC verification is required to access Sales, Purchases, Parties, and Subscription management. You skipped this step previously. Please upload your identity documents to continue. Previous onboarding steps are completed and locked.
                    </span>
                  </div>
                </div>
              )}

              {/* Address & Contact Recap Badge */}
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block">
                      Verified Address & Contact
                    </span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                      {formattedAddressDisplay}
                    </p>
                    {(phone || dob) && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {phone && <span>Phone: {phone}</span>}
                        {phone && dob && <span> • </span>}
                        {dob && <span>DOB: {dob}</span>}
                      </p>
                    )}
                  </div>
                </div>
                {isPreviousStepsDisabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-zinc-500" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-75 shrink-0"
                  >
                    Edit Address
                  </button>
                )}
              </div>

              {/* Rejection Alert if Applicable */}
              {user?.kyc?.status === 'REJECTED' && (
                <div className="p-3 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Previous Submission Not Approved</span>
                  </div>
                  <p className="text-[11px]">
                    Reason:{' '}
                    <strong>
                      "{user?.kyc?.rejectionReason || 'Document could not be verified'}"
                    </strong>
                    . Please review your ID number and upload clear document photos.
                  </p>
                </div>
              )}

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Select Government-Issued Document Type:
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setDocumentType('CITIZENSHIP')}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentType === 'CITIZENSHIP'
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className="text-[11px] sm:text-xs font-bold truncate">Citizenship</p>
                      {documentType === 'CITIZENSHIP' && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white dark:text-zinc-950" />
                      )}
                    </div>
                    <p
                      className={`text-[9px] sm:text-[10px] ${
                        documentType === 'CITIZENSHIP'
                          ? 'text-zinc-300 dark:text-zinc-600'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      नागरिकता
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentType('DRIVING_LICENSE')}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentType === 'DRIVING_LICENSE'
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className="text-[11px] sm:text-xs font-bold truncate">License</p>
                      {documentType === 'DRIVING_LICENSE' && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white dark:text-zinc-950" />
                      )}
                    </div>
                    <p
                      className={`text-[9px] sm:text-[10px] ${
                        documentType === 'DRIVING_LICENSE'
                          ? 'text-zinc-300 dark:text-zinc-600'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      सवारी चालक
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentType('PASSPORT')}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentType === 'PASSPORT'
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className="text-[11px] sm:text-xs font-bold truncate">Passport</p>
                      {documentType === 'PASSPORT' && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white dark:text-zinc-950" />
                      )}
                    </div>
                    <p
                      className={`text-[9px] sm:text-[10px] ${
                        documentType === 'PASSPORT'
                          ? 'text-zinc-300 dark:text-zinc-600'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      राहदानी
                    </p>
                  </button>
                </div>
              </div>

              {/* Document Identification Number */}
              <Input
                label={`${
                  documentType === 'CITIZENSHIP'
                    ? 'Citizenship'
                    : documentType === 'DRIVING_LICENSE'
                    ? 'Driving License'
                    : 'Passport / National ID'
                } Number`}
                id="doc-number"
                type="text"
                placeholder={
                  documentType === 'CITIZENSHIP'
                    ? 'e.g. 27-01-78-01234'
                    : documentType === 'DRIVING_LICENSE'
                    ? 'e.g. 01-06-00123456'
                    : 'e.g. 10293847'
                }
                required
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </form>
          )}

          {/* STEP 4: UPLOAD DOCUMENT PHOTOS */}
          {currentStep === 4 && (
            <form
              id="step-4-photos-form"
              onSubmit={handleStep4PhotosSubmit}
              className="space-y-4"
            >
              {/* Document Summary Badge */}
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block">
                      Selected Document
                    </span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                      {documentType === 'CITIZENSHIP'
                        ? 'Nepali Citizenship'
                        : documentType === 'DRIVING_LICENSE'
                        ? 'Driving License'
                        : 'Passport'}{' '}
                      ({documentNumber})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-75 shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Front & Back Document Photo Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Front Side */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Front Side Photo
                  </span>

                  {frontImage ? (
                    <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group">
                      <img
                        src={frontImage}
                        alt="Front Side"
                        className="w-full h-28 sm:h-32 object-cover bg-zinc-100 dark:bg-zinc-900"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFrontImage('')}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white font-medium">
                        Front Side Photo
                      </span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 sm:h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-all cursor-pointer p-3 text-center">
                      <Upload className="h-5 w-5 text-zinc-400 dark:text-zinc-500 mb-1" />
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Upload Front Side
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'front')}
                      />
                    </label>
                  )}
                </div>

                {/* Back Side */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Back Side Photo
                  </span>

                  {backImage ? (
                    <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group">
                      <img
                        src={backImage}
                        alt="Back Side"
                        className="w-full h-28 sm:h-32 object-cover bg-zinc-100 dark:bg-zinc-900"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBackImage('')}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white font-medium">
                        Back Side Photo
                      </span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 sm:h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-all cursor-pointer p-3 text-center">
                      <Upload className="h-5 w-5 text-zinc-400 dark:text-zinc-500 mb-1" />
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Upload Back Side
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'back')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Encryption & Security Note */}
              <div className="p-3 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>
                  Documents are encrypted with AES-256 and reviewed strictly by Platform Compliance for identity validation.
                </span>
              </div>
            </form>
          )}

          {/* STEP 5: SUBMITTED / COMPLETION STATE */}
          {currentStep === 5 && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 sm:p-6 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  Verification Details Submitted Successfully!
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Your address has been verified and registered throughout the system. Your government-issued KYC documents are now undergoing verification with Platform Compliance.
                </p>

                <div className="pt-2 flex justify-center">
                  <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-[10px] sm:text-[11px] font-bold font-mono tracking-wider">
                    STATUS: UNDER COMPLIANCE REVIEW (PENDING)
                  </span>
                </div>
              </div>

              {/* Verification Summary Card */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800/80 pb-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Verified Address:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right max-w-xs truncate">
                    {formattedAddressDisplay}
                  </span>
                </div>
                {(phone || dob) && (
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800/80 pb-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Contact & DOB:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                      {phone || ''} {dob ? `(${dob})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800/80 pb-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Document Submitted:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {documentType === 'CITIZENSHIP'
                      ? 'Nepali Citizenship'
                      : documentType === 'DRIVING_LICENSE'
                      ? 'Driving License'
                      : 'Passport / ID'}{' '}
                    ({documentNumber})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Turnaround Time:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Typically verified within 24 hours
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="p-4 sm:p-6 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-3">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            {/* Back Navigation Button */}
            {currentStep === 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Personal</span>
              </button>
            ) : currentStep === 3 ? (
              !isPreviousStepsDisabled ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Address</span>
                </button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReturnToDashboard}
                  disabled={loading}
                  className="text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750"
                >
                  <span>Return to Dashboard</span>
                </Button>
              )
            ) : currentStep === 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Document Info</span>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {/* Forward Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {currentStep === 1 && (
                <Button
                  type="submit"
                  form="step-1-personal-form"
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  <span>Continue to Address</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  type="submit"
                  form="step-2-address-form"
                  variant="primary"
                  loading={loading}
                  className="w-full sm:w-auto"
                >
                  <span>Save Address & Continue</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}

              {currentStep === 3 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={user?.kycSkipped ? handleReturnToDashboard : handleSkipKyc}
                    disabled={loading}
                    className="w-full sm:w-auto text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750"
                  >
                    <span>{user?.kycSkipped ? 'Return to Dashboard' : 'Skip for now'}</span>
                  </Button>
                  <Button
                    type="submit"
                    form="step-3-doc-form"
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    <span>Continue to Photo Upload</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={user?.kycSkipped ? handleReturnToDashboard : handleSkipKyc}
                    disabled={loading}
                    className="w-full sm:w-auto text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750"
                  >
                    <span>{user?.kycSkipped ? 'Return to Dashboard' : 'Skip for now'}</span>
                  </Button>
                  <Button
                    type="submit"
                    form="step-4-photos-form"
                    variant="primary"
                    loading={loading}
                    className="w-full sm:w-auto"
                  >
                    <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                    <span>Submit KYC Details</span>
                  </Button>
                </>
              )}

              {currentStep === 5 && (
                <Button
                  type="button"
                  onClick={handleFinish}
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  <span>
                    {user?.userType === 'CUSTOMER'
                      ? 'Proceed to My Purchases'
                      : 'Proceed to Dashboard'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Step Progression & Progress Bar */}
          <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <span className="truncate">
                {isPreviousStepsDisabled
                  ? currentStep === 3
                    ? 'KYC Step 1 of 2: Document Details (Address Verified)'
                    : currentStep === 4
                    ? 'KYC Step 2 of 2: Upload KYC Photos'
                    : 'Verification Complete'
                  : currentStep === 1
                  ? 'Step 1 of 4: Personal Information'
                  : currentStep === 2
                  ? 'Step 2 of 4: Official Address'
                  : currentStep === 3
                  ? 'Step 3 of 4: Document Details'
                  : currentStep === 4
                  ? 'Step 4 of 4: Upload KYC Photos'
                  : 'Verification Complete'}
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0 ml-2">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
