import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const SuperAdminRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <p className="text-xs font-mono tracking-wider text-zinc-400">Verifying Admin Clearance...</p>
        </div>
      </div>
    );
  }

  // Strictly enforce SUPER_ADMIN role
  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return <Navigate to={ROUTES.ADMIN_LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default SuperAdminRoute;
