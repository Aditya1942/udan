import { usePageMeta } from '../hooks/usePageMeta';
import { Section } from '../components/Section';

export default function VisaServicesPage() {
  usePageMeta({
    title: 'Visa Services',
    description: 'Guidance with visa, visitor and business visitor visa, and passport applications from UDAN Immigration & Tours in Bodakdev, Ahmedabad.',
  });
  return (
    <Section>
      <h1>Visa Services</h1>
    </Section>
  );
}
