import { useAdminTitle } from '../ui';
import { DashboardHeader } from './DashboardHeader';
import { Placeholder } from './Placeholder';

/** `/admin` — month bar, stats, Needs attention, Bookings Calendar | Table (phase: Overview dashboard). */
export function OverviewScreen() {
  useAdminTitle('Dashboard');
  return (
    <>
      <DashboardHeader />
      <Placeholder title="Overview">Month stats, Needs attention and the Bookings calendar and table arrive in a later phase.</Placeholder>
    </>
  );
}
