import { useState, useEffect } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { validateNepaliPhone } from '../utils/phoneValidator';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  MapPin,
  FileText,
  Phone,
  Mail,
  QrCode,
  Sparkles,
} from 'lucide-react';

export const BusinessProfilePage = () => {
  const { business, loadingBusiness, updateBusiness, setupBusiness } = useBusiness();
  const { user } = useAuth();

  const categories = [
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

  const currencies = [
    { code: 'USD', label: 'USD ($)' },
    { code: 'EUR', label: 'EUR (€)' },
    { code: 'GBP', label: 'GBP (£)' },
    { code: 'CAD', label: 'CAD ($)' },
    { code: 'AUD', label: 'AUD ($)' },
    { code: 'INR', label: 'INR (₹)' },
    { code: 'NPR', label: 'NPR (Rs)' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    category: 'Retail Store',
    currency: 'USD',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        category: business.category || 'Retail Store',
        currency: business.currency || 'USD',
        phone: business.phone || '',
        email: business.email || user?.email || '',
        address: business.address || '',
        taxNumber: business.taxNumber || '',
      });
    }
  }, [business, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Business name is required');
      return;
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneCheck = validateNepaliPhone(formData.phone, false);
      if (!phoneCheck.isValid) {
        setError(phoneCheck.error || 'Please enter a valid Nepali contact number.');
        return;
      }
    }

    try {
      setLoading(true);
      if (business) {
        await updateBusiness(formData);
        setSuccess('Business profile updated successfully');
      } else {
        await setupBusiness(formData);
        setSuccess('Business profile created and activated successfully');
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save business profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Business Profile
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {business
            ? 'Manage your store details, operating currency, and printed QR label metadata'
            : 'Configure your company profile to activate QR inventory tracking and POS sales'}
        </p>
      </div>

      {!business && (
        <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                No Business Profile Configured Yet
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                You skipped business setup during registration. Fill in the form below to configure your business profile and unlock all inventory features.
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#DBFE80]/15 border border-[#DBFE80]/30 p-4 text-xs text-zinc-900 dark:text-[#DBFE80] backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8ca825] dark:text-[#DBFE80]" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-700 dark:text-rose-300 backdrop-blur-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
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
                {business?.subscription?.plan?.replace('_', ' ') || 'Standard Plan'}
              </Badge>
              <Badge variant="neutral">
                {formData.currency}
              </Badge>
            </div>

            <div className="w-full mt-6 pt-5 border-t border-black/[0.05] dark:border-white/[0.08] text-left space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5 text-zinc-400" /> QR Label Engine</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> Audit Logging</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-zinc-400" /> Currency</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">{formData.currency}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Business Profile Form */}
        <div className="md:col-span-8">
          <Card className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Business Entity Information
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  This information appears on generated QR shelf labels and receipts
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Store / Business Name"
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
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={categories}
                />

                <Select
                  label="Base Currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={currencies.map((curr) => ({ value: curr.code, label: curr.label }))}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Tax / VAT Identification"
                  id="bizTax"
                  type="text"
                  placeholder="Optional (e.g. VAT-9920)"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                />

                <Input
                  label="Store / Warehouse Location"
                  id="bizAddress"
                  type="text"
                  placeholder="100 Innovation Pkwy, Suite 40"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading || loadingBusiness}
                  className="rounded-xl"
                >
                  {business ? 'Save Business Changes' : 'Create & Activate Business'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default BusinessProfilePage;
