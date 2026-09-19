import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { authService } from '../../services/authService';
import { LocationSelect } from '../ui/LocationSelect';
import { CoordinateInput } from '../ui/CoordinateInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
  MapPin,
  FileCheck2,
  Upload,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  LogOut,
  Receipt,
  Users,
  Check,
} from 'lucide-react';

export const OnboardingModal = ({ isOpen = true, onClose, isMandatory = true }) => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { refreshBusiness } = useBusiness();
  const { showSuccess, showError } = useSnackbar();

  // Determine initial step:
  // If address is already verified but KYC is pending or not submitted, start at Step 2
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

  const [currentStep, setCurrentStep] = useState(() => {
    if (hasExistingAddress && !isKycSubmitted) return 2;
    if (hasExistingAddress && isKycSubmitted && user?.kyc?.status === 'REJECTED') return 2;
    if (hasExistingAddress && isKycSubmitted) return 3; // completion state
    return 1;
  });

  const [loading, setLoading] = useState(false);

  // STEP 1 STATE: Address & Contact Verification
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [locationValue, setLocationValue] = useState(
    user?.location?.formattedAddress || user?.location || ''
  );
  const [coordinates, setCoordinates] = useState({
    latitude: null,
    longitude: null,
  });
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // STEP 2 STATE: KYC Document Upload
  const [documentType, setDocumentType] = useState(
    user?.kyc?.documentType && user?.kyc?.documentType !== 'NONE'
      ? user.kyc.documentType
      : 'CITIZENSHIP'
  );
  const [documentNumber, setDocumentNumber] = useState(user?.kyc?.documentNumber || '');
  const [frontImage, setFrontImage] = useState(user?.kyc?.frontImage || '');
  const [backImage, setBackImage] = useState(user?.kyc?.backImage || '');

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.location?.formattedAddress && !locationValue) {
      setLocationValue(user.location.formattedAddress);
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

  // STEP 1 PROCEED: Address Verification Submit
  const handleStep1AddressSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Full name is required.');
      return;
    }

    if (!phone.trim()) {
      showError('Contact phone number is required.');
      return;
    }

    const hasLoc =
      typeof locationValue === 'object'
        ? Boolean(locationValue.province && locationValue.district && locationValue.municipality && locationValue.ward)
        : Boolean(locationValue && locationValue.trim());

    if (!hasLoc) {
      showError('Please select your Province, District, Municipality, and Ward.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.updateOnboarding({
        step: 1,
        profile: {
          name: name.trim(),
          phone: phone.trim(),
          location: typeof locationValue === 'object' ? locationValue : { formattedAddress: locationValue },
        },
        coordinates,
        googleMapsUrl,
      });

      if (res?.user) updateUser(res.user);
      showSuccess('Address verified successfully! This address will be used throughout the app.');
      setCurrentStep(2);
    } catch (err) {
      showError(err.message || 'Failed to verify address.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 PROCEED: KYC Document Submit
  const handleStep2KycSubmit = async (e) => {
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
      setCurrentStep(3); // Go to Completion screen
    } catch (err) {
      showError(err.message || 'Failed to submit KYC details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (onClose) onClose();
    navigate(ROUTES.DASHBOARD, { replace: true });
  };

  const handleSignOut = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  if (!isOpen) return null;

  const progressPercent = currentStep === 1 ? 50 : currentStep === 2 ? 100 : 100;
  const formattedAddressDisplay =
    user?.location?.formattedAddress ||
    (typeof locationValue === 'object' ? locationValue?.formattedAddress : locationValue) ||
    'Not yet specified';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#14161f] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
                {currentStep === 1 && <MapPin className="h-5 w-5" />}
                {currentStep === 2 && <FileCheck2 className="h-5 w-5" />}
                {currentStep === 3 && <ShieldCheck className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    {currentStep === 3 ? 'Completed' : `Step ${currentStep} of 2`}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {currentStep === 1
                      ? 'Address Verification (Required)'
                      : currentStep === 2
                      ? 'Upload KYC Details (Required)'
                      : 'Verification Submitted'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {currentStep === 1 && 'Verify Official Address'}
                  {currentStep === 2 && 'Upload Identity KYC Documents'}
                  {currentStep === 3 && 'Verification Under Review'}
                </h2>
              </div>
            </div>

            {/* Header Right: Sign Out Option */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of account"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[68vh]">
          {/* STEP 1: VERIFY ADDRESS */}
          {currentStep === 1 && (
            <form id="step-1-address-form" onSubmit={handleStep1AddressSubmit} className="space-y-4">
              {/* Mandatory Info Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">
                    Mandatory Business Account Setup
                  </span>
                  <span>
                    To protect business transactions and satisfy commercial regulations, verify your official address. This address will automatically be used everywhere across the app where your address is required.
                  </span>
                </div>
              </div>

              {/* Verified Address Scope Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Business Profile
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <Receipt className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    POS Receipts
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Customer Records
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center text-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    KYC Compliance
                  </span>
                </div>
              </div>

              {/* Name & Phone Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <Input
                  label="Registered Full Name"
                  id="step1-name"
                  type="text"
                  placeholder="e.g. Ram Bahadur Thapa"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Primary Contact Phone"
                  id="step1-phone"
                  type="tel"
                  placeholder="e.g. 9801234567"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Cascading Nepal Location Selector */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  <span>Official Address (Nepal Administration Hierarchy)</span>
                </label>
                <LocationSelect
                  id="step1-location"
                  name="step1-location"
                  value={locationValue}
                  onChange={(val) => setLocationValue(val)}
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

          {/* STEP 2: UPLOAD KYC DETAILS */}
          {currentStep === 2 && (
            <form id="step-2-kyc-form" onSubmit={handleStep2KycSubmit} className="space-y-4">
              {/* Address Recap Badge */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block">
                      Verified Address (Step 1)
                    </span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                      {formattedAddressDisplay}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  Edit Address
                </button>
              </div>

              {/* Rejection Alert if Applicable */}
              {user?.kyc?.status === 'REJECTED' && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Previous Submission Not Approved</span>
                  </div>
                  <p className="text-[11px]">
                    Reason:{' '}
                    <strong>
                      "{user?.kyc?.rejectionReason || 'Document could not be verified'}"
                    </strong>
                    . Please upload clearer photos and verify your ID number.
                  </p>
                </div>
              )}

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Select Government-Issued Document Type:
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setDocumentType('CITIZENSHIP')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentType === 'CITIZENSHIP'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className="text-xs font-bold">Citizenship</p>
                      {documentType === 'CITIZENSHIP' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">नागरिकता</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentType('DRIVING_LICENSE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentType === 'DRIVING_LICENSE'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className="text-xs font-bold">Driving License</p>
                      {documentType === 'DRIVING_LICENSE' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">सवारी चालक अनुमति</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentType('PASSPORT')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentType === 'PASSPORT'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <p className="text-xs font-bold">Passport / ID</p>
                      {documentType === 'PASSPORT' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">राहदानी / परिचय</p>
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

              {/* Front & Back Document Photo Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                        className="w-full h-32 object-cover bg-zinc-100 dark:bg-zinc-900"
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
                    <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer p-3 text-center">
                      <Upload className="h-5 w-5 text-indigo-500 mb-1" />
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
                        className="w-full h-32 object-cover bg-zinc-100 dark:bg-zinc-900"
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
                    <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer p-3 text-center">
                      <Upload className="h-5 w-5 text-indigo-500 mb-1" />
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
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>
                  Documents are encrypted with AES-256 and reviewed strictly by Platform Compliance for identity validation.
                </span>
              </div>
            </form>
          )}

          {/* STEP 3: SUBMITTED / COMPLETION STATE */}
          {currentStep === 3 && (
            <div className="space-y-4 py-2">
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Verification Details Submitted Successfully!
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Your address has been verified and registered throughout the system. Your government-issued KYC documents are now undergoing verification with Platform Compliance.
                </p>

                <div className="pt-3 flex justify-center">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold font-mono tracking-wider">
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
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Typically verified within 24 hours
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="p-5 sm:p-6 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Back Button (Only available on step 2) */}
            {currentStep === 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Address</span>
              </button>
            ) : (
              <div />
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {currentStep === 1 && (
                <Button
                  type="submit"
                  form="step-1-address-form"
                  variant="primary"
                  loading={loading}
                >
                  <span>Verify Address & Continue</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  type="submit"
                  form="step-2-kyc-form"
                  variant="primary"
                  loading={loading}
                >
                  <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                  <span>Submit KYC Details</span>
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  type="button"
                  onClick={handleFinish}
                  variant="primary"
                >
                  <span>Proceed to Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <span>
                {currentStep === 1
                  ? 'Step 1 of 2: Address Verification'
                  : currentStep === 2
                  ? 'Step 2 of 2: Upload KYC Details'
                  : 'Verification Complete'}
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {currentStep === 3 ? '100%' : `${progressPercent}%`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-500 ease-out"
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
