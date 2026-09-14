import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { Input } from '../components/ui/Input';
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
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs mb-3">
            <Building2 className="h-5 w-5 text-emerald-400 dark:text-emerald-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Setup Business Profile
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure your business entity to activate your QR inventory workspace
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 transition-all">
          {/* Subtle subscription plan notice */}
          <div className="mb-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
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
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Base Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>
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

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Complete Setup & Open Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default BusinessSetupPage;
