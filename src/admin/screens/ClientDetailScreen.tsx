import { useParams } from 'react-router';
import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/clients/:id` */
export function ClientDetailScreen() {
  const { id = '' } = useParams();
  useAdminTitle('Client');
  return (
    <>
      <PageHeader title="Client" subtitle={id} back={{ to: '/admin/clients', label: 'Clients' }} />
      <Placeholder title="Client detail" />
    </>
  );
}
