import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useSnackbar } from '../hooks/useSnackbar';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatters';
import { ROUTES } from '../constants/routes';
import { partyService } from '../services/partyService';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  CreditCard,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Loader2,
  FileCheck2,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    respondToInvitation,
  } = useNotifications();

  const { showSuccess, showError, showInfo } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'subscriptions' | 'team' | 'kyc' | 'system'
  const [searchTerm, setSearchTerm] = useState('');
  const [respondingId, setRespondingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const filterTabs = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      count: notifications.filter((n) =>
        ['SUBSCRIPTION_REQUEST', 'SUBSCRIPTION_APPROVED', 'SUBSCRIPTION_REJECTED'].includes(n.type)
      ).length,
    },
    {
      id: 'kyc',
      label: 'Identity / KYC',
      count: notifications.filter((n) =>
        ['KYC_SUBMITTED', 'KYC_APPROVED', 'KYC_REJECTED'].includes(n.type)
      ).length,
    },
    {
      id: 'team',
      label: 'Team & Invites',
      count: notifications.filter((n) =>
        [
          'TEAM_INVITATION',
          'INVITATION_ACCEPTED',
          'INVITATION_REJECTED',
          'INVITATION_CANCELLED',
          'MEMBER_REMOVED',
          'ROLE_UPDATED',
          'LIMITS_UPDATED',
        ].includes(n.type)
      ).length,
    },
    {
      id: 'system',
      label: 'System',
      count: notifications.filter((n) => n.type === 'SYSTEM').length,
    },
  ];

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Filter by tab
      if (activeFilter === 'unread' && notif.isRead) return false;
      if (
        activeFilter === 'subscriptions' &&
        !['SUBSCRIPTION_REQUEST', 'SUBSCRIPTION_APPROVED', 'SUBSCRIPTION_REJECTED'].includes(notif.type)
      ) {
        return false;
      }
      if (
        activeFilter === 'kyc' &&
        !['KYC_SUBMITTED', 'KYC_APPROVED', 'KYC_REJECTED'].includes(notif.type)
      ) {
        return false;
      }
      if (
        activeFilter === 'team' &&
        ![
          'TEAM_INVITATION',
          'INVITATION_ACCEPTED',
          'INVITATION_REJECTED',
          'INVITATION_CANCELLED',
          'MEMBER_REMOVED',
          'ROLE_UPDATED',
          'LIMITS_UPDATED',
        ].includes(notif.type)
      ) {
        return false;
      }
      if (activeFilter === 'system' && notif.type !== 'SYSTEM') return false;

      // Filter by search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = notif.title?.toLowerCase().includes(query);
        const msgMatch = notif.message?.toLowerCase().includes(query);
        const businessMatch = notif.data?.businessName?.toLowerCase().includes(query);
        return titleMatch || msgMatch || businessMatch;
      }

      return true;
    });
  }, [notifications, activeFilter, searchTerm]);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      showSuccess('All notifications marked as read');
    } catch (err) {
      showError(err.message || 'Failed to mark all as read');
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm('Are you sure you want to remove all read notifications?')) return;
    try {
      setClearing(true);
      await clearReadNotifications();
      showSuccess('Cleared all read notifications');
    } catch (err) {
      showError(err.message || 'Failed to clear read notifications');
    } finally {
      setClearing(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      setDeletingId(id);
      await deleteNotification(id);
      showSuccess('Notification deleted');
    } catch (err) {
      showError(err.message || 'Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRespond = async (e, invitationId, action) => {
    e.stopPropagation();
    try {
      setRespondingId(invitationId);
      await respondToInvitation(invitationId, action);
      if (action === 'ACCEPT') {
        showSuccess('Invitation accepted! You are now part of the business team.');
      } else {
        showInfo('Invitation declined.');
      }
    } catch (err) {
      showError(err.message || `Failed to ${action.toLowerCase()} invitation`);
    } finally {
      setRespondingId(null);
    }
  };

  const handleRespondParty = async (e, partyId, action, notifId) => {
    e.stopPropagation();
    try {
      setRespondingId(partyId);
      await partyService.respondToPartyInvitation(partyId, action);
      if (action === 'ACCEPT') {
        showSuccess('Party connection accepted! Transactions and credit history can now begin.');
      } else {
        showInfo('Party request declined.');
      }
      if (notifId) {
        await markAsRead(notifId);
      }
      fetchNotifications();
    } catch (err) {
      showError(err.message || `Failed to ${action.toLowerCase()} party request`);
    } finally {
      setRespondingId(null);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SUBSCRIPTION_REQUEST':
        return (
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <CreditCard className="h-5 w-5" />
          </div>
        );
      case 'SUBSCRIPTION_APPROVED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        );
      case 'SUBSCRIPTION_REJECTED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <XCircle className="h-5 w-5" />
          </div>
        );
      case 'TEAM_INVITATION':
        return (
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <UserPlus className="h-5 w-5" />
          </div>
        );
      case 'INVITATION_ACCEPTED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        );
      case 'INVITATION_REJECTED':
      case 'INVITATION_CANCELLED':
      case 'MEMBER_REMOVED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-zinc-500/10 dark:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-500/20">
            <XCircle className="h-5 w-5" />
          </div>
        );
      case 'ROLE_UPDATED':
      case 'LIMITS_UPDATED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Shield className="h-5 w-5" />
          </div>
        );
      case 'KYC_SUBMITTED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <FileCheck2 className="h-5 w-5" />
          </div>
        );
      case 'KYC_APPROVED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
        );
      case 'KYC_REJECTED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <AlertCircle className="h-5 w-5" />
          </div>
        );
      case 'PARTY_INVITATION':
        return (
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
        );
      case 'PARTY_ACCEPTED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        );
      case 'PARTY_REJECTED':
        return (
          <div className="h-10 w-10 rounded-2xl bg-zinc-500/10 dark:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-500/20">
            <XCircle className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
            <AlertCircle className="h-5 w-5" />
          </div>
        );
    }
  };

  const getNotificationBadge = (type) => {
    switch (type) {
      case 'SUBSCRIPTION_REQUEST':
        return (
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold uppercase tracking-wider">
            Subscription Request
          </span>
        );
      case 'SUBSCRIPTION_APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
            Plan Approved
          </span>
        );
      case 'SUBSCRIPTION_REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold uppercase tracking-wider">
            Plan Declined
          </span>
        );
      case 'KYC_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
            KYC Submitted
          </span>
        );
      case 'KYC_APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
            Identity Verified
          </span>
        );
      case 'KYC_REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold uppercase tracking-wider">
            KYC Action Required
          </span>
        );
      case 'TEAM_INVITATION':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold uppercase tracking-wider">
            Team Invitation
          </span>
        );
      case 'ROLE_UPDATED':
      case 'LIMITS_UPDATED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
            Security & Role
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold uppercase tracking-wider">
            System
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-md">
              <Bell className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Notifications & Activity
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Stay on top of team invitations, subscription updates, approvals, and platform alerts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchNotifications()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
              unreadCount > 0
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white cursor-pointer'
                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed opacity-70'
            }`}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all read</span>
          </button>

          {notifications.some((n) => n.isRead) && (
            <button
              type="button"
              onClick={handleClearRead}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-500 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{clearing ? 'Clearing...' : 'Clear read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeFilter === tab.id
                      ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-950'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No notifications found
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? `No notifications matched your search "${searchTerm}". Try resetting the search or filter.`
                : activeFilter === 'unread'
                ? 'Great job! You have read all notifications.'
                : 'Activity alerts, invitation requests, and subscription notices will appear right here.'}
            </p>
            {(searchTerm || activeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveFilter('all');
                }}
                className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isInvite = notif.type === 'TEAM_INVITATION';
            const isPendingInvite =
              isInvite && notif.data?.invitationId && notif.invitationStatus === 'PENDING';

            return (
              <div
                key={notif._id}
                onClick={() => !notif.isRead && markAsRead(notif._id)}
                className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  notif.isRead
                    ? 'bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    : 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.06] border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                }`}
              >
                {/* Left: Icon & Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {getNotificationIcon(notif.type)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getNotificationBadge(notif.type)}

                      {!notif.isRead && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                          NEW
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono ml-auto sm:ml-0">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {notif.title}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Interactive Actions per Type */}
                    {isPendingInvite && (
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          type="button"
                          disabled={respondingId === notif.data.invitationId}
                          onClick={(e) => handleRespond(e, notif.data.invitationId, 'ACCEPT')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {respondingId === notif.data.invitationId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>Accept & Join Team</span>
                        </button>

                        <button
                          type="button"
                          disabled={respondingId === notif.data.invitationId}
                          onClick={(e) => handleRespond(e, notif.data.invitationId, 'REJECT')}
                          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Party Invitation Accept / Decline buttons */}
                    {notif.type === 'PARTY_INVITATION' && notif.data?.partyId && (
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        {notif.partyStatus === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              disabled={respondingId === notif.data.partyId}
                              onClick={(e) =>
                                handleRespondParty(e, notif.data.partyId, 'ACCEPT', notif._id)
                              }
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {respondingId === notif.data.partyId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>Accept Party Connection</span>
                            </button>

                            <button
                              type="button"
                              disabled={respondingId === notif.data.partyId}
                              onClick={(e) =>
                                handleRespondParty(e, notif.data.partyId, 'REJECT', notif._id)
                              }
                              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        ) : notif.partyStatus === 'ACCEPTED' ? (
                          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Party connection accepted</span>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-zinc-400 inline-flex items-center gap-1.5">
                            <XCircle className="h-4 w-4" />
                            <span>Party request declined</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isInvite && notif.invitationStatus === 'ACCEPTED' && (
                      <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Invitation accepted and active</span>
                      </div>
                    )}

                    {isInvite && notif.invitationStatus === 'REJECTED' && (
                      <div className="mt-2 text-xs font-semibold text-zinc-400 inline-flex items-center gap-1.5">
                        <XCircle className="h-4 w-4" />
                        <span>Invitation was declined</span>
                      </div>
                    )}

                    {notif.type === 'SUBSCRIPTION_REQUEST' && isSuperAdmin && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <Link
                          to="/platform-admin/subscriptions"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Review in Administration Console</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}

                    {['SUBSCRIPTION_APPROVED', 'SUBSCRIPTION_REJECTED'].includes(notif.type) && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <Link
                          to={ROUTES.SUBSCRIPTION}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <span>Go to Subscription & Plans</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}

                    {notif.type === 'KYC_SUBMITTED' && isSuperAdmin && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <Link
                          to={
                            notif.data?.targetUserId
                              ? `/platform-admin/users?kyc=PENDING&userId=${notif.data.targetUserId}`
                              : '/platform-admin/users?kyc=PENDING'
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>Review Identity Document</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}

                    {notif.type === 'KYC_REJECTED' && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <Link
                          to={ROUTES.PROFILE}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <span>Re-upload Identity Document</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}

                    {notif.type === 'KYC_APPROVED' && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <Link
                          to={ROUTES.PROFILE}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>View Verified Profile</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  {!notif.isRead ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif._id);
                      }}
                      title="Mark as read"
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      Read
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={deletingId === notif._id}
                    onClick={(e) => handleDelete(notif._id, e)}
                    title="Delete notification"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
