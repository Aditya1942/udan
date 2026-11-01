import { ButtonLink, EmptyState, PageHeader, useAdminTitle } from '../ui';

/** Unknown `/admin/*` — admin-styled 404 inside the shell. */
export function NotFoundScreen() {
  useAdminTitle('Page not found');
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState title="There's nothing at this address." action={<ButtonLink to="/admin">Go to the dashboard</ButtonLink>}>
        Check the link, or use the menu above.
      </EmptyState>
    </>
  );
}
