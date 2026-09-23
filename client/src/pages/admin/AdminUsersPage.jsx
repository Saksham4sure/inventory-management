import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { Select } from '../../components/ui/Select';
import {
  Users,
  Search,
  Filter,
  Shield,
  KeyRound,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  X,
  AlertTriangle,
  FileCheck2,
  Eye,
  Clock,
  ShieldCheck,
  MapPin,
  Phone,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  ZoomIn,
  EyeOff,
} from 'lucide-react';

export const AdminUsersPage = () => {
  const [searchParams] = useSearchParams();
  const urlKyc = searchParams.get('kyc');
  const urlUserId = searchParams.get('userId');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState(urlKyc || 'ALL');

  // Modals
  const [editModal, setEditModal] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  // KYC Verification Modal States
  const [kycModal, setKycModal] = useState(null); // { user, kyc }
  const [kycLoading, setKycLoading] = useState(false);
  const [kycActionLoading, setKycActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // { url, title }
  const [copiedDoc, setCopiedDoc] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    username: '',
    role: 'OWNER',
    isActive: true,
  });

  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getUsers({
        search,
        role: roleFilter,
        isActive: activeFilter,
        kycStatus: kycFilter,
      });
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch platform users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, roleFilter, activeFilter, kycFilter]);

  // Auto-open user KYC modal if requested via notification or URL
  useEffect(() => {
    if (urlUserId) {
      setKycLoading(true);
      adminService
        .getUserKyc(urlUserId)
        .then((data) => {
          if (data?.user) {
            setKycModal(data);
          }
        })
        .catch((err) => {
          console.error('Failed to load user KYC via URL param:', err);
        })
        .finally(() => {
          setKycLoading(false);
        });
    }
  }, [urlUserId]);

  // KYC Modal Handlers
  const openKycModal = async (u) => {
    try {
      setKycLoading(true);
      setShowRejectForm(false);
      setRejectionReason('');
      setActionSuccess('');
      const data = await adminService.getUserKyc(u._id);
      setKycModal(data);
    } catch (err) {
      alert(err.message || 'Failed to load user KYC identity documents');
    } finally {
      setKycLoading(false);
    }
  };

  const handleVerifyKyc = async (status) => {
    if (!kycModal?.user) return;

    if (status === 'REJECTED' && !rejectionReason.trim()) {
      alert('Please enter or select a rejection reason so the user knows what to correct.');
      return;
    }

    try {
      setKycActionLoading(true);
      await adminService.verifyUserKyc(kycModal.user._id, {
        status,
        rejectionReason: rejectionReason.trim(),
      });

      setActionSuccess(
        `User identity document has been ${
          status === 'VERIFIED' ? 'approved' : 'rejected'
        }! Notification sent to user.`
      );

      // Refresh modal state and background users table
      const updated = await adminService.getUserKyc(kycModal.user._id);
      setKycModal(updated);
      setShowRejectForm(false);
      setRejectionReason('');
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update KYC status');
    } finally {
      setKycActionLoading(false);
    }
  };

  const handleCopyDocNumber = (num) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  // Edit User
  const openEditModal = (u) => {
    setEditModal(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      username: u.username || '',
      role: u.role || 'OWNER',
      isActive: u.isActive !== false,
    });
    setActionSuccess('');
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editModal) return;

    try {
      setActionLoading(true);
      await adminService.updateUser(editModal._id, editForm);
      setActionSuccess('User updated successfully!');
      setTimeout(() => {
        setEditModal(null);
        fetchUsers();
      }, 750);
    } catch (err) {
      alert(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Password
  const openPasswordModal = (u) => {
    setPasswordModal(u);
    setNewPassword('');
    setActionSuccess('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordModal) return;

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setActionLoading(true);
      await adminService.updateUser(passwordModal._id, { newPassword });
      setActionSuccess('Password reset successfully!');
      setTimeout(() => {
        setPasswordModal(null);
        fetchUsers();
      }, 750);
    } catch (err) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (u) => {
    try {
      await adminService.updateUser(u._id, { isActive: !u.isActive });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deleteModal) return;

    try {
      setActionLoading(true);
      await adminService.deleteUser(deleteModal._id);
      setDeleteModal(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-500" />
            Platform Users Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Global accounts, roles (Platform Admin, Owner, Manager, Staff), password overrides, and access governance.
          </p>
        </div>

        <span className="text-xs text-zinc-500 font-mono">
          {users.length} {users.length === 1 ? 'user' : 'users'} registered
        </span>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 pl-10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-600"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-40 sm:w-44">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Roles' },
                { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
                { value: 'OWNER', label: 'OWNER' },
                { value: 'MANAGER', label: 'MANAGER' },
                { value: 'STAFF', label: 'STAFF' },
              ]}
              compact
            />
          </div>

          <div className="w-40 sm:w-44">
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'true', label: 'Active Only' },
                { value: 'false', label: 'Suspended Only' },
              ]}
              compact
            />
          </div>

          <div className="w-44 sm:w-48">
            <Select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All KYC Statuses' },
                { value: 'PENDING', label: 'Pending Review' },
                { value: 'VERIFIED', label: 'Verified' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'NOT_SUBMITTED', label: 'Not Submitted' },
              ]}
              compact
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="text-xs text-zinc-400">Loading platform users...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No users found</p>
            <p className="text-xs text-zinc-400 mt-0.5">Try adjusting search parameters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Email / Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Tenant Business</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Identity (KYC)</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {users.map((u) => {
                  const isSuper = u.role === 'SUPER_ADMIN';

                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuper
                                ? 'bg-zinc-800 text-white shadow-xs'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}
                          >
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-white block">
                              {u.name}
                            </span>
                            {u.username && (
                              <span className="text-[10px] font-mono text-zinc-800 dark:text-zinc-400">
                                @{u.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">
                        {u.email}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                            isSuper
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : u.role === 'OWNER'
                              ? 'bg-zinc-600/10 text-zinc-800 dark:text-zinc-400 border border-zinc-600/20'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <Shield className="h-2.5 w-2.5" />
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {u.businessId ? (
                          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="font-medium">{u.businessId.name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">None (Independent)</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Suspended
                            </>
                          )}
                        </button>
                      </td>

                      {/* KYC Status Column */}
                      <td className="px-4 py-3.5">
                        {u.kyc?.status === 'VERIFIED' ? (
                          <button
                            type="button"
                            onClick={() => openKycModal(u)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                            title="Click to view verified documents"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </button>
                        ) : u.kyc?.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => openKycModal(u)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer transition-all animate-pulse"
                            title="Submitted documents need review"
                          >
                            <Clock className="h-3 w-3" />
                            Needs Review
                          </button>
                        ) : u.kyc?.status === 'REJECTED' ? (
                          <button
                            type="button"
                            onClick={() => openKycModal(u)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer transition-colors"
                            title="Click to view rejection details"
                          >
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </button>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 text-[11px] italic">
                            Not submitted
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-zinc-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Review KYC Button */}
                          <button
                            onClick={() => openKycModal(u)}
                            title="Review Identity (KYC) Documents"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.kyc?.status === 'PENDING'
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100'
                            }`}
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => openPasswordModal(u)}
                            title="Reset Password"
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit User Profile"
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950/60 text-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {!isSuper && (
                            <button
                              onClick={() => setDeleteModal(u)}
                              title="Delete User"
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Edit User */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setEditModal(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-600" />
              Edit User Account
            </h3>

            {actionSuccess && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {actionSuccess}
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Username (optional identifier)
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="e.g. admin or john_doe"
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <Select
                  label="Platform Role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  options={[
                    { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN (Platform Administrator)' },
                    { value: 'OWNER', label: 'OWNER (Business Account Holder)' },
                    { value: 'MANAGER', label: 'MANAGER (Business Manager)' },
                    { value: 'STAFF', label: 'STAFF (Operational)' },
                    { value: 'USER', label: 'USER (General User)' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-600"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  Account is Active (Uncheck to suspend access)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-600 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setPasswordModal(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Reset User Password
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {passwordModal.name} ({passwordModal.email})
                </p>
              </div>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {actionSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 pr-9 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Overriding...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete User Confirmation */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Delete User Account?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Are you sure you want to delete <span className="font-semibold">{deleteModal.name}</span> ({deleteModal.email})?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: KYC Document Inspection & Verification */}
      {kycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#14161f] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                setKycModal(null);
                setShowRejectForm(false);
                setRejectionReason('');
              }}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/25 shrink-0">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                    KYC Validation
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {kycModal.user?.name}
                  </span>
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white mt-0.5">
                  Identity Document Verification Review
                </h3>
              </div>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* 1. User Profile Summary Grid */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 mb-5 space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                User Profile Summary
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Full Name</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {kycModal.user?.name}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Email Address</span>
                  <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                    {kycModal.user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Contact Phone</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {kycModal.user?.phone || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Date of Birth</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {kycModal.user?.dob
                      ? new Date(kycModal.user.dob).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Not provided'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-zinc-400 block text-[11px]">Registered Address</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {kycModal.user?.location?.formattedAddress ||
                      (kycModal.user?.location?.district
                        ? `${kycModal.user.location.street || ''} ${kycModal.user.location.ward || ''}, ${kycModal.user.location.municipality || ''}, ${kycModal.user.location.district || ''}, ${kycModal.user.location.province || ''}`
                        : 'Not specified')}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Identity Document Attributes */}
            <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-950/30 border border-zinc-300/60 dark:border-zinc-900/40 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400">
                  Government Document Details
                </span>
                <span className="flex items-center gap-1.5">
                  {kycModal.kyc?.status === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" /> VERIFIED
                    </span>
                  )}
                  {kycModal.kyc?.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                      <Clock className="h-3 w-3" /> PENDING REVIEW
                    </span>
                  )}
                  {kycModal.kyc?.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <XCircle className="h-3 w-3" /> REJECTED
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Document Type</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {kycModal.kyc?.documentType === 'DRIVING_LICENSE'
                      ? 'Driving License'
                      : 'Nepali Citizenship'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Identification Number</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {kycModal.kyc?.documentNumber || 'N/A'}
                    </span>
                    {kycModal.kyc?.documentNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopyDocNumber(kycModal.kyc.documentNumber)}
                        className="text-zinc-400 hover:text-zinc-800 transition-colors p-0.5 cursor-pointer"
                        title="Copy document number"
                      >
                        {copiedDoc ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {kycModal.kyc?.submittedAt && (
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Submitted On</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {new Date(kycModal.kyc.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(kycModal.kyc.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {kycModal.kyc?.reviewedAt && (
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Reviewed On</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {new Date(kycModal.kyc.reviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Previous Rejection Reason Display */}
              {kycModal.kyc?.status === 'REJECTED' && kycModal.kyc?.rejectionReason && (
                <div className="mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                  <strong>Previous Rejection Reason:</strong> "{kycModal.kyc.rejectionReason}"
                </div>
              )}
            </div>

            {/* 3. Document Photos (Front & Back) */}
            <div className="space-y-2 mb-6">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                Uploaded Document Copies
              </span>

              {kycModal.kyc?.frontImage || kycModal.kyc?.backImage ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Front Side Photo
                      </span>
                      <span className="text-[10px] text-zinc-800 dark:text-zinc-400 flex items-center gap-1 font-medium">
                        <ZoomIn className="h-3 w-3" /> Click to zoom
                      </span>
                    </div>
                    {kycModal.kyc.frontImage ? (
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: kycModal.kyc.frontImage,
                            title: `${kycModal.user?.name} - Front Side Document`,
                          })
                        }
                        className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group cursor-pointer aspect-[16/10] bg-zinc-100 dark:bg-zinc-900 shadow-sm"
                      >
                        <img
                          src={kycModal.kyc.frontImage}
                          alt="Front Side"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                          <Eye className="h-4 w-4" />
                          <span>Inspect Full Resolution</span>
                        </div>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white font-medium">
                          Front Side
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-xs text-zinc-400">
                        Front image missing
                      </div>
                    )}
                  </div>

                  {/* Back Side */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Back Side Photo
                      </span>
                      <span className="text-[10px] text-zinc-800 dark:text-zinc-400 flex items-center gap-1 font-medium">
                        <ZoomIn className="h-3 w-3" /> Click to zoom
                      </span>
                    </div>
                    {kycModal.kyc.backImage ? (
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: kycModal.kyc.backImage,
                            title: `${kycModal.user?.name} - Back Side Document`,
                          })
                        }
                        className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group cursor-pointer aspect-[16/10] bg-zinc-100 dark:bg-zinc-900 shadow-sm"
                      >
                        <img
                          src={kycModal.kyc.backImage}
                          alt="Back Side"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                          <Eye className="h-4 w-4" />
                          <span>Inspect Full Resolution</span>
                        </div>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white font-medium">
                          Back Side
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-xs text-zinc-400">
                        Back image missing
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                  No document images have been submitted by this user yet.
                </div>
              )}
            </div>

            {/* 4. Platform Compliance Review & Approval Controls */}
            {Boolean(kycModal.kyc?.frontImage || kycModal.kyc?.backImage) && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {showRejectForm ? (
                  /* Rejection Reason Form */
                  <div className="space-y-3 p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                    <div>
                      <label className="block text-xs font-bold text-rose-900 dark:text-rose-200 mb-1">
                        Specify Rejection Reason (sent directly to user):
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Image is blurry, document ID number mismatch, expired license..."
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 p-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    {/* Quick reason pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                        Quick presets:
                      </span>
                      {[
                        'Photos are too blurry or unreadable',
                        'Document ID number does not match photos',
                        'Document appears expired or invalid',
                        'Back side of document is missing or wrong',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectionReason(preset)}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-rose-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={kycActionLoading || !rejectionReason.trim()}
                        onClick={() => handleVerifyKyc('REJECTED')}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Confirm Rejection</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Main Action Buttons: Approve or Reject */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {kycModal.kyc?.status === 'VERIFIED'
                        ? 'Document is currently marked as verified.'
                        : kycModal.kyc?.status === 'REJECTED'
                        ? 'Document is currently rejected. User can re-upload anytime.'
                        : 'Review the document copies and validate the user identity.'}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        disabled={kycActionLoading}
                        className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject Document</span>
                      </button>

                      <button
                        type="button"
                        disabled={kycActionLoading || kycModal.kyc?.status === 'VERIFIED'}
                        onClick={() => handleVerifyKyc('VERIFIED')}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {kycModal.kyc?.status === 'VERIFIED' ? 'Verified' : 'Approve Identity'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL RESOLUTION IMAGE INSPECT MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-zinc-900/90 border-b border-zinc-800 text-white">
              <span className="text-xs font-semibold">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
