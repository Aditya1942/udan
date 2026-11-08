/**
 * `/templates` — open (no sign-in) gallery of Invoice / Admin invoice / Voucher template families across data
 * scenarios, to pick a design. Lazy route from src/App.tsx; sample data only (all fictional).
 * State lives in the URL: `?doc=invoice&s=hotel-stay&v=reference&view=compare`.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import markUrl from '../../../assets/brand/udan-mark.png';
import { BROWSER_ASSETS } from '../assets';
import { FAMILIES } from '../variants/registry';
import { DOC_KINDS, type DocKind, type VariantFamily } from '../variants/types';
import { renderVariant, unavailableReason, type GalleryAssets } from './renderVariant';
import { buildScenarios, type Scenario } from './scenarios';
import './gallery.css';

const ASSETS: GalleryAssets = { ...BROWSER_ASSETS, mark: markUrl };
const SCENARIOS = buildScenarios({ signature: markUrl });

type Rendered = { status: 'busy' } | { status: 'ready'; url: string } | { status: 'error'; message: string } | { status: 'na'; message: string };

/** Blob URLs cached per family × doc × scenario for the page's lifetime. */
const cache = new Map<string, Promise<string>>();
function pdfUrl(family: VariantFamily, kind: DocKind, s: Scenario): Promise<string> {
  const key = `${family.id}|${kind}|${s.id}`;
  let p = cache.get(key);
  if (!p) {
    p = renderVariant(family, kind, s, ASSETS).then((blob) => URL.createObjectURL(blob));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

function usePdf(family: VariantFamily, kind: DocKind, s: Scenario): Rendered {
  const na = unavailableReason(kind, s);
  const [state, setState] = useState<Rendered>({ status: 'busy' });
  useEffect(() => {
    if (na) return;
    let live = true;
    setState({ status: 'busy' });
    pdfUrl(family, kind, s).then(
      (url) => live && setState({ status: 'ready', url }),
      (e: unknown) => live && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [family, kind, s, na]);
  return na ? { status: 'na', message: na } : state;
}

function Preview({ family, kind, scenario, compact }: { family: VariantFamily; kind: DocKind; scenario: Scenario; compact?: boolean }) {
  const r = usePdf(family, kind, scenario);
  const name = `${family.id}-${kind}-${scenario.id}.pdf`;
  return (
    <div className={`tg-preview${compact ? ' tg-preview--compact' : ''}`}>
      {r.status === 'ready' ? (
        <>
          <iframe title={`${family.name} — ${kind} — ${scenario.label}`} src={`${r.url}#toolbar=0&navpanes=0&view=FitH`} />
          <div className="tg-preview__actions">
            <a href={r.url} target="_blank" rel="noreferrer">
              Open
            </a>
            <a href={r.url} download={name}>
              Download
            </a>
          </div>
        </>
      ) : (
        <div className={`tg-preview__state tg-preview__state--${r.status}`} role={r.status === 'error' ? 'alert' : undefined}>
          {r.status === 'busy' ? 'Rendering PDF…' : r.message}
        </div>
      )}
    </div>
  );
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const kind = (DOC_KINDS.find((d) => d.id === params.get('doc'))?.id ?? 'invoice') as DocKind;
  const scenario = SCENARIOS.find((s) => s.id === params.get('s')) ?? SCENARIOS[0];
  const family = FAMILIES.find((f) => f.id === params.get('v')) ?? FAMILIES[0];
  const compare = params.get('view') === 'compare';
  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, value);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    document.title = 'Document templates · UDAN';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const families = useMemo(() => FAMILIES, []);

  return (
    <div className="tg">
      <header className="tg-head">
        <div>
          <h1>Document templates</h1>
          <p>
            {families.length} designs × 3 documents × {SCENARIOS.length} data scenarios. Sample data only.
          </p>
        </div>
        <div className="tg-seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={!compare} onClick={() => set('view', 'single')}>
            One at a time
          </button>
          <button type="button" aria-pressed={compare} onClick={() => set('view', 'compare')}>
            Compare all
          </button>
        </div>
      </header>

      <div className="tg-controls">
        <div className="tg-seg" role="group" aria-label="Document">
          {DOC_KINDS.map((d) => (
            <button key={d.id} type="button" aria-pressed={d.id === kind} onClick={() => set('doc', d.id)}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="tg-chips" role="group" aria-label="Data scenario">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === scenario.id} onClick={() => set('s', s.id)} title={s.note}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="tg-note">{scenario.note}</p>
      </div>

      {compare ? (
        <div className="tg-grid">
          {families.map((f) => (
            <section key={f.id} className="tg-card">
              <header>
                <h2>{f.name}</h2>
                <p>{f.tagline}</p>
              </header>
              <Preview family={f} kind={kind} scenario={scenario} compact />
            </section>
          ))}
        </div>
      ) : (
        <div className="tg-single">
          <nav className="tg-families" aria-label="Design">
            {families.map((f) => (
              <button key={f.id} type="button" aria-pressed={f.id === family.id} onClick={() => set('v', f.id)}>
                <strong>{f.name}</strong>
                <span>{f.tagline}</span>
              </button>
            ))}
          </nav>
          <Preview family={family} kind={kind} scenario={scenario} />
        </div>
      )}
    </div>
  );
}
