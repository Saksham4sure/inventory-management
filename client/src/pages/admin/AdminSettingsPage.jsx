import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Select } from '../../components/ui/Select';
import {
  Settings,
  Save,
  CheckCircle2,
  Shield,
  Bell,
  AlertTriangle,
  Server,
  Mail,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    platformName: 'StockPulse',
    supportEmail: 'support@stockpulse.com',
    allowRegistrations: true,
    maintenanceMode: false,
    noticeBanner: {
      active: false,
      message: '',
      level: 'info',
    },
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getSettings();
      const s = res.settings;
      if (s) {
        setForm({
          platformName: s.platformName || 'StockPulse',
          supportEmail: s.supportEmail || 'support@stockpulse.com',
          allowRegistrations: s.allowRegistrations !== false,
          maintenanceMode: s.maintenanceMode === true,
          noticeBanner: {
            active: s.noticeBanner?.active === true,
            message: s.noticeBanner?.message || '',
            level: s.noticeBanner?.level || 'info',
          },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccess('');
      setError('');
      await adminService.updateSettings(form);
      setSuccess('Platform settings successfully persisted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-zinc-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-500" />
          Platform Settings & Environment
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Global application branding, maintenance modes, tenant onboarding toggles, and system-wide broadcast alerts.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: General Branding & Support */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-500" />
            General Branding & Contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Platform Name
              </label>
              <input
                type="text"
                required
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Global Support Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 pl-10 text-xs text-zinc-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Platform Operational States */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-500" />
            Platform Availability & Tenancy Access
          </h2>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Toggle 1: Registrations */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                  Allow New Tenant Registrations
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  When disabled, new signups will be halted while existing users remain unaffected.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, allowRegistrations: !form.allowRegistrations })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  form.allowRegistrations ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    form.allowRegistrations ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Maintenance Mode */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                  Platform Maintenance Mode
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Puts the application into read-only or maintenance notice mode. Platform administrators retain access.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, maintenanceMode: !form.maintenanceMode })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  form.maintenanceMode ? 'bg-amber-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    form.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Broadcast Announcement Banner */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-500" />
              Global Notice Banner
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Banner Enabled</span>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    noticeBanner: {
                      ...form.noticeBanner,
                      active: !form.noticeBanner.active,
                    },
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  form.noticeBanner.active ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    form.noticeBanner.active ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Notice Message Text
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Scheduled database optimization at 02:00 UTC."
                value={form.noticeBanner.message}
                onChange={(e) =>
                  setForm({
                    ...form,
                    noticeBanner: {
                      ...form.noticeBanner,
                      message: e.target.value,
                    },
                  })
                }
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 text-xs text-zinc-900 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-64">
              <Select
                label="Severity Level"
                value={form.noticeBanner.level}
                onChange={(e) =>
                  setForm({
                    ...form,
                    noticeBanner: {
                      ...form.noticeBanner,
                      level: e.target.value,
                    },
                  })
                }
                options={[
                  { value: 'info', label: 'Info (Blue Notice)' },
                  { value: 'warning', label: 'Warning (Amber Notice)' },
                  { value: 'critical', label: 'Critical (Rose Notice)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving Platform Rules...' : 'Save All Platform Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
