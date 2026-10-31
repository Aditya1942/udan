import { usePageMeta } from '../hooks/usePageMeta';
import { Section } from '../components/Section';

export default function ToursPage() {
  usePageMeta({
    title: 'Tours & Packages',
    description: 'Explore international and domestic holiday ideas with UDAN Immigration & Tours, Ahmedabad, and enquire about planning your next trip.',
  });
  return (
    <Section>
      <h1>Tours &amp; Packages</h1>
    </Section>
  );
}
