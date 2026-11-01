/**
 * Seam 1: the Enquiry form against the Firestore emulator (with the real rules loaded).
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initializeApp } from 'firebase/app';
import { getFirestore, terminate, Timestamp, type Firestore } from 'firebase/firestore';
import { MemoryRouter } from 'react-router';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ServiceId } from '../content/business';
import { connectEmulatorDb, createRulesEnv, readAll } from '../test/firestoreEmulator';
import { EnquiryForm, type GetDb } from './EnquiryForm';

let env: RulesTestEnvironment;
let db: Firestore;
let dispose: () => Promise<void>;

beforeAll(async () => {
  env = await createRulesEnv('demo-udan-form');
  ({ db, dispose } = connectEmulatorDb(env));
});

afterAll(async () => {
  await dispose?.();
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const inquiries = () => readAll(env, 'inquiries');

function renderForm(
  props: { defaultService?: ServiceId; destination?: string; sourcePage?: string; getDb?: GetDb } = {},
) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <EnquiryForm sourcePage="/contact" getDb={() => Promise.resolve(db)} {...props} />
    </MemoryRouter>,
  );
  const form = screen.getByRole('region', { name: 'Send us an enquiry' });
  const ui = within(form);
  return {
    user,
    form,
    name: ui.getByLabelText('Your name'),
    phone: ui.getByLabelText('Phone number'),
    service: ui.getByLabelText('Service of interest') as HTMLSelectElement,
    message: ui.getByLabelText(/Message/),
    submit: ui.getByRole('button', { name: /Send enquiry|Try again/ }),
  };
}

async function fill(
  f: ReturnType<typeof renderForm>,
  { name = 'Asha Patel', phone = '98765 43210', service = 'visa-services', message = '' } = {},
) {
  if (name) await f.user.type(f.name, name);
  if (phone) await f.user.type(f.phone, phone);
  if (service) await f.user.selectOptions(f.service, service);
  if (message) await f.user.type(f.message, message);
}

const successMessage = () => screen.findByRole('heading', { name: /your enquiry has been sent/i });

describe('EnquiryForm', () => {
  it('stores a normalised enquiry and shows success', async () => {
    const f = renderForm();
    await fill(f, { name: '  Asha Patel ', phone: '098765-43210', service: 'hotel-booking', message: 'Two rooms in Goa' });
    await f.user.click(f.submit);

    expect(await successMessage()).toHaveFocus();
    const docs = await inquiries();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      name: 'Asha Patel',
      phone: '+919876543210',
      service: 'hotel-booking',
      message: 'Two rooms in Goa',
      sourcePage: '/contact',
      destination: null,
      status: 'new',
    });
    const createdAt = docs[0].createdAt as Timestamp;
    expect(createdAt.toMillis()).toBeGreaterThan(Date.now() - 60_000);
    expect(screen.getByRole('status')).toHaveTextContent(/your enquiry has been sent/i);

    await f.user.click(screen.getByRole('button', { name: 'Send another enquiry' }));
    expect(screen.getByLabelText('Your name')).toHaveValue('');
    expect(screen.getByLabelText('Your name')).toHaveFocus();
  });

  it('shows required-field errors and writes nothing', async () => {
    const f = renderForm();
    await f.user.click(f.submit);

    expect(f.name).toHaveAccessibleDescription('Please enter your name.');
    expect(f.phone).toHaveAccessibleDescription(/Please enter your phone number\./);
    expect(f.service).toHaveAccessibleDescription('Please choose a service.');
    expect(f.name).toHaveAttribute('aria-invalid', 'true');
    expect(f.name).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Please fix the 3 highlighted fields.');
    expect(await inquiries()).toHaveLength(0);
  });

  it('rejects an invalid phone number and writes nothing', async () => {
    const f = renderForm();
    await fill(f, { phone: '12345' });
    await f.user.click(f.submit);

    expect(f.phone).toHaveAccessibleDescription(/Enter a valid Indian mobile number/);
    expect(f.phone).toHaveFocus();
    expect(f.name).not.toHaveAttribute('aria-invalid');
    expect(await inquiries()).toHaveLength(0);

    // Fixing the field clears its error.
    await f.user.clear(f.phone);
    await f.user.type(f.phone, '9876543210');
    expect(f.phone).not.toHaveAttribute('aria-invalid');
  });

  it.each(['+91 98765 43210', '91-98765-43210', '9876543210'])('normalises phone %j to E.164', async (phone) => {
    const f = renderForm();
    await fill(f, { phone });
    await f.user.click(f.submit);
    await successMessage();
    expect((await inquiries()).map((d) => d.phone)).toEqual(['+919876543210']);
  });

  it('prefills service and destination and stores them', async () => {
    const f = renderForm({ defaultService: 'international-domestic-tours', destination: 'Dubai', sourcePage: '/' });
    expect(f.service).toHaveValue('international-domestic-tours');
    expect(f.form).toHaveTextContent('Enquiring about: International & Domestic Tours · Dubai');

    await fill(f, { service: '' });
    await f.user.click(f.submit);
    await successMessage();
    expect(await inquiries()).toEqual([
      expect.objectContaining({ service: 'international-domestic-tours', destination: 'Dubai', sourcePage: '/' }),
    ]);
  });

  it('pretends to succeed but writes nothing when the honeypot is filled', async () => {
    const f = renderForm();
    await fill(f);
    const honeypot = f.form.querySelector<HTMLInputElement>('input[name="website"]')!;
    await f.user.type(honeypot, 'https://spam.example');
    await f.user.click(f.submit);

    await successMessage();
    expect(await inquiries()).toHaveLength(0);
  });

  it('disables the submit button while sending', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const f = renderForm({ getDb: () => gate.then(() => db) });
    await fill(f);
    await f.user.click(f.submit);

    expect(f.submit).toBeDisabled();
    expect(f.submit).toHaveTextContent('Sending…');
    await f.user.click(f.submit);

    release();
    await successMessage();
    expect(await inquiries()).toHaveLength(1);
  });

  it('keeps input and offers Call and WhatsApp when the database is unreachable', async () => {
    // A client that can no longer reach Firestore (terminated), as if the emulator had stopped.
    const deadApp = initializeApp({ projectId: env.projectId, apiKey: 'demo-api-key' }, 'dead');
    const deadDb = getFirestore(deadApp);
    await terminate(deadDb);

    const f = renderForm({ getDb: () => Promise.resolve(deadDb), destination: 'Bali' });
    await fill(f, { message: 'Honeymoon in March' });
    await f.user.click(f.submit);

    const call = await screen.findByRole('link', { name: 'Call Us' });
    expect(call).toHaveAttribute('href', 'tel:+919687232015');
    expect(screen.getByRole('link', { name: /WhatsApp Us/ })).toHaveAttribute(
      'href',
      'https://wa.me/919687232015?text=' + encodeURIComponent("Hi UDAN, I'd like to enquire about Visa Services (Bali)"),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/couldn't send your enquiry/i);
    expect(f.name).toHaveValue('Asha Patel');
    expect(f.phone).toHaveValue('98765 43210');
    expect(f.service).toHaveValue('visa-services');
    expect(f.message).toHaveValue('Honeymoon in March');
    expect(f.submit).toBeEnabled();
    expect(f.submit).toHaveTextContent('Try again');
    expect(await inquiries()).toHaveLength(0);
  });

  it('falls back to Call and WhatsApp when Firebase is not configured', async () => {
    const f = renderForm({ getDb: () => Promise.resolve(null) });
    await fill(f);
    await f.user.click(f.submit);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("Online enquiries aren't available right now."),
    );
    expect(screen.getByRole('link', { name: 'Call Us' })).toBeInTheDocument();
    expect(f.name).toHaveValue('Asha Patel');
    expect(await inquiries()).toHaveLength(0);
  });
});
