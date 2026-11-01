import { useParams } from 'react-router';
import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/dmcs/:id` */
export function DmcDetailScreen() {
  const { id = '' } = useParams();
  useAdminTitle('DMC');
  return (
    <>
      <PageHeader title="DMC" subtitle={id} back={{ to: '/admin/dmcs', label: 'DMCs' }} />
      <Placeholder title="DMC detail" />
    </>
  );
}
