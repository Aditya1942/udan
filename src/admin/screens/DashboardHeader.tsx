import { PageHeader, Tabs } from '../ui';

/** H1 "Dashboard" + Overview | Insights route tabs (keeps the query string between tabs). */
export function DashboardHeader({ search = '' }: { search?: string }) {
  return (
    <PageHeader title="Dashboard">
      <Tabs
        label="Dashboard"
        items={[
          { to: `/admin${search}`, label: 'Overview' },
          { to: `/admin/insights${search}`, label: 'Insights' },
        ]}
      />
    </PageHeader>
  );
}
