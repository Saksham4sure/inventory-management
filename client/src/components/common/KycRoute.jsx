import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const KycRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  // Super admin bypasses tenant KYC requirements
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  if (isSuperAdmin) {
    return <Outlet />;
  }

  const isKycVerified = user?.kyc?.status === 'VERIFIED';

  if (!isKycVerified) {
    return (
      <Navigate
        to={`${ROUTES.ONBOARDING}?required=kyc&from=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <Outlet />;
};

export default KycRoute;
