/** `/admin/insights` — lazy route (will lazy-import Recharts). Default export for React.lazy. */
import { useAdminTitle } from '../ui';
import { DashboardHeader } from './DashboardHeader';
import { Placeholder } from './Placeholder';

export default function InsightsScreen() {
  useAdminTitle('Insights');
  return (
    <>
      <DashboardHeader />
      <Placeholder title="Insights">FY KPIs, charts and top tables arrive in a later phase.</Placeholder>
    </>
  );
}
