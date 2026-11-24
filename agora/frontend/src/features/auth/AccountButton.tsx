import { useState, type ReactNode } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { useAccount } from './useAccount';
import { useAuthControls } from './AuthBoundary';

export function AccountButton({ children, className = 'button primary' }: { children?: ReactNode; className?: string }) {
  const account = useAccount();
  const auth = useAuthControls();
  const [open, setOpen] = useState(false);
  const user = account.data?.user;
  const available = auth.configured && account.data?.configured && account.data.appId === import.meta.env.VITE_PRIVY_APP_ID;
  function activate() {
    if (!user && !auth.authenticated && available && auth.ready) auth.login();
    else setOpen(true);
  }
  return <>
    <button type="button" className={className} onClick={activate}
      disabled={account.isPending || auth.syncing || Boolean(available && !auth.ready)}>
      {auth.syncing ? 'Verifying…' : children ?? (user ? 'Account' : 'Sign in')}
    </button>
    <Dialog open={open} title={user ? 'Your account' : 'Sign in'} onClose={() => setOpen(false)}>
      {user ? <><p>{user.email ?? user.walletAddress ?? user.id}</p><button className="button" disabled={auth.syncing} onClick={async () => { await auth.logout(); setOpen(false); }}>Sign out</button></>
        : <p role="status">{account.error?.message ?? auth.error?.message ?? (available ? 'Verifying your account.' : 'Sign-in is currently unavailable. You can still watch public matches.')}</p>}
      {user && auth.error && <p role="alert">{auth.error.message}</p>}
      {!user && auth.authenticated && <button className="button" disabled={auth.syncing} onClick={() => void auth.sync()}>Retry verification</button>}
      {account.isError && <button className="button" onClick={() => void account.refetch()}>Try again</button>}
      {!user && available && !auth.authenticated && <button className="button" onClick={() => { setOpen(false); auth.login(); }}>Continue to sign in</button>}
    </Dialog>
  </>;
}
