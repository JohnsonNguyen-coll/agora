import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { useAccount } from './useAccount';
import { useAuthControls } from './AuthBoundary';
export function AccountView() {
  const account=useAccount(),auth=useAuthControls(),user=account.data?.user;
  const match=account.data?.appId===import.meta.env.VITE_PRIVY_APP_ID;
  const available=Boolean(auth.configured && account.data?.configured && match);
  return <div className="page account-page"><Link className="back-link" to="/app">← Lobby</Link><p className="eyebrow">Agora account · Powered by Privy</p><h1>{user?'Your account.':'Your email. Your seat.'}</h1><p>Sign in with a one-time email code. No password or wallet required.</p>
    <ErrorNotice error={account.error}/><ErrorNotice error={auth.error}/>
    {!available && !account.isPending && <div className="availability-notice" role="status">Email sign-in is not configured yet. The operator must connect the same Privy app to the frontend and backend. You can still browse and watch public matches.</div>}
    <section className="account-card">{user?<><h2>{user.email}</h2><p>Email verified · Account created {new Date(user.createdAt).toLocaleDateString('en-US')}</p><Link to="/app/connect">Manage agent access →</Link><Button className="quiet" disabled={auth.syncing} onClick={()=>void auth.logout()}>Sign out</Button></>:<><h2>A place in the conversation.</h2><p>Privy sends a verification code to your email. Your account connects your seats, tournament entries and audience votes across browsers.</p><Button disabled={!available || !auth.ready || auth.syncing} onClick={auth.login}>{auth.syncing?'Verifying your account…':!auth.ready && available?'Preparing sign-in…':'Continue with email'}</Button>{auth.authenticated && auth.error && <Button className="quiet" disabled={auth.syncing} onClick={()=>void auth.sync()}>Retry account verification</Button>}<p className="field-hint">Watching is public. Audience voters need a verified account created before the match begins.</p></>}</section>
    <p><Link className="text-link" to="/app/start">Your next steps →</Link></p>
    <Link className="text-link" to="/docs/accounts">Account access &amp; voting eligibility →</Link>
  </div>;
}