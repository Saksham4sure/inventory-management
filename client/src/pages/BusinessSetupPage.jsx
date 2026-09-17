import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ROUTES } from '../constants/routes';
import { Building2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

export const BusinessSetupPage = () => {
  const navigate = useNavigate();
  const { setupBusiness } = useBusiness();

  const [formData, setFormData] = useState({
    name: '',
    category: 'Retail Store',
    currency: 'USD',
    phone: '',
    address: '',
    taxNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Business name is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await setupBusiness(formData);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to configure business profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F4F5F7] dark:bg-[#0f1117] p-4 transition-colors duration-300">
      <div className="app-ambient-glow" />

      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md ring-4 ring-black/[0.04] dark:ring-white/[0.06] mb-3.5">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Setup Business Profile
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure your business entity to activate your QR inventory workspace
          </p>
        </div>

        <div className="rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#181b22]/75 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.4)] ring-1 ring-white/80 dark:ring-white/[0.05] transition-all">
          {/* Subtle subscription plan notice */}
          <div className="mb-5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] p-3.5 flex items-start gap-2.5 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Tier: Standard Business Trial.
              </span>{' '}
              Full access to automatic QR generation, live camera scanning, and inventory tracking
              is enabled for your initial workspace.
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50/80 p-3 text-xs text-rose-700 border border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Business / Store Name"
              id="businessName"
              type="text"
              placeholder="e.g. Apex Retail Labs"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Appears on printed QR shelf labels and receipts"
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
              <Input
                label="Contact Phone"
                id="phone"
                type="tel"
                placeholder="+1 234 567 890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label="Tax / VAT Number"
                id="taxNumber"
                type="text"
                placeholder="Optional (e.g. VAT-8801)"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>

            <Input
              label="Store / Warehouse Address"
              id="address"
              type="text"
              placeholder="100 Innovation Parkway, Suite 40"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <div className="space-y-2 pt-1">
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Complete Setup & Open Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => navigate(ROUTES.DASHBOARD, { replace: true })}
              >
                Skip for now (Set up later)
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default BusinessSetupPage;
