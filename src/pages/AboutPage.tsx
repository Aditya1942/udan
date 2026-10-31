import { usePageMeta } from '../hooks/usePageMeta';
import { Section } from '../components/Section';

export default function AboutPage() {
  usePageMeta({
    title: 'About Us',
    description: 'About UDAN Immigration & Tours: travel, visa and passport services from one office in Bodakdev, Ahmedabad.',
  });
  return (
    <Section>
      <h1>About UDAN</h1>
    </Section>
  );
}
