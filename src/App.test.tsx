import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { appRoutes } from './App';

function renderAt(path: string) {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('site shell', () => {
  it('marks the current page in the main nav', () => {
    renderAt('/visa-services');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Visa Services' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(document.title).toBe('Visa Services | UDAN Immigration & Tours');
  });

  it('toggles the mobile menu and closes it on Escape and navigation', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await user.click(within(nav).getByRole('link', { name: 'About Us' }));
    expect(screen.getByRole('heading', { level: 1, name: 'About UDAN' })).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('prefills the enquiry form from query params', () => {
    renderAt('/contact?service=visa-services&destination=Dubai#enquiry');
    const form = screen.getByRole('region', { name: 'Send us an enquiry' });
    expect(form).toHaveTextContent('Enquiring about: Visa Services · Dubai');
    expect(within(form).getByLabelText('Service of interest')).toHaveValue('visa-services');
  });

  it('ignores an unknown service in the query', () => {
    renderAt('/contact?service=free-holidays');
    const form = screen.getByRole('region', { name: 'Send us an enquiry' });
    expect(within(form).getByLabelText('Service of interest')).toHaveValue('');
  });

  it('shows the enquiry form on the home page', () => {
    renderAt('/');
    const form = screen.getByRole('region', { name: 'Send us an enquiry' });
    expect(within(form).getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument();
    expect(within(form).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
  });

  it('shows a 404 page for unknown routes', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
