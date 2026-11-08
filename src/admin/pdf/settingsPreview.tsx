/**
 * Settings → Templates preview (lazy chunk: react-pdf). One family × document across the `/templates` sample
 * scenarios, printed with the real Business profile so the letterhead, bank details and signature are the owner's.
 */
import { useEffect, useMemo, useState } from 'react';
import markUrl from '../../assets/brand/udan-mark.png';
import type { BusinessProfile } from '../model';
import { BROWSER_ASSETS } from './assets';
import { renderVariant, unavailableReason } from './gallery/renderVariant';
import { buildScenarios, type Scenario } from './gallery/scenarios';
import { familyById } from './renderTemplate';
import type { DocKind } from './variants/types';

const ASSETS = { ...BROWSER_ASSETS, mark: markUrl };

type Rendered = { status: 'busy' } | { status: 'ready'; url: string } | { status: 'error'; message: string } | { status: 'na'; message: string };

const hasProfile = (p: BusinessProfile) => Object.entries(p).some(([k, v]) => k !== 'updatedAt' && typeof v === 'string' && v.trim());

/** Blob URLs per family × doc × scenario × profile version, for the page's lifetime. */
const cache = new Map<string, Promise<string>>();

export default function TemplatePreview({ familyId, kind, profile }: { familyId: string; kind: DocKind; profile: BusinessProfile }) {
  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const scenarios = useMemo<Scenario[]>(
    () => buildScenarios({ signature: markUrl }).map((s) => (hasProfile(profile) ? { ...s, profile } : s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileKey],
  );
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const family = familyById(familyId);
  const na = unavailableReason(kind, scenario);
  const [state, setState] = useState<Rendered>({ status: 'busy' });

  useEffect(() => {
    if (na) return;
    let live = true;
    const key = `${family.id}|${kind}|${scenario.id}|${profileKey}`;
    let p = cache.get(key);
    if (!p) {
      p = renderVariant(family, kind, scenario, ASSETS).then((blob) => URL.createObjectURL(blob));
      p.catch(() => cache.delete(key));
      cache.set(key, p);
    }
    setState({ status: 'busy' });
    p.then(
      (url) => live && setState({ status: 'ready', url }),
      (e: unknown) => live && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [family, kind, scenario, profileKey, na]);

  const shown: Rendered = na ? { status: 'na', message: na } : state;
  return (
    <div className="adm-tpl__preview">
      <div className="adm-tpl__scenarios" role="group" aria-label="Sample data">
        {scenarios.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === scenario.id} onClick={() => setScenarioId(s.id)} title={s.note}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="adm-sub">{scenario.note}</p>
      {shown.status === 'ready' ? (
        <>
          <iframe title={`${family.name} preview`} src={`${shown.url}#toolbar=0&navpanes=0&view=FitH`} />
          <div className="adm-actions">
            <a className="adm-btn adm-btn--outline adm-btn--sm" href={shown.url} target="_blank" rel="noopener">
              Open PDF
            </a>
          </div>
        </>
      ) : (
        <div className={`adm-tpl__state adm-tpl__state--${shown.status}`} role={shown.status === 'error' ? 'alert' : 'status'}>
          {shown.status === 'busy' ? 'Rendering PDF…' : shown.message}
        </div>
      )}
    </div>
  );
}
