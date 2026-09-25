import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PhoneInput } from '../ui/PhoneInput';
import { Select } from '../ui/Select';
import { LocationSelect } from '../ui/LocationSelect';
import { CoordinateInput } from '../ui/CoordinateInput';
import { Badge } from '../ui/Badge';
import { TeamManagement } from '../team/TeamManagement';
import { validateNepaliPhone } from '../../utils/phoneValidator';
import { useSnackbar } from '../../hooks/useSnackbar';
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  Coins,
  QrCode,
  Users,
  MapPin,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  'Retail Store',
  'Wholesale & Distribution',
  'Electronics & Tech',
  'Supermarket & Grocery',
  'Fashion & Apparel',
  'Pharmacy & Healthcare',
  'Hardware & Tools',
  'Manufacturing & Assembly',
  'Other Business',
];

const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CAD', label: 'CAD ($)' },
  { code: 'AUD', label: 'AUD ($)' },
  { code: 'INR', label: 'INR (₹)' },
  { code: 'NPR', label: 'NPR (Rs)' },
];

export const BusinessProfileSection = ({ onSwitchToPersonalTab }) => {
  const { business, loadingBusiness, updateBusiness, setupBusiness } = useBusiness();
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get('subtab') === 'team' ? 'team' : 'details';

  const [formData, setFormData] = useState({
    name: '',
    category: 'Retail Store',
    currency: 'NPR',
    phone: '',
    email: '',
    address: '',
    coordinates: { latitude: null, longitude: null },
    googleMapsUrl: '',
    taxNumber: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        category: business.category || 'Retail Store',
        currency: business.currency || 'NPR',
        phone: business.phone || '',
        email: business.email || user?.email || '',
        address: business.address || '',
        coordinates: {
          latitude: business.coordinates?.latitude ?? null,
          longitude: business.coordinates?.longitude ?? null,
        },
        googleMapsUrl: business.googleMapsUrl || '',
        taxNumber: business.taxNumber || '',
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        email: user?.email || '',
        phone: user?.phone || '',
        currency: 'NPR',
      }));
    }
  }, [business, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!business && user?.kyc?.status !== 'VERIFIED') {
      showError(
        'Your identity documents (KYC) must be verified by Platform Compliance before you can configure a business profile.'
      );
      if (onSwitchToPersonalTab) onSwitchToPersonalTab();
      return;
    }

    if (!formData.name.trim()) {
      showError('Business name is required');
      return;
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneCheck = validateNepaliPhone(formData.phone, false);
      if (!phoneCheck.isValid) {
        showError(phoneCheck.error || 'Please enter a valid Nepali contact number.');
        return;
      }
    }

    try {
      setLoading(true);
      if (business) {
        await updateBusiness(formData);
        showSuccess('Business profile updated successfully');
      } else {
        await setupBusiness(formData);
        showSuccess('Business profile created and activated successfully');
      }
    } catch (err) {
      showError(err.message || 'Failed to save business profile');
    } finally {
      setLoading(false);
    }
  };

  const isKycVerified = user?.kyc?.status === 'VERIFIED';

  const setSubTab = (subtab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'business');
      next.set('subtab', subtab);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs when business already exists */}
      {business && (
        <div className="flex items-center gap-1.5 border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
          <button
            type="button"
            onClick={() => setSubTab('details')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'details'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Store Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('team')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'team'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team & Permissions</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeSubTab === 'team'
                  ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {business?.members?.length || 0}
            </span>
          </button>
        </div>
      )}

      {activeSubTab === 'team' && business ? (
        <TeamManagement />
      ) : (
        <>
          {/* Setup Notice if no business is configured yet */}
          {!business && (
            <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/[0.05] via-transparent to-transparent p-5 sm:p-6 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md">
                  <Sparkles className="h-6 w-6 text-indigo-400 dark:text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      Configure Your Business Profile
                    </h3>
                    <Badge variant="accent">Step 2 of 2</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                    Set up your business entity alongside your personal profile. Once activated, your store details will unlock QR inventory labels, point-of-sale billing, supplier purchase management, and team collaboration.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
            {/* Left Column: Business Badge & Status Card */}
            <div className="md:col-span-4 space-y-4">
              <Card className="text-center p-6 flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-2xl shadow-md ring-4 ring-black/[0.04] dark:ring-white/[0.06] mb-3.5">
                  <Building2 className="h-9 w-9" />
                </div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {business?.name || formData.name || 'Your Business'}
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {business?.category || formData.category}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Badge variant="accent" dot>
                    {business?.subscription?.plan?.replace('_', ' ') || 'Pro Plan'}
                  </Badge>
                  <Badge variant="neutral">
                    {formData.currency}
                  </Badge>
                  {business ? (
                    <Badge variant="success">Active Store</Badge>
                  ) : (
                    <Badge variant="warning">Setup Pending</Badge>
                  )}
                </div>

                <div className="w-full mt-6 pt-5 border-t border-black/[0.05] dark:border-white/[0.08] text-left space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="h-3.5 w-3.5 text-zinc-400" /> QR Shelf Label Engine
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {business ? 'Active' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> Audit Trail Logging
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-zinc-400" /> Base Currency
                    </span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                      {formData.currency}
                    </span>
                  </div>

                  {business?.coordinates?.latitude !== null &&
                    business?.coordinates?.latitude !== undefined &&
                    business?.coordinates?.longitude !== null &&
                    business?.coordinates?.longitude !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400" /> Store GPS
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${business.coordinates.latitude},${business.coordinates.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 font-medium hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                        >
                          {Number(business.coordinates.latitude).toFixed(4)}, {Number(business.coordinates.longitude).toFixed(4)}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    )}

                  {business && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-400" /> Team Members
                      </span>
                      <button
                        type="button"
                        onClick={() => setSubTab('team')}
                        className="font-mono text-zinc-700 dark:text-zinc-300 font-medium hover:underline text-xs cursor-pointer"
                      >
                        {(business?.members?.length || 0) + 1} active &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Business Profile Form */}
            <div className="md:col-span-8">
              <Card className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {business ? 'Business Entity Information' : 'Store & Company Setup'}
                      </h3>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        This information appears on generated QR shelf labels and receipts
                      </p>
                    </div>
                  </div>

                  {business && (
                    <span className="text-[11px] font-mono font-bold text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                      ID: {business._id?.slice(-8) || ''}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Warning if KYC is required before setup */}
                  {!business && !isKycVerified && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                              Identity Verification (KYC) Required
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold uppercase">
                              {user?.kyc?.status === 'PENDING' ? 'Under Review' : user?.kyc?.status || 'Action Required'}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                            Business creation inputs are blocked until your government identity document (Citizenship or Driving License) is submitted and verified.
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                        <span className="text-[11px] text-amber-800 dark:text-amber-300">
                          Status: <strong>{user?.kyc?.status === 'PENDING' ? 'Awaiting Review' : 'Documents Required'}</strong>
                        </span>
                        {onSwitchToPersonalTab && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={onSwitchToPersonalTab}
                            className="text-xs rounded-xl"
                          >
                            Verify KYC in Personal Profile <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <fieldset
                    disabled={!business && !isKycVerified}
                    className="space-y-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Input
                      label="Store / Business Name *"
                      id="bizName"
                      type="text"
                      placeholder="e.g. Apex Retail Labs"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      helperText="Primary business identity across your inventory"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <Select
                        label="Category"
                        id="bizCategory"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e?.target?.value ?? e })
                        }
                        options={CATEGORIES}
                      />

                      <Select
                        label="Base Currency"
                        id="bizCurrency"
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({ ...formData, currency: e?.target?.value ?? e })
                        }
                        options={CURRENCIES.map((curr) => ({
                          value: curr.code,
                          label: curr.label,
                        }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <PhoneInput
                        label="Contact Phone"
                        id="bizPhone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />

                      <Input
                        label="Business Email"
                        id="bizEmail"
                        type="email"
                        placeholder="contact@business.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <Input
                        label="Tax / PAN / VAT Identification"
                        id="bizTax"
                        type="text"
                        placeholder="Optional (e.g. PAN-992014)"
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      />
                    </div>

                    <div className="pt-1">
                      <LocationSelect
                        label="Store / Warehouse Location"
                        id="bizAddress"
                        name="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        isBusinessSetup={true}
                      />
                    </div>

                    <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
                      <CoordinateInput
                        coordinates={formData.coordinates}
                        googleMapsUrl={formData.googleMapsUrl}
                        onChange={({ coordinates, googleMapsUrl }) => {
                          setFormData((prev) => ({
                            ...prev,
                            coordinates,
                            googleMapsUrl,
                          }));
                        }}
                      />
                    </div>
                  </fieldset>

                  <div className="flex items-center justify-between pt-3 border-t border-black/[0.05] dark:border-white/[0.08]">
                    {onSwitchToPersonalTab && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onSwitchToPersonalTab}
                        className="text-xs rounded-xl"
                      >
                        &larr; Back to Personal Profile
                      </Button>
                    )}

                    <div className="flex gap-2">
                      {!business && !isKycVerified ? (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={onSwitchToPersonalTab}
                          className="rounded-xl"
                        >
                          <ShieldAlert className="h-4 w-4 mr-1.5" />
                          Verify KYC to Create Business
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="primary"
                          loading={loading || loadingBusiness}
                          className="rounded-xl shadow-xs"
                        >
                          {business ? 'Save Business Changes' : 'Create & Activate Business'}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessProfileSection;
