/** "New client" dialog: name, mobile (unique), email, city, notes → `createClient`. */
import { useState } from 'react';
import { createClient, useAdminData } from '../../data';
import { hasErrors } from '../../model';
import { Button, Dialog, errorMessage, Note } from '../../ui';
import { blankClientInput, ClientFormFields, clientErrors, clientFieldsOf } from './shared';

export function ClientDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (clientId: string) => void }) {
  const { db, clients } = useAdminData();
  const [v, setV] = useState(blankClientInput);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const fields = clientFieldsOf(v);
  const errors = clientErrors(fields, clients.data);

  const reset = () => {
    setV(blankClientInput());
    setTried(false);
    setFailure('');
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };
  const submit = async () => {
    setTried(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setFailure('');
    try {
      const id = await createClient(db, fields);
      reset();
      onCreated(id);
    } catch (err) {
      setFailure(errorMessage(err as Error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New client"
      onSubmit={() => void submit()}
      footer={
        <>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={busy}>
            Create client
          </Button>
        </>
      }
    >
      <ClientFormFields value={v} onChange={setV} errors={tried ? errors : {}} />
      {failure ? <Note tone="danger">{failure}</Note> : null}
    </Dialog>
  );
}
