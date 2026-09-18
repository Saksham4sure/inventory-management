import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { authService } from '../../services/authService';
import { LocationSelect } from '../ui/LocationSelect';
import { CoordinateInput } from '../ui/CoordinateInput';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
  FileCheck2,
  MapPin,
  Building2,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Trash2,
  Lock,
} from 'lucide-react';

export const OnboardingModal = ({ isOpen = true, onClose }) => {
  const navigate = useNavigate();
  const { user, updateUser, setBusinessConfigured } = useAuth();
  const { refreshBusiness } = useBusiness();
  const { showSuccess, showError } = useSnackbar();

  // Wizard Step: 1 = KYC Document Upload, 2 = Personal Profile & Nepal Location, 3 = Business Profile Setup
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // STEP 1 STATE: KYC Document
  const [documentType, setDocumentType] = useState('CITIZENSHIP'); // CITIZENSHIP | DRIVING_LICENSE
  const [documentNumber, setDocumentNumber] = useState(user?.kyc?.documentNumber || '');
  const [frontImage, setFrontImage] = useState(user?.kyc?.frontImage || '');
  const [backImage, setBackImage] = useState(user?.kyc?.backImage || '');

  // STEP 2 STATE: Personal Profile & Location
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [locationValue, setLocationValue] = useState(
    user?.location?.formattedAddress || ''
  );

  // STEP 3 STATE: Business Profile Setup
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Retail Store');
  const [businessPhone, setBusinessPhone] = useState(user?.phone || '');
  const [taxNumber, setTaxNumber] = useState('');
  const [usePersonalAddress, setUsePersonalAddress] = useState(true);
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCoordinates, setBusinessCoordinates] = useState({
    latitude: null,
    longitude: null,
  });
  const [businessGoogleMapsUrl, setBusinessGoogleMapsUrl] = useState('');

  const categories = [
    'Retail Store',
    'Wholesale & Distribution',
    'Electronics & Gadgets',
    'Supermarket & Grocery',
    'Fashion & Apparel',
    'Pharmacy & Healthcare',
    'Hardware & Sanitary',
    'Auto Parts & Workshop',
    'Manufacturing & Assembly',
    'Other Business',
  ];

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
    if (user?.kyc?.documentType) {
      setDocumentType(user.kyc.documentType);
    }
  }, [user]);

  // Image Upload Handler (reads file as Base64 Data URL)
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

  // STEP 1 PROCEED: KYC Document Submit
  const handleStep1KycSubmit = async (e) => {
    e.preventDefault();

    if (!documentNumber.trim()) {
      showError(`Please enter your ${documentType === 'CITIZENSHIP' ? 'Citizenship' : 'Driving License'} identification number.`);
      return;
    }

    if (!frontImage) {
      showError('Please upload the front side photo of your document.');
      return;
    }

    if (!backImage) {
      showError('Please upload the back side photo of your document.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.updateOnboarding({
        step: 1,
        kyc: {
          documentType,
          documentNumber: documentNumber.trim(),
          frontImage,
          backImage,
        },
      });

      if (res?.user) updateUser(res.user);
      showSuccess('Identity documents saved successfully!');
      setCurrentStep(2);
    } catch (err) {
      showError(err.message || 'Failed to submit identity document verification');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 PROCEED: Personal Profile & Location Submit
  const handleStep2ProfileSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Full name is required.');
      return;
    }

    if (!phone.trim()) {
      showError('Contact phone number is required.');
      return;
    }

    if (!locationValue || (typeof locationValue === 'string' && !locationValue.trim())) {
      showError('Please select your location using the dropdowns.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.updateOnboarding({
        step: 2,
        profile: {
          name: name.trim(),
          phone: phone.trim(),
          location: typeof locationValue === 'object' ? locationValue : { formattedAddress: locationValue },
        },
      });

      if (res?.user) updateUser(res.user);
      showSuccess('Profile and address saved successfully!');
      setCurrentStep(3);
    } catch (err) {
      showError(err.message || 'Failed to save profile and location details');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: CREATE BUSINESS
  const handleStep3CreateBusiness = async (e) => {
    e.preventDefault();

    if (user?.kyc?.status !== 'VERIFIED') {
      showError('Your identity documents (KYC) must be verified by Platform Compliance before you can configure a business profile.');
      return;
    }

    if (!businessName.trim()) {
      showError('Business name is required.');
      return;
    }

    try {
      setLoading(true);
      const finalAddress = usePersonalAddress
        ? (typeof locationValue === 'object' ? locationValue.formattedAddress : locationValue)
        : (typeof businessAddress === 'object' ? businessAddress.formattedAddress : businessAddress);

      const res = await authService.updateOnboarding({
        step: 3,
        skipBusiness: false,
        business: {
          name: businessName.trim(),
          category: businessCategory,
          currency: 'NPR',
          phone: businessPhone.trim() || phone.trim(),
          taxNumber: taxNumber.trim(),
          address: finalAddress || '',
          coordinates: businessCoordinates,
          googleMapsUrl: businessGoogleMapsUrl,
        },
      });

      if (res?.user) updateUser(res.user);
      if (res?.business) {
        setBusinessConfigured(res.business);
        if (refreshBusiness) refreshBusiness();
      }

      showSuccess('Business created and configured successfully!');
      if (onClose) onClose();
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      showError(err.message || 'Failed to setup business');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: SKIP BUSINESS (Allows user to explore dashboard while KYC is under review)
  const handleStep3Skip = async () => {
    try {
      setLoading(true);
      const res = await authService.updateOnboarding({
        step: 3,
        skipBusiness: true,
      });

      if (res?.user) updateUser(res.user);

      if (onClose) onClose();
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate progress percentage
  const progressPercent = currentStep === 1 ? 33.3 : currentStep === 2 ? 66.6 : 100;
  const isKycVerified = user?.kyc?.status === 'VERIFIED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#14161f] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Decorative Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
                {currentStep === 1 && <FileCheck2 className="h-5 w-5" />}
                {currentStep === 2 && <MapPin className="h-5 w-5" />}
                {currentStep === 3 && <Building2 className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    Step {currentStep} of 3
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {currentStep === 1
                      ? 'Identity Verification (KYC)'
                      : currentStep === 2
                      ? 'Personal Profile & Location'
                      : 'Business Setup (Locked until KYC Verified)'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {currentStep === 1 && 'Upload Government Identity Document'}
                  {currentStep === 2 && 'Set Residential Location & Contact'}
                  {currentStep === 3 && 'Setup Business Profile & QR Workspace'}
                </h2>
              </div>
            </div>

            {/* Pill Indicator */}
            <div className="hidden sm:flex items-center gap-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>

        {/* Modal Body / Steps */}
        <div className="p-6 sm:p-7 overflow-y-auto max-h-[65vh]">
          {/* STEP 1: KYC DOCUMENT UPLOAD (FRONT & BACK) */}
          {currentStep === 1 && (
            <form id="step-1-form" onSubmit={handleStep1KycSubmit} className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Welcome to StockPulse! In compliance with platform governance regulations, please upload your government-issued identity document. Our Platform Compliance team will validate your credentials.
                </span>
              </div>

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Select Identity Document Type:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDocumentType('CITIZENSHIP')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      documentType === 'CITIZENSHIP'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Nepali Citizenship</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">नागरिकता प्रमाणपत्र</p>
                    </div>
                    {documentType === 'CITIZENSHIP' && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentType('DRIVING_LICENSE')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      documentType === 'DRIVING_LICENSE'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Driving License</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">सवारी चालक अनुमतिपत्र</p>
                    </div>
                    {documentType === 'DRIVING_LICENSE' && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Document Number */}
              <Input
                label={`${documentType === 'CITIZENSHIP' ? 'Citizenship' : 'Driving License'} Identification Number`}
                id="doc-number"
                type="text"
                placeholder={documentType === 'CITIZENSHIP' ? 'e.g. 27-01-78-01234' : 'e.g. 01-06-00123456'}
                required
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />

              {/* Front & Back Document Uploaders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="w-full h-36 object-cover bg-zinc-100 dark:bg-zinc-900"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFrontImage('')}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white font-medium">
                        Front Side
                      </span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer p-4 text-center">
                      <Upload className="h-6 w-6 text-indigo-500 mb-1.5" />
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
                        className="w-full h-36 object-cover bg-zinc-100 dark:bg-zinc-900"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBackImage('')}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white font-medium">
                        Back Side
                      </span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer p-4 text-center">
                      <Upload className="h-6 w-6 text-indigo-500 mb-1.5" />
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
                        onChange={(e) => handleImageUpload(e, 'back')}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>
                  Your identity documents are encrypted and reviewed strictly by Platform Compliance for account verification.
                </span>
              </div>
            </form>
          )}

          {/* STEP 2: PERSONAL PROFILE & LOCATION */}
          {currentStep === 2 && (
            <form id="step-2-form" onSubmit={handleStep2ProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  id="step2-name"
                  type="text"
                  placeholder="e.g. Ram Bahadur Thapa"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Primary Contact Phone"
                  id="step2-phone"
                  type="tel"
                  placeholder="e.g. 9801234567"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Location Select with Dropdowns */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  <span>Residential Location & Nepal Address</span>
                </label>
                <LocationSelect
                  id="step2-location"
                  name="step2-location"
                  value={locationValue}
                  onChange={(val) => setLocationValue(val)}
                  required
                  isBusinessSetup={false}
                  showStreetInput={true}
                />
              </div>
            </form>
          )}

          {/* STEP 3: CREATE BUSINESS PROFILE (LOCKED UNLESS KYC VERIFIED) */}
          {currentStep === 3 && (
            <div>
              {!isKycVerified ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                            Identity Verification Required
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold uppercase">
                            {user?.kyc?.status === 'PENDING' ? 'Under Review' : user?.kyc?.status || 'Required'}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                          Platform Compliance Verification Gate
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                      {user?.kyc?.status === 'REJECTED' ? (
                        <>
                          Your submitted identity document was not validated by Platform Compliance. Reason:{' '}
                          <strong className="text-rose-600 dark:text-rose-400 font-bold">
                            "{user?.kyc?.rejectionReason || 'Document details could not be verified'}"
                          </strong>
                          . Please return to Step 1 to re-upload your document.
                        </>
                      ) : (
                        <>
                          Your identity documents have been submitted to Platform Compliance and are undergoing validation. In accordance with enterprise governance and legal guidelines, business profile setup is locked until identity verification is approved.
                        </>
                      )}
                    </p>

                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                      <span>Status: {user?.kyc?.status === 'PENDING' ? 'Awaiting Platform Compliance Review' : 'Identity Verification Pending'}</span>
                      <span className="font-semibold">Document: {documentType === 'CITIZENSHIP' ? 'Citizenship' : 'Driving License'}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <span>Explore Your Workspace While Awaiting Approval</span>
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      You do not need to wait on this screen. Click <strong>"Proceed to Dashboard"</strong> below to access your workspace. Once Platform Compliance approves your identity document, business configuration will unlock immediately and you will receive a notification.
                    </p>
                  </div>
                </div>
              ) : (
                <form id="step-3-form" onSubmit={handleStep3CreateBusiness} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          Identity Verified! Configure Your Business Entity
                        </p>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          Your verified credentials unlock full business profile creation, inventory QR generator, and billing operations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Business Name"
                      id="biz-name"
                      type="text"
                      placeholder="e.g. Himalayan Retail Mart"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />

                    <div>
                      <Select
                        label="Business Category"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        options={categories}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Business Phone"
                      id="biz-phone"
                      type="tel"
                      placeholder="e.g. 01-4455667 or 9801234567"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                    />

                    <Input
                      label="PAN / VAT Number (Optional)"
                      id="biz-tax"
                      type="text"
                      placeholder="e.g. 601234567"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                    />
                  </div>

                  {/* Address Toggle */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none mb-3">
                      <input
                        type="checkbox"
                        checked={usePersonalAddress}
                        onChange={(e) => setUsePersonalAddress(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 accent-indigo-600"
                      />
                      <span className="font-semibold">Use same address as my personal location</span>
                    </label>

                    {!usePersonalAddress && (
                      <div className="mt-2 space-y-2">
                        <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Business Location Dropdowns:
                        </span>
                        <LocationSelect
                          id="biz-location"
                          name="biz-location"
                          value={businessAddress}
                          onChange={(val) => setBusinessAddress(val)}
                          isBusinessSetup={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Optional GPS Coordinates / Google Maps Link */}
                  <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                    <CoordinateInput
                      coordinates={businessCoordinates}
                      googleMapsUrl={businessGoogleMapsUrl}
                      onChange={({ coordinates, googleMapsUrl }) => {
                        setBusinessCoordinates(coordinates);
                        setBusinessGoogleMapsUrl(googleMapsUrl);
                      }}
                    />
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer & Progress Bar Container */}
        <div className="p-5 sm:p-6 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
          {/* Action Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setCurrentStep((s) => s - 1);
                }}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {currentStep === 1 && (
                <Button
                  type="submit"
                  form="step-1-form"
                  variant="primary"
                  loading={loading}
                  className="cursor-pointer"
                >
                  <span>Submit Identity Document & Continue</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  type="submit"
                  form="step-2-form"
                  variant="primary"
                  loading={loading}
                  className="cursor-pointer"
                >
                  <span>Save Location & Continue</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}

              {currentStep === 3 && (
                <>
                  {!isKycVerified ? (
                    <>
                      {user?.kyc?.status === 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                        >
                          Re-upload Documents
                        </button>
                      )}
                      <Button
                        type="button"
                        onClick={handleStep3Skip}
                        variant="primary"
                        loading={loading}
                        className="cursor-pointer"
                      >
                        <span>Proceed to Dashboard</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleStep3Skip}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Skip for Now
                      </button>
                      <Button
                        type="submit"
                        form="step-3-form"
                        variant="primary"
                        loading={loading}
                        className="cursor-pointer"
                      >
                        <Building2 className="h-3.5 w-3.5 mr-1.5" />
                        <span>Create Business Profile</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bottom Progress Bar */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <span>
                {currentStep === 1 && 'Step 1 of 3: Identity Verification (KYC Document)'}
                {currentStep === 2 && 'Step 2 of 3: Personal Profile & Location'}
                {currentStep === 3 && 'Step 3 of 3: Business Profile Setup'}
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(progressPercent)}% Completed
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
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
