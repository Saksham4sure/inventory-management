import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const BusinessRoute = () => {
  const { hasBusiness, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!hasBusiness) {
    return <Navigate to={ROUTES.BUSINESS_SETUP} replace />;
  }

  return <Outlet />;
};
