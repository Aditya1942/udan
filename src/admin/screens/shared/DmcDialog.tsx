/** "New DMC" dialog: name, contact person, phone, email, region, notes → `createDmc`. Reused by Service lines and the DMCs directory. */
import { useState } from 'react';
import { createDmc, useAdminDb } from '../../data';
import { hasErrors, validateDmc, type DmcFields } from '../../model';
import { Button, Dialog, errorMessage, Field, Note } from '../../ui';
import { toE164 } from '../booking/form';

type Input = Required<Pick<DmcFields, 'name' | 'contactPerson' | 'phone' | 'email' | 'region' | 'notes'>>;
const blank: Input = { name: '', contactPerson: '', phone: '', email: '', region: '', notes: '' };

export function DmcDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (dmcId: string) => void }) {
  const db = useAdminDb();
  const [v, setV] = useState<Input>(blank);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const fields: DmcFields = { ...v, phone: v.phone.trim() ? toE164(v.phone) : '' };
  const errors = validateDmc(fields);
  const show = (k: keyof DmcFields) => (tried ? errors[k] : undefined);
  const set = (k: keyof Input) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const close = () => {
    if (busy) return;
    setV(blank);
    setTried(false);
    setFailure('');
    onClose();
  };
  const submit = async () => {
    setTried(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setFailure('');
    try {
      const id = await createDmc(db, fields);
      setV(blank);
      setTried(false);
      onCreated(id);
    } catch (err) {
      setFailure(`Couldn't create the DMC. ${errorMessage(err as Error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New DMC"
      onSubmit={() => void submit()}
      footer={
        <>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={busy}>
            Create DMC
          </Button>
        </>
      }
    >
      <div className="adm-grid-2">
        <Field label="Name" error={show('name')} className="adm-span-all">
          <input value={v.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Contact person" hint="Optional">
          <input value={v.contactPerson} onChange={set('contactPerson')} autoComplete="off" />
        </Field>
        <Field label="Phone" hint="Optional">
          <input type="tel" value={v.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
        </Field>
        <Field label="Email" hint="Optional" error={show('email')}>
          <input type="email" value={v.email} onChange={set('email')} />
        </Field>
        <Field label="Region" hint="Optional">
          <input value={v.region} onChange={set('region')} placeholder="Bali, Kerala…" />
        </Field>
        <Field label="Notes" hint="Optional" className="adm-span-all">
          <textarea rows={2} value={v.notes} onChange={set('notes')} />
        </Field>
      </div>
      {failure ? <Note tone="danger">{failure}</Note> : null}
    </Dialog>
  );
}
