import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/clients` */
export function ClientsScreen() {
  useAdminTitle('Clients');
  return (
    <>
      <PageHeader title="Clients" />
      <Placeholder title="Clients" />
    </>
  );
}
