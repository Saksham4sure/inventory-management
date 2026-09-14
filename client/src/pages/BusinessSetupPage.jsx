import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../constants/routes';
import { Building2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      setError(err.message || 'Failed to setup business profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-100 via-indigo-50/40 to-slate-100 p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 mb-3">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Configure Your Business
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Complete your business profile to initialize your QR-powered inventory system
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
          {/* Subscription note banner */}
          <div className="mb-6 rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Subscription Tier: Standard Free Trial
                </h4>
                <p className="text-xs text-indigo-700/90 mt-1 leading-relaxed">
                  StockPulse operates on a subscription architecture. For your initial launch, all
                  QR generation, stock tracking, and sales/purchase operations are fully unlocked.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Business / Store Name"
              id="businessName"
              type="text"
              placeholder="e.g. Apex Hardware & Supplies"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="This name will appear on all your printed QR labels and invoices"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Business Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Base Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                id="phone"
                type="tel"
                placeholder="+1 234 567 890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label="Tax / VAT / PAN Number"
                id="taxNumber"
                type="text"
                placeholder="Optional (e.g. VAT-88219)"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>

            <Input
              label="Store / Warehouse Address"
              id="address"
              type="text"
              placeholder="123 Commerce Way, Suite 400"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-4">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Launch My Inventory Dashboard
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default BusinessSetupPage;
