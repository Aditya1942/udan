import { usePageMeta } from '../hooks/usePageMeta';
import { Section } from '../components/Section';

export default function OtherServicesPage() {
  usePageMeta({
    title: 'Other Services',
    description: 'Hotel booking, flight and train tickets, travel insurance, passport services and currency exchange from UDAN Immigration & Tours, Ahmedabad.',
  });
  return (
    <Section>
      <h1>Other Services</h1>
    </Section>
  );
}
