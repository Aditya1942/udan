import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAdminSession } from '../auth';
import { Button, PageHeader, Panel, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

function Avatar({ photoURL, email }: { photoURL: string | null; email: string }) {
  const [broken, setBroken] = useState(false);
  if (photoURL && !broken) {
    return <img className="adm-avatar" src={photoURL} alt="" width={40} height={40} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return (
    <span className="adm-avatar" aria-hidden>
      {email.charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Settings → Account: signed-in email + avatar + Sign out (Google owns credentials). */
function AccountPanel() {
  const { user, signOut } = useAdminSession();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <Panel id="account" title="Account">
      <div className="adm-account">
        <Avatar photoURL={user.photoURL} email={user.email} />
        <div className="adm-account__who">
          <span className="adm-muted">Signed in with Google as</span>
          <strong>{user.email}</strong>
          {user.displayName ? <span className="adm-muted">{user.displayName}</span> : null}
        </div>
        <Button
          icon={<LogOut aria-hidden />}
          busy={busy}
          onClick={() => {
            setBusy(true);
            void signOut().finally(() => setBusy(false));
          }}
        >
          Sign out
        </Button>
      </div>
    </Panel>
  );
}

/** `/admin/settings` — Account (real), Business profile and Data (later phases). */
export function SettingsScreen() {
  useAdminTitle('Settings');
  return (
    <>
      <PageHeader title="Settings" />
      <AccountPanel />
      <Placeholder title="Business profile">Business profile, payment details and document text arrive in a later phase.</Placeholder>
      <Placeholder title="Data">Backup and CSV exports arrive in a later phase.</Placeholder>
    </>
  );
}
