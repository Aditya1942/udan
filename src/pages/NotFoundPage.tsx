import { Link } from 'react-router';
import { Section } from '../components/Section';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description: 'The page you were looking for could not be found.',
  });
  return (
    <Section narrow>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </Section>
  );
}
