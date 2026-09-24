import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const ProtectedRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-white"></div>
          <p className="text-xs font-medium text-zinc-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Mandatory Verification Gate:
  // Address is mandatory for all users before operating the app.
  // Users who choose "Skip for now" on KYC can access general operations.
  // Users who are not fully verified can still visit Onboarding to complete their KYC.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  if (!isSuperAdmin) {
    const hasVerifiedAddress = Boolean(
      user?.location?.formattedAddress && user?.location?.formattedAddress.trim()
    );
    const hasUploadedKyc = Boolean(
      user?.kyc?.documentNumber &&
      user?.kyc?.frontImage &&
      user?.kyc?.backImage &&
      user?.kyc?.status &&
      user?.kyc?.status !== 'NOT_SUBMITTED' &&
      user?.kyc?.status !== 'REJECTED'
    );
    const isKycVerified = user?.kyc?.status === 'VERIFIED';
    const canAccessGeneralApp = hasVerifiedAddress && (hasUploadedKyc || user?.kycSkipped || user?.onboardingCompleted);

    if (!canAccessGeneralApp) {
      if (location.pathname !== ROUTES.ONBOARDING && location.pathname !== ROUTES.BUSINESS_SETUP) {
        return <Navigate to={ROUTES.ONBOARDING} replace />;
      }
    } else {
      // Only redirect away from Onboarding if user has fully verified KYC
      if (isKycVerified && (location.pathname === ROUTES.ONBOARDING || location.pathname === ROUTES.BUSINESS_SETUP)) {
        return <Navigate to={user?.userType === 'CUSTOMER' ? ROUTES.CUSTOMER_PURCHASES : ROUTES.DASHBOARD} replace />;
      }
    }
  }

  return <Outlet />;
};
