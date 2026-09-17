import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

// Layouts
import { AuthLayout } from '../components/layout/AuthLayout';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Route Guards
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { BusinessRoute } from '../components/common/BusinessRoute';

// Lazy-loaded pages for code splitting & minimal initial bundle
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const BusinessSetupPage = lazy(() => import('../pages/BusinessSetupPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const BusinessProfilePage = lazy(() => import('../pages/BusinessProfilePage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const QRScanPage = lazy(() => import('../pages/QRScanPage'));
const SalesPage = lazy(() => import('../pages/SalesPage'));
const PurchasesPage = lazy(() => import('../pages/PurchasesPage'));
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'));

const PageLoader = () => (
  <div className="flex min-h-[320px] w-full items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
  </div>
);

export const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root redirect */}
        <Route
          path={ROUTES.HOME}
          element={
            isAuthenticated ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          }
        />

        {/* Guest / Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path={ROUTES.LOGIN}
            element={
              isAuthenticated ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path={ROUTES.REGISTER}
            element={
              isAuthenticated ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <RegisterPage />
              )
            }
          />
        </Route>

        {/* Protected Routes (requires login) */}
        <Route element={<ProtectedRoute />}>
          {/* Standalone Business Onboarding Setup (optional) */}
          <Route path={ROUTES.BUSINESS_SETUP} element={<BusinessSetupPage />} />

          {/* Dashboard Shell */}
          <Route element={<DashboardLayout />}>
            {/* General routes accessible regardless of business setup */}
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.BUSINESS_PROFILE} element={<BusinessProfilePage />} />

            {/* Operational Business Routes (guarded with friendly setup prompt) */}
            <Route element={<BusinessRoute />}>
              <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
              <Route path={ROUTES.SCAN} element={<QRScanPage />} />
              <Route path={ROUTES.SALES} element={<SalesPage />} />
              <Route path={ROUTES.PURCHASES} element={<PurchasesPage />} />
              <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
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
