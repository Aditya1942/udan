import { usePageMeta } from '../hooks/usePageMeta';
import { Section } from '../components/Section';

export default function HomePage() {
  usePageMeta({
    description: 'UDAN Immigration & Tours in Bodakdev, Ahmedabad: international and domestic tours, visa and passport guidance, tickets, hotels, travel insurance and currency exchange.',
  });
  return (
    <Section>
      <h1>Your Journey Begins with UDAN.</h1>
    </Section>
  );
}
