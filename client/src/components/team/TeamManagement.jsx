import { useState, useEffect, useCallback } from 'react';
import { teamService } from '../../services/teamService';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { useConfirm } from '../../hooks/useConfirm';
import { useSnackbar } from '../../hooks/useSnackbar';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Clock,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Mail,
  Crown,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';

export const TeamManagement = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useSnackbar();
  const currency = business?.currency || 'USD';

  const [teamData, setTeamData] = useState({
    owner: null,
    members: [],
    invitations: [],
    isOwner: false,
    currentUserRole: 'USER',
  });
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('USER');
  const [inviteLimits, setInviteLimits] = useState({
    maxTransactionAmount: '',
    canRecordSale: true,
    canRecordPurchase: true,
    canManageProducts: false,
    canManageParties: false,
    canDeleteRecords: false,
    canViewReports: false,
  });
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Edit limits modal state
  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('USER');
  const [editLimits, setEditLimits] = useState({
    maxTransactionAmount: '',
    canRecordSale: true,
    canRecordPurchase: true,
    canManageProducts: false,
    canManageParties: false,
    canDeleteRecords: false,
    canViewReports: false,
  });
  const [savingLimits, setSavingLimits] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeam();
      setTeamData(data);
    } catch (err) {
      showError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // When role changes in invite form, adjust default recommendations
  const handleRoleChange = (newRole) => {
    setInviteRole(newRole);
    if (newRole === 'MANAGER') {
      setInviteLimits((prev) => ({
        ...prev,
        canManageProducts: true,
        canManageParties: true,
        canViewReports: true,
      }));
    } else {
      setInviteLimits((prev) => ({
        ...prev,
        canManageProducts: false,
        canManageParties: false,
        canViewReports: false,
      }));
    }
  };

  const handleOpenInvite = () => {
    setInviteEmail('');
    setInviteRole('USER');
    setInviteLimits({
      maxTransactionAmount: '',
      canRecordSale: true,
      canRecordPurchase: true,
      canManageProducts: false,
      canManageParties: false,
      canDeleteRecords: false,
      canViewReports: false,
    });
    setInviteError('');
    setIsInviteOpen(true);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Please enter the user email address.');
      return;
    }

    try {
      setSubmittingInvite(true);
      setInviteError('');
      await teamService.inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        limits: {
          ...inviteLimits,
          maxTransactionAmount: Number(inviteLimits.maxTransactionAmount) || 0,
        },
      });

      showSuccess(`Invitation sent to ${inviteEmail}. They will see it in their website notifications.`);
      setIsInviteOpen(false);
      fetchTeam();
    } catch (err) {
      const errorMsg = err.message || 'Failed to send invitation';
      setInviteError(errorMsg);
      showError(errorMsg);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleOpenEditLimits = (member) => {
    if (member.role === 'OWNER' || member.user?._id === teamData.owner?._id) {
      showError('The business owner has full unrestricted access and cannot have limits.');
      return;
    }

    setEditingMember(member);
    setEditRole(member.role || 'USER');
    setEditLimits({
      maxTransactionAmount: member.limits?.maxTransactionAmount ? String(member.limits.maxTransactionAmount) : '',
      canRecordSale: member.limits?.canRecordSale !== false,
      canRecordPurchase: member.limits?.canRecordPurchase !== false,
      canManageProducts: Boolean(member.limits?.canManageProducts),
      canManageParties: Boolean(member.limits?.canManageParties),
      canDeleteRecords: Boolean(member.limits?.canDeleteRecords),
      canViewReports: Boolean(member.limits?.canViewReports),
    });
    setEditError('');
  };

  const handleSaveLimits = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setSavingLimits(true);
      setEditError('');
      await teamService.updateMemberLimits(editingMember.user._id, {
        role: editRole,
        limits: {
          ...editLimits,
          maxTransactionAmount: Number(editLimits.maxTransactionAmount) || 0,
        },
      });

      showSuccess(`Updated permissions for ${editingMember.user.name}.`);
      setEditingMember(null);
      fetchTeam();
    } catch (err) {
      const errorMsg = err.message || 'Failed to update member limits';
      setEditError(errorMsg);
      showError(errorMsg);
    } finally {
      setSavingLimits(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const isConfirmed = await confirm({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove ${member.user?.name} (${member.user?.email}) from ${business?.name}? They will lose access to this business immediately.`,
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await teamService.removeMember(member.user._id);
      showSuccess(`${member.user?.name} was removed from the business team.`);
      fetchTeam();
    } catch (err) {
      showError(err.message || 'Failed to remove member');
    }
  };

  const handleCancelInvite = async (invitation) => {
    const isConfirmed = await confirm({
      title: 'Cancel Invitation',
      message: `Cancel the pending invitation sent to ${invitation.inviteeEmail}?`,
      confirmText: 'Cancel Invitation',
      cancelText: 'Keep Invitation',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await teamService.cancelInvitation(invitation._id);
      showSuccess('Invitation cancelled.');
      fetchTeam();
    } catch (err) {
      showError(err.message || 'Failed to cancel invitation');
    }
  };

  const isOwner = teamData.isOwner || user?.role === 'OWNER';

  // The owner has unrestricted access and never has limits; filter out owner from members roster
  const activeMembers = (teamData.members || []).filter((m) => {
    if (!m.user) return false;
    const mUserId = m.user._id || m.user;
    const ownerId = teamData.owner?._id || teamData.owner;
    return String(mUserId) !== String(ownerId) && m.role !== 'OWNER';
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Team Members & Roles
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-medium">
              {activeMembers.length + 1} members
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Invite managers and users, enforce single transaction limits, and manage operational permissions.
          </p>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenInvite}
            className="self-start sm:self-auto font-bold shadow-xs active:scale-95"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
          Loading team roster...
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Business Owner Card */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Business Creator & Owner
            </span>
            <Card className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-[#181b22]/90 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-sm shadow-xs">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {teamData.owner?.name || user?.name || 'Owner'}
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[10px] font-bold">
                        OWNER
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {teamData.owner?.email || user?.email}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <ShieldCheck className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                  <span>Full Administrative Access (No Limits)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* 2. Active Team Members (Managers & Users) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Staff & Managers ({activeMembers.length})
              </span>
            </div>

            {activeMembers.length === 0 ? (
              <Card className="py-10 px-4 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No additional team members yet
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm mx-auto">
                  Click "Add Member" above to invite existing users by their registered email address.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeMembers.map((member) => {
                  const mUser = member.user;
                  if (!mUser) return null;
                  const isManager = member.role === 'MANAGER';
                  const limits = member.limits || {};

                  return (
                    <Card
                      key={member._id || mUser._id}
                      className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#181b22] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Member Identity */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                            {mUser.name ? mUser.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                                {mUser.name}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isManager
                                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                }`}
                              >
                                {member.role || 'USER'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono">{mUser.email}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        {isOwner && (
                          <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLimits(member)}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span>Limits</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Remove from team"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Configured Limits Overview */}
                      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          Limits:
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 font-mono">
                          {limits.maxTransactionAmount > 0
                            ? `Max Txn: ${formatCurrency(limits.maxTransactionAmount, currency)}`
                            : 'Txn Amount: Unlimited'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            limits.canRecordSale !== false
                              ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Sales: {limits.canRecordSale !== false ? 'Allowed' : 'Blocked'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            limits.canRecordPurchase !== false
                              ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Purchases: {limits.canRecordPurchase !== false ? 'Allowed' : 'Blocked'}
                        </span>

                        {limits.canManageProducts && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                            Manage Stock
                          </span>
                        )}

                        {limits.canManageParties && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                            Manage Parties
                          </span>
                        )}

                        {limits.canDeleteRecords && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300">
                            Delete Audits
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Pending Website Invitations */}
          {teamData.invitations?.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Pending Invitations ({teamData.invitations.length})
              </span>
              <div className="space-y-2">
                {teamData.invitations.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {inv.invitee?.name || inv.inviteeEmail}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                            {inv.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {inv.inviteeEmail} • Awaiting response via website notification
                        </p>
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleCancelInvite(inv)}
                        className="text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Invite Member */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Add Team Member"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-750 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <p className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Direct Account Check
            </p>
            <p className="text-[11px] leading-relaxed">
              Enter the registered email of the user. Once invited, they will receive an in-app website notification with an option to accept or decline the team invitation.
            </p>
          </div>

          <Input
            label="User Email Address *"
            type="email"
            placeholder="e.g. staff.member@gmail.com"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          {/* Role Choice */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange('USER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  inviteRole === 'USER'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <div className="text-xs font-bold">Standard User</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Point-of-sale operator, records transactions within limits.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('MANAGER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  inviteRole === 'MANAGER'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <div className="text-xs font-bold">Manager</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Can manage inventory stock, contacts, and operational reports.
                </div>
              </button>
            </div>
          </div>

          {/* Operational Limits Configuration */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Operational Limits & Permissions
            </span>

            <Input
              label={`Maximum Single Transaction Amount (${currency})`}
              type="number"
              min="0"
              placeholder="0 for unlimited amount"
              value={inviteLimits.maxTransactionAmount}
              onChange={(e) =>
                setInviteLimits({ ...inviteLimits, maxTransactionAmount: e.target.value })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteLimits.canRecordSale}
                  onChange={(e) =>
                    setInviteLimits({ ...inviteLimits, canRecordSale: e.target.checked })
                  }
                  className="rounded text-zinc-900 focus:ring-zinc-400"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Can Record Sales
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteLimits.canRecordPurchase}
                  onChange={(e) =>
                    setInviteLimits({ ...inviteLimits, canRecordPurchase: e.target.checked })
                  }
                  className="rounded text-zinc-900 focus:ring-zinc-400"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Can Record Purchases
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteLimits.canManageProducts}
                  onChange={(e) =>
                    setInviteLimits({ ...inviteLimits, canManageProducts: e.target.checked })
                  }
                  className="rounded text-zinc-900 focus:ring-zinc-400"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Can Manage Products
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteLimits.canManageParties}
                  onChange={(e) =>
                    setInviteLimits({ ...inviteLimits, canManageParties: e.target.checked })
                  }
                  className="rounded text-zinc-900 focus:ring-zinc-400"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Can Manage Parties
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteLimits.canViewReports}
                  onChange={(e) =>
                    setInviteLimits({ ...inviteLimits, canViewReports: e.target.checked })
                  }
                  className="rounded text-zinc-900 focus:ring-zinc-400"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Can View Reports
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteLimits.canDeleteRecords}
                  onChange={(e) =>
                    setInviteLimits({ ...inviteLimits, canDeleteRecords: e.target.checked })
                  }
                  className="rounded text-zinc-900 focus:ring-zinc-400"
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Can Delete Audits
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={submittingInvite}
              className="font-bold"
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Member Limits */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title={`Edit Limits: ${editingMember?.user?.name || 'Member'}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveLimits} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditRole('USER')}
              className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                editRole === 'USER'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Standard User
            </button>
            <button
              type="button"
              onClick={() => setEditRole('MANAGER')}
              className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                editRole === 'MANAGER'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Manager
            </button>
          </div>

          <Input
            label={`Maximum Single Transaction Amount (${currency})`}
            type="number"
            min="0"
            placeholder="0 for unlimited amount"
            value={editLimits.maxTransactionAmount}
            onChange={(e) =>
              setEditLimits({ ...editLimits, maxTransactionAmount: e.target.value })
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editLimits.canRecordSale}
                onChange={(e) =>
                  setEditLimits({ ...editLimits, canRecordSale: e.target.checked })
                }
                className="rounded text-zinc-900 focus:ring-zinc-400"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Can Record Sales
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editLimits.canRecordPurchase}
                onChange={(e) =>
                  setEditLimits({ ...editLimits, canRecordPurchase: e.target.checked })
                }
                className="rounded text-zinc-900 focus:ring-zinc-400"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Can Record Purchases
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editLimits.canManageProducts}
                onChange={(e) =>
                  setEditLimits({ ...editLimits, canManageProducts: e.target.checked })
                }
                className="rounded text-zinc-900 focus:ring-zinc-400"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Can Manage Products
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editLimits.canManageParties}
                onChange={(e) =>
                  setEditLimits({ ...editLimits, canManageParties: e.target.checked })
                }
                className="rounded text-zinc-900 focus:ring-zinc-400"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Can Manage Parties
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editLimits.canViewReports}
                onChange={(e) =>
                  setEditLimits({ ...editLimits, canViewReports: e.target.checked })
                }
                className="rounded text-zinc-900 focus:ring-zinc-400"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Can View Reports
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editLimits.canDeleteRecords}
                onChange={(e) =>
                  setEditLimits({ ...editLimits, canDeleteRecords: e.target.checked })
                }
                className="rounded text-zinc-900 focus:ring-zinc-400"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Can Delete Audits
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingMember(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={savingLimits}
              className="font-bold"
            >
              Save Permissions
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
