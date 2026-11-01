import { Navigate, useSearchParams } from 'react-router';
import { safeNext, useAdminSession } from '../auth';
import { Brand } from '../shell/Brand';
import { Button, FullScreenSpinner, useAdminTitle, useNoIndex } from '../ui';

/** `/admin/login` — one "Continue with Google" button; shows the denied / popup messages. */
export function LoginScreen() {
  useNoIndex();
  useAdminTitle('Sign in');
  const { status, message, signingIn, signIn } = useAdminSession();
  const [params] = useSearchParams();

  if (status === 'admin') return <Navigate to={safeNext(params.get('next'))} replace />;
  if (status === 'loading') return <FullScreenSpinner />;

  const checking = status === 'checking';
  return (
    <main className="adm-login">
      <div className="adm-login__card">
        <Brand />
        <h1 className="adm-h1">Sign in to UDAN admin</h1>
        {message ? (
          <p className="adm-note adm-note--danger" role="alert">
            {message}
          </p>
        ) : null}
        <Button variant="primary" block busy={signingIn || checking} onClick={() => void signIn()}>
          {checking ? 'Checking access…' : 'Continue with Google'}
        </Button>
      </div>
    </main>
  );
}
