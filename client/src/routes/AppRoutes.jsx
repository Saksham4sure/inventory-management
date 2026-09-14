import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

// Layouts
import { AuthLayout } from '../components/layout/AuthLayout';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Route Guards
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { BusinessRoute } from '../components/common/BusinessRoute';

// Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import BusinessSetupPage from '../pages/BusinessSetupPage';
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import QRScanPage from '../pages/QRScanPage';
import TransactionsPage from '../pages/TransactionsPage';

export const AppRoutes = () => {
  const { isAuthenticated, hasBusiness, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">Loading StockPulse QR...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path={ROUTES.HOME}
        element={
          isAuthenticated ? (
            hasBusiness ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <Navigate to={ROUTES.BUSINESS_SETUP} replace />
            )
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
              hasBusiness ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <Navigate to={ROUTES.BUSINESS_SETUP} replace />
              )
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path={ROUTES.REGISTER}
          element={
            isAuthenticated ? (
              hasBusiness ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <Navigate to={ROUTES.BUSINESS_SETUP} replace />
              )
            ) : (
              <RegisterPage />
            )
          }
        />
      </Route>

      {/* Protected Routes (requires login) */}
      <Route element={<ProtectedRoute />}>
        {/* Business Onboarding Setup (when user signs up but hasn't configured business) */}
        <Route
          path={ROUTES.BUSINESS_SETUP}
          element={
            hasBusiness ? <Navigate to={ROUTES.DASHBOARD} replace /> : <BusinessSetupPage />
          }
        />

        {/* Operational Business Routes (requires login + configured business) */}
        <Route element={<BusinessRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
            <Route path={ROUTES.SCAN} element={<QRScanPage />} />
            <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Wildcard 404 redirect */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
};
export default AppRoutes;
