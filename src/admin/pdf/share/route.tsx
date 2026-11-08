/**
 * `/d/<token>` — public live document link (no sign-in). Reads `shares/<token>` (customer-safe view-model kept current
 * by the admin app's ShareSync), builds the PDF in the browser with the chosen template, and offers Download / Open
 * plus an inline preview where the browser has a PDF viewer. Lazy route from src/App.tsx (pulls react-pdf + Firestore).
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import markUrl from '../../../assets/brand/udan-mark.png';
import wordmarkUrl from '../../../assets/brand/udan-wordmark.png';
import { getDb } from '../../../lib/firebase';
import { readShare, type ShareRecord } from '../../data/shares';
import { BROWSER_ASSETS } from '../assets';
import { familyById, renderTemplate } from '../renderTemplate';
import { parseShareView, SHARE_VERSION } from '../share';
import './share.css';

type State =
  | { status: 'loading' }
  | { status: 'inactive'; share: ShareRecord | null; reason?: string }
  | { status: 'error'; share?: ShareRecord }
  | { status: 'ready'; share: ShareRecord; url: string };

async function build(share: ShareRecord): Promise<string> {
  const family = familyById(share.family);
  const assets = { ...BROWSER_ASSETS, mark: markUrl };
  const blob =
    share.kind === 'invoice'
      ? await renderTemplate(family, { kind: 'invoice', view: parseShareView('invoice', share.view) }, assets)
      : await renderTemplate(family, { kind: 'voucher', view: parseShareView('voucher', share.view) }, assets);
  return URL.createObjectURL(blob);
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

function useNoIndexTitle(title: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [title]);
}

function Contact({ share }: { share?: ShareRecord | null }) {
  if (!share?.phone) return null;
  return (
    <p className="dl-contact">
      Questions? Call {share.tradingName || 'us'} on{' '}
      <a href={telHref(share.phone)}>{share.phone}</a>
    </p>
  );
}

export function Component() {
  const { token = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let url: string | undefined;
    setState({ status: 'loading' });
    (async () => {
      const db = getDb();
      if (!db || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return live && setState({ status: 'inactive', share: null });
      let share: ShareRecord | null;
      try {
        share = await readShare(db, token);
      } catch {
        return live && setState({ status: 'error' });
      }
      if (!share || !share.active || !share.view) {
        const reason = share?.active && share.unavailable === 'cancelled' ? 'This booking was cancelled, so there is no travel voucher.' : undefined;
        return live && setState({ status: 'inactive', share, reason });
      }
      if (share.v > SHARE_VERSION) return live && setState({ status: 'error', share });
      try {
        url = await build(share);
        if (live) setState({ status: 'ready', share, url });
        else URL.revokeObjectURL(url);
      } catch {
        if (live) setState({ status: 'error', share });
      }
    })();
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, attempt]);

  const share = state.status === 'loading' ? undefined : state.share;
  const title = share?.title || 'Your document';
  useNoIndexTitle(share?.tradingName ? `${title} · ${share.tradingName}` : title);
  const inlineViewer = typeof navigator !== 'undefined' && navigator.pdfViewerEnabled === true;

  return (
    <div className="dl">
      <main className="dl-card" aria-busy={state.status === 'loading'}>
        <img className="dl-logo" src={wordmarkUrl} alt={share?.tradingName || 'UDAN'} width={208} height={66} />

        {state.status === 'loading' ? (
          <div className="dl-state" role="status">
            <span className="dl-spinner" aria-hidden />
            <p>Preparing your document…</p>
          </div>
        ) : state.status === 'inactive' ? (
          <div className="dl-state">
            <h1>{state.reason ? title : 'This link is no longer active'}</h1>
            <p>{state.reason ?? 'Ask us for a new link and we will send it right away.'}</p>
            <Contact share={state.share} />
          </div>
        ) : state.status === 'error' ? (
          <div className="dl-state" role="alert">
            <h1>We couldn't open this document</h1>
            <p>Check your connection and try again.</p>
            <button type="button" className="dl-btn dl-btn--primary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
            <Contact share={state.share} />
          </div>
        ) : (
          <>
            <div className="dl-head">
              <h1>{title}</h1>
              {state.share.tradingName ? <p>From {state.share.tradingName}</p> : null}
            </div>
            <div className="dl-actions">
              <a className="dl-btn dl-btn--primary" href={state.url} download={state.share.filename || 'document.pdf'}>
                Download PDF
              </a>
              <a className="dl-btn" href={state.url} target="_blank" rel="noopener">
                Open PDF
              </a>
            </div>
            {inlineViewer ? <iframe className="dl-preview" title={title} src={`${state.url}#view=FitH`} /> : null}
            <Contact share={state.share} />
          </>
        )}
      </main>
    </div>
  );
}
