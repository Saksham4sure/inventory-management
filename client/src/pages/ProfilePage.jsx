import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../utils/formatters';
import { User, Shield, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();

  // Profile details state
  const [name, setName] = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Full name is required');
      return;
    }

    try {
      setProfileLoading(true);
      const res = await authService.updateProfile({ name: name.trim() });
      if (res?.user) {
        updateUser(res.user);
      }
      setProfileSuccess('Profile name updated successfully');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      await authService.updateProfile({
        name: user?.name || name,
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          User Profile
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your personal account credentials, role access, and security settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Account Badge & Quick Summary */}
        <div className="md:col-span-4 space-y-4">
          <Card className="text-center p-6 flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-2xl shadow-md ring-4 ring-black/[0.04] dark:ring-white/[0.06] mb-3.5">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {user?.name || 'User'}
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
              {user?.email}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Badge variant="accent" dot>
                {user?.role || 'OWNER'}
              </Badge>
              <Badge variant="neutral">
                Active Account
              </Badge>
            </div>

            <div className="w-full mt-6 pt-5 border-t border-black/[0.05] dark:border-white/[0.08] text-left space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Account ID</span>
                <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {user?._id ? user._id.slice(-8) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Member Since</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {user?.createdAt ? formatDate(user.createdAt) : 'Recently'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Profile Form & Password Form */}
        <div className="md:col-span-8 space-y-6">
          {/* Personal Info Card */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Personal Details
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Update your display name and view account email
                </p>
              </div>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs text-purple-700 dark:text-purple-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Full Name"
                id="fullName"
                type="text"
                placeholder="e.g. Alex Mercer"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Email Address"
                id="emailAddress"
                type="email"
                disabled
                value={user?.email || ''}
                helperText="Email address is tied to your login identity and cannot be changed directly."
              />

              <div className="flex justify-end pt-1">
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

          {/* Security & Password Card */}
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

            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs text-purple-700 dark:text-purple-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

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
    </div>
  );
};
export default ProfilePage;
