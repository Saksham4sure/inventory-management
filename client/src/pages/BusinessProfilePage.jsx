import { Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

/**
 * Legacy BusinessProfilePage
 * Business Profile is now unified with User Profile under the single /profile page.
 * Any direct navigation to /business/profile redirects cleanly to /profile?tab=business.
 */
export const BusinessProfilePage = () => {
  return <Navigate to={`${ROUTES.PROFILE}?tab=business`} replace />;
};

export default BusinessProfilePage;
