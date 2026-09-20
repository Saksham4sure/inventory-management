import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const OnboardingPage = () => {
  const { user } = useAuth();

  const hasAddress = Boolean(user?.location?.formattedAddress && user?.location?.formattedAddress.trim());
  const hasKyc = Boolean(
    user?.kyc?.documentNumber &&
    user?.kyc?.frontImage &&
    user?.kyc?.backImage &&
    user?.kyc?.status &&
    user?.kyc?.status !== 'NOT_SUBMITTED' &&
    user?.kyc?.status !== 'REJECTED'
  );

  if (hasAddress && hasKyc && user?.onboardingCompleted) {
    if (user?.userType === 'CUSTOMER') {
      return <Navigate to={ROUTES.CUSTOMER_PURCHASES} replace />;
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="relative min-h-screen bg-[#F4F5F7] dark:bg-[#0f1117] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="app-ambient-glow" />
      {/* Top right theme toggle with z-[60] so it is accessible and not hidden behind modal backdrops */}
      <div className="fixed top-5 right-5 sm:top-7 sm:right-7 z-[60]">
        <ThemeToggle />
      </div>
      <OnboardingModal isOpen={true} isMandatory={true} />
    </div>
  );
};

export default OnboardingPage;
