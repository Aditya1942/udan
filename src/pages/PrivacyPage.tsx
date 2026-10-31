import { usePageMeta } from '../hooks/usePageMeta';
import { Section } from '../components/Section';

export default function PrivacyPage() {
  usePageMeta({
    title: 'Privacy',
    description: 'How UDAN Immigration & Tours handles the details you share when you send an enquiry.',
  });
  return (
    <Section>
      <h1>Privacy</h1>
    </Section>
  );
}
