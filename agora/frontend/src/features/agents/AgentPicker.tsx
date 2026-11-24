import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgentProfiles } from './useAgentProfiles';
import { AgentSetup } from './AgentSetup';
import { AccountButton } from '../auth/AccountButton';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { Button } from '../../components/ui/Button';

export function AgentPicker({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const state = useAgentProfiles();
  return <Picker key={state.account.data?.user?.id ?? 'signed-out'} onReadyChange={onReadyChange} />;
}
function Picker({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const { account, profiles } = useAgentProfiles();
  const [mode, setMode] = useState<'saved' | 'setup'>('saved');
  const [selection, setSelection] = useState<string | null>(null);
  const rows = profiles.data?.profiles ?? [];
  const selected = rows.find(profile => profile.id === selection) ?? rows[0];
  const ready = mode === 'saved' && Boolean(selected) && Boolean(account.data?.user);
  useEffect(() => { onReadyChange(ready); }, [ready, onReadyChange]);
  if (!account.data?.user) return <div className="availability-notice"><AccountButton className="account-inline">Sign in</AccountButton> to save and choose an agent.</div>;
  return <div className="agent-picker">
    <div className="agent-picker-toolbar"><h3>{mode === 'saved' ? 'Choose a saved agent' : 'Create a saved agent'}</h3><Button className="quiet" type="button" onClick={() => setMode(mode === 'saved' ? 'setup' : 'saved')}>{mode === 'saved' ? 'Set up new agent' : 'Back to saved agents'}</Button></div>
    {mode === 'setup' ? <div aria-label="New agent configuration"><AgentSetup onSaved={profile => { setSelection(profile.id); setMode('saved'); }} /></div> :
      <div aria-label="Saved agent selection">
        <ErrorNotice error={profiles.error} />
        {profiles.isPending && <p role="status">Loading your agents…</p>}
        {profiles.isError && <Button type="button" onClick={() => void profiles.refetch()}>Try again</Button>}
        {!profiles.isPending && !profiles.isError && !rows.length && <div className="agent-picker-empty"><h3>Your first agent starts here.</h3><p>Save a model, private strategy and Latch token once, then choose that agent for your matches.</p><Button type="button" onClick={() => setMode('setup')}>Set up an agent</Button></div>}
        <div className="agent-choices">{rows.map(profile => <label key={profile.id} className="agent-choice">
          <input type="radio" name="agentProfileId" value={profile.id} checked={selected?.id === profile.id} onChange={() => setSelection(profile.id)} required />
          <span><strong>{profile.name}</strong><span className="mono">{profile.model}</span></span>
        </label>)}</div>
        {rows.length > 0 && <p className="field-hint">This match uses a private copy of the selected configuration. <Link to="/app/agents">Manage your agents</Link></p>}
      </div>}
  </div>;
}
