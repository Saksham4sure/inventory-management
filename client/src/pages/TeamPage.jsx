import { useBusiness } from '../hooks/useBusiness';
import { TeamManagement } from '../components/team/TeamManagement';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

export const TeamPage = () => {
  const { business, loadingBusiness } = useBusiness();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Team Management
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Invite members to {business?.name || 'your business'}, manage roles (Owner, Manager, User), and enforce transaction limits.
          </p>
        </div>

        {business && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(ROUTES.BUSINESS_PROFILE)}
            className="text-xs self-start sm:self-auto"
          >
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Business Profile
          </Button>
        )}
      </div>

      {!business && !loadingBusiness ? (
        <Card className="p-8 text-center rounded-2xl">
          <Building2 className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No Business Configured
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            You need to create or be part of a business profile to manage a team. Set up your business profile to get started.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(ROUTES.BUSINESS_PROFILE)}
            className="mt-4"
          >
            Go to Business Profile
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Card>
      ) : (
        <TeamManagement />
      )}
    </div>
  );
};

export default TeamPage;
