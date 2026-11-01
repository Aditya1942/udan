import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/enquiries` */
export function EnquiriesScreen() {
  useAdminTitle('Enquiries');
  return (
    <>
      <PageHeader title="Enquiries" />
      <Placeholder title="Enquiries" />
    </>
  );
}
