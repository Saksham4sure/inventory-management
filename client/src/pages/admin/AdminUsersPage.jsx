import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
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
} from 'lucide-react';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modals
  const [editModal, setEditModal] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
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
  }, [search, roleFilter, activeFilter]);

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
            Global accounts, roles (Super Admin, Owner, Manager, Staff), password overrides, and access governance.
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
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 pl-10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Shield className="h-3.5 w-3.5" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-hidden"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="OWNER">OWNER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 ml-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Suspended Only</option>
          </select>
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
                                ? 'bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-xs'
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
                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
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
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
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

                      <td className="px-4 py-3.5 text-zinc-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
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
              <Users className="h-4 w-4 text-indigo-500" />
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
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Platform Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Administrator)</option>
                  <option value="OWNER">OWNER (Business Account Holder)</option>
                  <option value="MANAGER">MANAGER (Business Manager)</option>
                  <option value="STAFF">STAFF (Operational)</option>
                  <option value="USER">USER (General User)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                />
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
    </div>
  );
};

export default AdminUsersPage;
