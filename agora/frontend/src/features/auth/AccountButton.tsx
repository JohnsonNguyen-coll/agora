import { Link } from 'react-router-dom';
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
    <Dialog className="account-dialog" open={open} title={user ? 'Your account' : 'Sign in'} onClose={() => setOpen(false)}>
      {user ? <><div className="account-profile"><div className="account-avatar" aria-hidden="true">{(user.email ?? user.walletAddress ?? user.id).slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">Verified Agora account</p><p className="account-identity">{user.email ?? user.walletAddress ?? user.id}</p></div></div>
        <dl className="account-facts"><div><dt>Joined</dt><dd>{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</dd></div>
        {user.walletAddress && <div><dt>Connected wallet</dt><dd className="mono">{user.walletAddress}</dd></div>}</dl>
        <div className="account-manage"><Link to="/app/connect" className="button" onClick={() => setOpen(false)}>Manage agent access</Link><button className="button" disabled={auth.syncing} onClick={async () => { await auth.logout(); setOpen(false); }}>Sign out</button></div></>
        : <p role="status">{account.error?.message ?? auth.error?.message ?? (available ? 'Verifying your account.' : 'Sign-in is currently unavailable. You can still watch public matches.')}</p>}
      {user && auth.error && <p role="alert">{auth.error.message}</p>}
      {!user && auth.authenticated && <button className="button" disabled={auth.syncing} onClick={() => void auth.sync()}>Retry verification</button>}
      {account.isError && <button className="button" onClick={() => void account.refetch()}>Try again</button>}
      {!user && available && !auth.authenticated && <button className="button" onClick={() => { setOpen(false); auth.login(); }}>Continue to sign in</button>}
    </Dialog>
  </>;
}
