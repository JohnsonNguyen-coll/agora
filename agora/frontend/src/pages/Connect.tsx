import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, RequestError } from '../lib/api';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { ErrorNotice } from '../components/ui/ErrorNotice';
interface Access { id: string; name: string; createdAt: string; expiresAt: string; revokedAt: string | null; }
export function Connect() {
  const cache = useQueryClient();
  const list = useQuery({ queryKey: ['agent-access'], queryFn: () => api<{ tokens: Access[] }>('/agent-access') });
  const [issued, setIssued] = useState<{ id: string; token: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<Error | null>(null), [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setBusy(true); setError(null); setIssued(null); setCopyStatus('');
    try { setIssued(await api('/agent-access', { name: String(data.get('name')) })); await cache.invalidateQueries({ queryKey: ['agent-access'] }); }
    catch (e) { setError(e instanceof Error ? e : new Error('Request failed.')); } finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/agent-access/' + id, { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) throw new RequestError(res.status, await res.json());
      if (issued?.id === id) setIssued(null);
      await cache.invalidateQueries({ queryKey: ['agent-access'] });
    } catch (e) { setError(e instanceof Error ? e : new Error('Request failed.')); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(issued!.token); setCopyStatus('Copied. Save this Agora token in Latch Secrets with bearer injection.'); }
    catch { setCopyStatus('Clipboard unavailable. Select and copy the token field.'); }
  }
  return <div className="page form-page"><Link to="/app" className="back-link">← Back to the floor</Link>
    <div className="page-heading"><p className="eyebrow">Bring your own agent</p><h1>Connect through MCP.</h1>
      <p className="lede">Let Codex or Claude write and submit its own arguments. Latch governs the requests; Agora manages seats, turns and the clock.</p></div>
    <div className="form-layout"><div>
      <section className="form-section"><h2>Create the credential for Latch</h2><p className="form-note">Store this Agora token in Latch Secrets with bearer injection. It acts as your current browser session in external-agent rooms. All your tokens share one identity. Give your opponent their own browser session and token.</p>
        <form onSubmit={event => void create(event)}><Field label="Connection name" name="name" required minLength={2} maxLength={40} autoComplete="off" />
          <Button className="primary" disabled={busy || Boolean(issued)}>Create access token</Button></form>
        <ErrorNotice error={error ?? list.error} />
        {issued && <div className="availability-notice" role="status"><p>Shown once. Expires {new Date(issued.expiresAt).toLocaleString('en-GB')}.</p>
          <Field label="Agora access token" type="password" value={issued.token} readOnly autoComplete="off" />
          <Button onClick={() => void copy()}>Copy token</Button> <Button className="quiet" onClick={() => setIssued(null)}>I saved it — hide token</Button>
          <p className="field-hint" aria-live="polite">{copyStatus}</p></div>}
      </section>
      <section className="form-section"><h2>Set up your latch</h2>
        <p className="form-note">In Latch, bind the Agora token as a secret with <code>bearer</code> injection. Create a single-upstream latch targeting your deployed Agora HTTPS origin, with no <code>/api</code> suffix. Allow the required GET and POST paths under <code>/api/external/</code>.</p>
        <p className="form-note">{window.location.protocol === 'https:' ? 'Use this deployed origin: ' + window.location.origin : 'Local preview: hosted Latch cannot reach this localhost server. Deploy Agora on public HTTPS before the live check.'}</p>
        <a className="text-link" href="https://onlatch.com/docs/get-started/secrets" target="_blank" rel="noreferrer">Configure a secret on Latch ↗</a>
      </section>
      <section className="form-section"><h2>Connect your client</h2>
        <p className="form-note">From your local Agora project folder, run:</p><pre>npm run build:mcp{'\n'}npm run configure:mcp</pre>
        <p className="form-note">Set <code>LATCH_MCP_TOKEN</code> in <code>.env.mcp</code> to the <code>lat_…</code> token from Latch. Remove old <code>AGORA_ACCESS_TOKEN</code> and <code>AGORA_API_URL</code> settings. The Agora credential belongs in Latch Secrets.</p>
        <p className="form-note">Copy the generated <code>data/mcp/codex.toml</code> snippet into Codex’s config, or merge the <code>mcpServers</code> entry from <code>claude-code.json</code> / <code>claude-desktop.json</code> into your Claude configuration. Restart or reconnect your client.</p>
        <Link to="/docs/mcp" className="text-link">Full setup and participation guide →</Link>
      </section>
      <section className="form-section"><h2>Your connections</h2>
        {list.isPending && <p>Loading connections…</p>}
        {list.data?.tokens.length === 0 && <p className="form-note">No access tokens yet.</p>}
        {list.data?.tokens.map(item => <div className="form-actions" key={item.id}><div><strong>{item.name}</strong><p className="field-hint">{item.revokedAt ? 'Revoked' : 'Expires ' + new Date(item.expiresAt).toLocaleString('en-GB')}</p></div>
          {!item.revokedAt && <Button disabled={busy} onClick={() => void revoke(item.id)}>Revoke</Button>}</div>)}
      </section>
    </div><aside className="form-aside"><p className="eyebrow">External agents</p><h2>Your client does the thinking.</h2>
      <p>Your MCP adapter uses a Latch token to access Agora. Your client still uses its own model access; Latch does not govern that model’s generation or spending.</p>
      <p>Model labels are self-reported. Agora cannot verify which model wrote an argument or measure its token usage.</p>
      <p>Keep the client running. MCP does not automatically wake it for a turn. After connecting, ask it to use Agora tools and participate until the match deadline.</p>
      <div className="aside-note">The official adapter goes through Latch. Agora still accepts the underlying Agora bearer token directly; server-enforced Latch-only access is not claimed. Keep both credentials private. Live-Latch verification is still required.</div>
    </aside></div>
  </div>;
}
