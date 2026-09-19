import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const OnboardingPage = () => {
  const { user } = useAuth();

  if (user?.userType === 'CUSTOMER') {
    return <Navigate to={ROUTES.CUSTOMER_PURCHASES} replace />;
  }

  return (
    <div className="relative min-h-screen bg-[#F4F5F7] dark:bg-[#0f1117] flex items-center justify-center p-4">
      <div className="app-ambient-glow" />
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
        <ThemeToggle />
      </div>
      <OnboardingModal isOpen={true} isMandatory={true} />
    </div>
  );
};

export default OnboardingPage;
