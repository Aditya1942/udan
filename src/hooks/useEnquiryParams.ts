import { useSearchParams } from 'react-router';
import { isServiceId, type ServiceId } from '../content/business';

/** Reads ?service=&destination= (set by Enquire links); ignores unknown services, caps destination length. */
export function useEnquiryParams(): { defaultService?: ServiceId; destination?: string } {
  const [params] = useSearchParams();
  const service = params.get('service');
  const destination = params.get('destination')?.trim().slice(0, 100) || undefined;
  return { defaultService: isServiceId(service) ? service : undefined, destination };
}
