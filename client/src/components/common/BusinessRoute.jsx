import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const BusinessRoute = () => {
  const { hasBusiness, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!hasBusiness) {
    const isKycVerified = user?.kyc?.status === 'VERIFIED';

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#181b22]/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md mx-auto">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {!isKycVerified ? 'Identity Verification Required' : 'Business Profile Required'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {!isKycVerified
              ? 'Government regulations require identity verification (Nepali Citizenship or Driving License) before you can configure a business profile and unlock inventory operations.'
              : 'You skipped business setup during registration. Configure your store or warehouse profile to unlock product catalogs, QR label tracking, and point-of-sale features.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            {!isKycVerified ? (
              <Link to={ROUTES.PROFILE}>
                <Button variant="primary" className="w-full sm:w-auto">
                  Verify KYC Document <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <Link to={ROUTES.BUSINESS_PROFILE}>
                <Button variant="primary" className="w-full sm:w-auto">
                  Set Up Business <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
            <Link to={ROUTES.DASHBOARD}>
              <Button variant="secondary" className="w-full sm:w-auto">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
export default BusinessRoute;
