import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../hooks/useSnackbar';
import { formatDate } from '../../utils/formatters';
import {
  Bell,
  Check,
  CheckCheck,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Loader2,
  CreditCard,
  ArrowRight,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';

export const NotificationBell = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    respondToInvitation,
  } = useNotifications();
  const { showSuccess, showError, showInfo } = useSnackbar();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const notificationsRoute = isSuperAdmin ? '/platform-admin/notifications' : '/notifications';

  const [isOpen, setIsOpen] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
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
      const msg = err.message || `Failed to ${action.toLowerCase()} invitation`;
      showError(msg);
    } finally {
      setRespondingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      showSuccess('All notifications marked as read');
    } catch (err) {
      showError(err.message || 'Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TEAM_INVITATION':
        return <UserPlus className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />;
      case 'INVITATION_ACCEPTED':
        return <CheckCircle2 className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />;
      case 'INVITATION_REJECTED':
        return <XCircle className="h-4 w-4 text-zinc-500" />;
      case 'LIMITS_UPDATED':
      case 'ROLE_UPDATED':
        return <Shield className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />;
      case 'SUBSCRIPTION_REQUEST':
        return <CreditCard className="h-4 w-4 text-indigo-500" />;
      case 'SUBSCRIPTION_APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'SUBSCRIPTION_REJECTED':
        return <XCircle className="h-4 w-4 text-rose-500" />;
      case 'KYC_SUBMITTED':
        return <FileCheck2 className="h-4 w-4 text-amber-500" />;
      case 'KYC_APPROVED':
        return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
      case 'KYC_REJECTED':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        title="Notifications"
        aria-label="View Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.03] text-zinc-700 hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.1] transition-all duration-200 active:scale-90"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-bold px-1 ring-2 ring-white dark:ring-[#12141a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] sm:w-[380px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#181b22]/95 backdrop-blur-2xl shadow-2xl overflow-hidden select-none animate-ios-menu">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                unreadCount > 0
                  ? 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer'
                  : 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 overscroll-contain modal-scroll">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-2 text-zinc-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No notifications yet
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Invitations, team activity, and system updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isInvite = notif.type === 'TEAM_INVITATION';
                const isPendingInvite =
                  isInvite &&
                  notif.data?.invitationId &&
                  notif.invitationStatus === 'PENDING';

                return (
                  <div
                    key={notif._id}
                    onClick={() => !notif.isRead && markAsRead(notif._id)}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      notif.isRead
                        ? 'bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                        : 'bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-100/90 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Interactive Acceptance / Rejection for Team Invitations */}
                        {isPendingInvite && (
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-750">
                            <button
                              type="button"
                              disabled={respondingId === notif.data.invitationId}
                              onClick={(e) =>
                                handleRespond(e, notif.data.invitationId, 'ACCEPT')
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
                            >
                              {respondingId === notif.data.invitationId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>Accept & Join</span>
                            </button>

                            <button
                              type="button"
                              disabled={respondingId === notif.data.invitationId}
                              onClick={(e) =>
                                handleRespond(e, notif.data.invitationId, 'REJECT')
                              }
                              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* If already responded */}
                        {isInvite && notif.invitationStatus === 'ACCEPTED' && (
                          <div className="mt-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                            <span>Accepted</span>
                          </div>
                        )}

                        {isInvite && notif.invitationStatus === 'REJECTED' && (
                          <div className="mt-2 text-[11px] font-semibold text-zinc-400 inline-flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Declined</span>
                          </div>
                        )}

                        {notif.type === 'SUBSCRIPTION_REQUEST' && (
                          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            {notif.subscriptionStatus === 'PENDING' ? (
                              <Link
                                to="/platform-admin/subscriptions"
                                onClick={() => {
                                  setIsOpen(false);
                                  if (!notif.isRead) markAsRead(notif._id);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-2xs transition-colors"
                              >
                                <CreditCard className="h-3 w-3" />
                                <span>Review Applications</span>
                              </Link>
                            ) : notif.subscriptionStatus === 'APPROVED' ? (
                              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Request Approved</span>
                              </div>
                            ) : (
                              <div className="text-[11px] font-semibold text-zinc-400 inline-flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Request Rejected</span>
                              </div>
                            )}
                          </div>
                        )}

                        {notif.type === 'KYC_SUBMITTED' && isSuperAdmin && (
                          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            {notif.kycStatus === 'PENDING' ? (
                              <Link
                                to={
                                  notif.data?.targetUserId
                                    ? `/platform-admin/users?kyc=PENDING&userId=${notif.data.targetUserId}`
                                    : '/platform-admin/users?kyc=PENDING'
                                }
                                onClick={() => {
                                  setIsOpen(false);
                                  if (!notif.isRead) markAsRead(notif._id);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold shadow-2xs transition-colors"
                              >
                                <FileCheck2 className="h-3 w-3" />
                                <span>Review User Identity</span>
                              </Link>
                            ) : notif.kycStatus === 'VERIFIED' ? (
                              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Identity Verified</span>
                              </div>
                            ) : (
                              <div className="text-[11px] font-semibold text-zinc-400 inline-flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Identity Rejected</span>
                              </div>
                            )}
                          </div>
                        )}

                        {notif.type === 'KYC_REJECTED' && (
                          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <Link
                              to="/profile"
                              onClick={() => {
                                setIsOpen(false);
                                if (!notif.isRead) markAsRead(notif._id);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shadow-2xs transition-colors"
                            >
                              <span>Fix & Re-upload</span>
                            </Link>
                          </div>
                        )}

                        {notif.type === 'KYC_APPROVED' && (
                          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <Link
                              to="/profile"
                              onClick={() => {
                                setIsOpen(false);
                                if (!notif.isRead) markAsRead(notif._id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              <span>Verified Profile</span>
                            </Link>
                          </div>
                        )}
                      </div>

                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer link to View All Notifications page */}
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <Link
              to={notificationsRoute}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors w-full py-1.5 rounded-xl hover:bg-indigo-500/10 cursor-pointer"
            >
              <span>View all notifications</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
