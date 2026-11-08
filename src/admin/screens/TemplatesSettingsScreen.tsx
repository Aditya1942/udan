/**
 * `/admin/settings/templates` — pick the default template for the Invoice, Admin invoice and Voucher (preview every
 * family with sample data + the real Business profile), and edit the WhatsApp / email texts sent with live links.
 * Saved in `settings/documents`. The PDF preview is a lazy chunk.
 */
import { Check, RotateCcw } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { saveDocumentSettings, useAdminDb, useDocuments } from '../data';
import {
  DEFAULT_MESSAGES,
  fillMessage,
  MESSAGE_KEYS,
  MESSAGE_LABEL,
  MESSAGE_MAX_CHARS,
  MESSAGE_PLACEHOLDERS,
  messageTemplate,
  type DocumentSettings,
  type MessageKey,
  type MessageVars,
} from '../model';
import { defaultTemplate, TEMPLATE_CATALOG, TEMPLATE_DOC_LABEL, templateName, type TemplateDocKind } from '../pdf/catalog';
import { Button, errorMessage, ErrorState, Field, LinkButton, LoadingState, PageHeader, Panel, Segmented, useAdminTitle, useToast } from '../ui';
import { SettingsTabs } from './settings/SettingsTabs';

const TemplatePreview = lazy(() => import('../pdf/settingsPreview'));

const DOC_KINDS: TemplateDocKind[] = ['invoice', 'admin', 'voucher'];
const DOC_HINT: Record<TemplateDocKind, string> = {
  invoice: 'Sent to the customer (PDF and live link).',
  admin: 'Internal copy with DMCs, costs and margin. Never shared.',
  voucher: 'Sent to the customer (PDF and live link).',
};

export function TemplatesSettingsScreen() {
  useAdminTitle('Templates');
  const { settings } = useDocuments();
  return (
    <>
      <PageHeader title="Settings">
        <SettingsTabs />
      </PageHeader>
      <div className="adm-stack adm-tpl">
        {settings.status === 'loading' ? (
          <Panel title="Default templates">
            <LoadingState lines={6} label="Loading templates" />
          </Panel>
        ) : settings.status === 'error' && settings.error ? (
          <Panel title="Default templates">
            <ErrorState title="Couldn't load Document settings" error={settings.error} />
          </Panel>
        ) : (
          <>
            <DefaultsPanel settings={settings.data} />
            <MessagesPanel settings={settings.data} />
          </>
        )}
      </div>
    </>
  );
}

function DefaultsPanel({ settings }: { settings: DocumentSettings }) {
  const db = useAdminDb();
  const toast = useToast();
  const { profile } = useDocuments();
  const [kind, setKind] = useState<TemplateDocKind>('invoice');
  const current = defaultTemplate(settings, kind);
  const [viewing, setViewing] = useState(current);
  const [busy, setBusy] = useState(false);

  // Switching document shows its default first.
  useEffect(() => setViewing(defaultTemplate(settings, kind)), [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const makeDefault = async () => {
    setBusy(true);
    try {
      await saveDocumentSettings(db, { ...settings, defaults: { ...settings.defaults, [kind]: viewing } });
      toast(`${TEMPLATE_DOC_LABEL[kind]} now uses ${templateName(viewing)}`);
    } catch (error) {
      toast(errorMessage(error as Error), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Default templates">
      <p className="adm-muted adm-tpl__intro">
        Each booking uses these unless you pick another template on its Documents card.
      </p>
      <dl className="adm-tpl__summary">
        {DOC_KINDS.map((k) => (
          <div key={k}>
            <dt>{TEMPLATE_DOC_LABEL[k]}</dt>
            <dd>{templateName(defaultTemplate(settings, k))}</dd>
          </div>
        ))}
      </dl>
      <Segmented<TemplateDocKind>
        label="Document"
        value={kind}
        onChange={setKind}
        options={DOC_KINDS.map((k) => ({ value: k, label: TEMPLATE_DOC_LABEL[k] }))}
      />
      <p className="adm-sub">{DOC_HINT[kind]}</p>
      <div className="adm-tpl__grid">
        <div className="adm-tpl__list" role="group" aria-label={`${TEMPLATE_DOC_LABEL[kind]} templates`}>
          {TEMPLATE_CATALOG.map((t) => (
            <button key={t.id} type="button" className="adm-tpl__item" aria-pressed={t.id === viewing} onClick={() => setViewing(t.id)}>
              <span className="adm-tpl__item-head">
                <strong>{t.name}</strong>
                {t.id === current ? (
                  <span className="adm-tpl__badge">
                    <Check aria-hidden /> Default
                  </span>
                ) : null}
              </span>
              <span className="adm-sub">{t.tagline}</span>
            </button>
          ))}
        </div>
        <div className="adm-tpl__side">
          <div className="adm-tpl__bar">
            <strong>{templateName(viewing)}</strong>
            {viewing === current ? (
              <span className="adm-sub">Default for {TEMPLATE_DOC_LABEL[kind].toLowerCase()}</span>
            ) : (
              <Button size="sm" variant="primary" busy={busy} onClick={makeDefault}>
                Use as default
              </Button>
            )}
          </div>
          <Suspense fallback={<div className="adm-tpl__state adm-tpl__state--busy">Loading preview…</div>}>
            <TemplatePreview familyId={viewing} kind={kind} profile={profile.data} />
          </Suspense>
        </div>
      </div>
    </Panel>
  );
}

const draftsOf = (s: DocumentSettings): Record<MessageKey, string> =>
  Object.fromEntries(MESSAGE_KEYS.map((k) => [k, messageTemplate(s, k)])) as Record<MessageKey, string>;

function MessagesPanel({ settings }: { settings: DocumentSettings }) {
  const db = useAdminDb();
  const toast = useToast();
  const { profile } = useDocuments();
  const saved = useMemo(() => draftsOf(settings), [settings]);
  const [drafts, setDrafts] = useState(saved);
  const [key, setKey] = useState<MessageKey>('invoiceWhatsapp');
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = MESSAGE_KEYS.some((k) => drafts[k] !== saved[k]);
  const text = drafts[key];

  const sample: MessageVars = {
    name: 'Asha',
    fullName: 'Asha Patel',
    bookingNo: 'UDN-014',
    invoiceNo: 'UDAN/2026-27/014',
    trip: 'Kerala (12 Dec 2026 – 18 Dec 2026)',
    total: '₹1,48,500',
    balance: '₹48,500',
    paymentLine: 'Balance due: ₹48,500 by 5 Dec 2026. Bank and UPI details are on the invoice.',
    pendingLine: '1 service is still being confirmed. This link updates automatically once it is.',
    link: `${window.location.origin}/d/xY7…`,
    tradingName: profile.data.tradingName ?? 'UDAN Immigration & Tours',
    phone: (profile.data.phones ?? '').split(/[\n,]/)[0]?.trim() || '+91 96872 32015',
  };

  const setText = (value: string) => setDrafts((d) => ({ ...d, [key]: value }));
  const insert = (token: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    const next = `${text.slice(0, at)}{${token}}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      const caret = at + token.length + 2;
      el?.setSelectionRange(caret, caret);
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      // Store only texts that differ from the default, so improved defaults reach untouched messages.
      const messages = Object.fromEntries(MESSAGE_KEYS.filter((k) => drafts[k].trim() && drafts[k] !== DEFAULT_MESSAGES[k]).map((k) => [k, drafts[k]]));
      await saveDocumentSettings(db, { ...settings, messages });
      toast('Messages saved');
    } catch (error) {
      toast(errorMessage(error as Error), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const tooLong = text.length > MESSAGE_MAX_CHARS;
  return (
    <Panel
      title="Messages"
      actions={
        <Button size="sm" variant="primary" disabled={!dirty || tooLong || MESSAGE_KEYS.some((k) => drafts[k].length > MESSAGE_MAX_CHARS)} busy={busy} onClick={save}>
          Save messages
        </Button>
      }
    >
      <p className="adm-muted adm-tpl__intro">
        Sent with the live document link from a booking's Documents card. You can still edit each message before sending.
      </p>
      <Segmented<MessageKey> label="Message" value={key} onChange={setKey} options={MESSAGE_KEYS.map((k) => ({ value: k, label: MESSAGE_LABEL[k] }))} />
      <div className="adm-tpl__msg">
        <div className="adm-stack">
          <Field label={MESSAGE_LABEL[key]} error={tooLong ? `Keep it under ${MESSAGE_MAX_CHARS} characters (now ${text.length}).` : undefined}>
            <textarea ref={area} rows={12} value={text} onChange={(e) => setText(e.target.value)} spellCheck />
          </Field>
          <div className="adm-tpl__chips" role="group" aria-label="Insert placeholder">
            {MESSAGE_PLACEHOLDERS.map((p) => (
              <button key={p.key} type="button" onClick={() => insert(p.key)} title={p.label}>
                {`{${p.key}}`}
              </button>
            ))}
          </div>
          <p className="adm-sub">
            Empty placeholders are left out. {key.endsWith('Whatsapp') ? 'WhatsApp shows *text* in bold.' : ''}
          </p>
          {text !== DEFAULT_MESSAGES[key] ? (
            <LinkButton onClick={() => setText(DEFAULT_MESSAGES[key])}>
              <RotateCcw aria-hidden /> Reset to the default text
            </LinkButton>
          ) : null}
        </div>
        <figure className="adm-tpl__bubble">
          <figcaption className="adm-sub">Preview with sample booking</figcaption>
          <p>{fillMessage(text, sample)}</p>
        </figure>
      </div>
    </Panel>
  );
}
