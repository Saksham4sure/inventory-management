import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

// Layouts
import { AuthLayout } from '../components/layout/AuthLayout';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PlatformAdminLayout } from '../components/layout/PlatformAdminLayout';

// Route Guards
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { BusinessRoute } from '../components/common/BusinessRoute';
import { KycRoute } from '../components/common/KycRoute';
import { SuperAdminRoute } from '../components/common/SuperAdminRoute';

// Lazy-loaded pages for standard tenant workspace
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const BusinessSetupPage = lazy(() => import('../pages/BusinessSetupPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const BusinessProfilePage = lazy(() => import('../pages/BusinessProfilePage'));
const TeamPage = lazy(() => import('../pages/TeamPage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const QRScanPage = lazy(() => import('../pages/QRScanPage'));
const SalesPage = lazy(() => import('../pages/SalesPage'));
const PurchasesPage = lazy(() => import('../pages/PurchasesPage'));
const BusinessExpensesPage = lazy(() => import('../pages/BusinessExpensesPage'));
const PartiesPage = lazy(() => import('../pages/PartiesPage'));
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'));
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const CustomerPurchasesPage = lazy(() => import('../pages/CustomerPurchasesPage'));
const CustomerCreditsPage = lazy(() => import('../pages/CustomerCreditsPage'));

// Lazy-loaded Platform Admin pages (Isolated from regular users)
const PlatformAdminLoginPage = lazy(() => import('../pages/admin/PlatformAdminLoginPage'));
const AdminOverviewPage = lazy(() => import('../pages/admin/AdminOverviewPage'));
const AdminBusinessesPage = lazy(() => import('../pages/admin/AdminBusinessesPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminSubscriptionsPage = lazy(() => import('../pages/admin/AdminSubscriptionsPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));

const PageLoader = () => (
  <div className="flex min-h-[320px] w-full items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
  </div>
);

export const AppRoutes = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F4F5F7] dark:bg-[#0f1117]">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Loading StockPulse...</p>
        </div>
      </div>
    );
  }

  const getAuthenticatedRedirect = () => {
    if (isSuperAdmin) return ROUTES.ADMIN_DASHBOARD;

    const hasAddress = Boolean(user?.location?.formattedAddress && user?.location?.formattedAddress.trim());
    const hasKyc = Boolean(
      user?.kyc?.documentNumber &&
      user?.kyc?.frontImage &&
      user?.kyc?.backImage &&
      user?.kyc?.status &&
      user?.kyc?.status !== 'NOT_SUBMITTED' &&
      user?.kyc?.status !== 'REJECTED'
    );
    const hasSkippedKyc = Boolean(user?.kycSkipped || user?.onboardingCompleted);

    if (!hasAddress || (!hasKyc && !hasSkippedKyc)) {
      return ROUTES.ONBOARDING;
    }

    if (user?.userType === 'CUSTOMER') return ROUTES.CUSTOMER_PURCHASES;
    return ROUTES.DASHBOARD;
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root redirect */}
        <Route
          path={ROUTES.HOME}
          element={
            isAuthenticated ? (
              <Navigate to={getAuthenticatedRedirect()} replace />
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          }
        />

        {/* Guest / Auth Routes for Tenants */}
        <Route element={<AuthLayout />}>
          <Route
            path={ROUTES.LOGIN}
            element={
              isAuthenticated ? (
                <Navigate to={getAuthenticatedRedirect()} replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path={ROUTES.REGISTER}
            element={
              isAuthenticated ? (
                <Navigate to={getAuthenticatedRedirect()} replace />
              ) : (
                <RegisterPage />
              )
            }
          />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
        </Route>

        {/* Platform Admin Dedicated Login Route */}
        <Route
          path={ROUTES.ADMIN_LOGIN}
          element={
            isAuthenticated && isSuperAdmin ? (
              <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />
            ) : (
              <PlatformAdminLoginPage />
            )
          }
        />

        {/* Platform Admin Protected Routes (Strictly restricted to SUPER_ADMIN) */}
        <Route element={<SuperAdminRoute />}>
          <Route element={<PlatformAdminLayout />}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminOverviewPage />} />
            <Route path={ROUTES.ADMIN_BUSINESSES} element={<AdminBusinessesPage />} />
            <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={ROUTES.ADMIN_SUBSCRIPTIONS} element={<AdminSubscriptionsPage />} />
            <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminSettingsPage />} />
            <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path="/platform-admin" element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />} />
          </Route>
        </Route>

        {/* Protected Routes for Standard Tenant Users (Requires login) */}
        <Route element={<ProtectedRoute />}>
          {/* Multi-step Onboarding Wizard Modal */}
          <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
          <Route path={ROUTES.BUSINESS_SETUP} element={<OnboardingPage />} />

          {/* Dashboard Shell */}
          <Route element={<DashboardLayout />}>
            {/* General routes accessible regardless of business setup */}
            <Route
              path={ROUTES.DASHBOARD}
              element={
                user?.userType === 'CUSTOMER' ? (
                  <Navigate to={ROUTES.CUSTOMER_PURCHASES} replace />
                ) : (
                  <DashboardPage />
                )
              }
            />
            <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.CUSTOMER_PURCHASES} element={<CustomerPurchasesPage />} />
            <Route path={ROUTES.CUSTOMER_CREDITS} element={<CustomerCreditsPage />} />
            {/* Subscription Route (requires verified KYC) */}
            <Route element={<KycRoute />}>
              <Route path={ROUTES.SUBSCRIPTION} element={<SubscriptionPage />} />
            </Route>
            <Route path={ROUTES.BUSINESS_PROFILE} element={<BusinessProfilePage />} />
            <Route path={ROUTES.TEAM} element={<TeamPage />} />

            {/* Operational Business Routes (guarded with friendly setup prompt) */}
            <Route element={<BusinessRoute />}>
              <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
              <Route path={ROUTES.SCAN} element={<QRScanPage />} />
              <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />

              {/* KYC-Mandatory Business Operations */}
              <Route element={<KycRoute />}>
                <Route path={ROUTES.SALES} element={<SalesPage />} />
                <Route path={ROUTES.PURCHASES} element={<PurchasesPage />} />
                <Route path={ROUTES.EXPENSES} element={<BusinessExpensesPage />} />
                <Route path={ROUTES.PARTIES} element={<PartiesPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* Wildcard 404 redirect */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
