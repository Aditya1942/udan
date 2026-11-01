import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/dmcs` */
export function DmcsScreen() {
  useAdminTitle('DMCs');
  return (
    <>
      <PageHeader title="DMCs" />
      <Placeholder title="DMCs" />
    </>
  );
}
