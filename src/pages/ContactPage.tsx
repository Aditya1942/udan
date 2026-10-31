import { InquiryFormSlot } from '../components/InquiryFormSlot';
import { Section } from '../components/Section';
import { useEnquiryParams } from '../hooks/useEnquiryParams';
import { usePageMeta } from '../hooks/usePageMeta';

export default function ContactPage() {
  usePageMeta({
    title: 'Contact',
    description:
      'Call, WhatsApp or visit UDAN Immigration & Tours at Meghdeep Shopping Center, Bodakdev, Ahmedabad. Contact Dolly Shah on +91 96872 32015.',
  });
  const { defaultService, destination } = useEnquiryParams();
  return (
    <Section>
      <h1>Contact Us</h1>
      <InquiryFormSlot defaultService={defaultService} destination={destination} sourcePage="/contact" />
    </Section>
  );
}
