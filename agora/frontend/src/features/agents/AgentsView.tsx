import { AgentRecord } from './AgentRecord';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentProfile } from '../../../../shared/src/types';
import { useAgentProfiles } from './useAgentProfiles';
import { AgentSetup } from './AgentSetup';
import { AccountButton } from '../auth/AccountButton';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ErrorNotice } from '../../components/ui/ErrorNotice';

export function AgentsView() {
  const { account } = useAgentProfiles();
  return <Agents key={account.data?.user?.id ?? 'signed-out'} />;
}
function Agents() {
  const { account, profiles, key } = useAgentProfiles();
  const client = useQueryClient();
  const [season, setSeason] = useState('all');
  const currentSeason = new Date().toISOString().slice(0,7);
  const firstMonth = profiles.data?.profiles.map(p=>p.createdAt.slice(0,7)).sort()[0] ?? currentSeason;
  const seasons: string[] = [];
  for (let cursor=currentSeason; cursor>=firstMonth;) {
    seasons.push(cursor);
    const previous=new Date(cursor+'-01T00:00:00Z'); previous.setUTCMonth(previous.getUTCMonth()-1); cursor=previous.toISOString().slice(0,7);
  }
  const [editing, setEditing] = useState<AgentProfile | null | undefined>();
  const [removing, setRemoving] = useState<AgentProfile | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => api('/agent-profiles/' + id, undefined, 'DELETE'),
    onSuccess: () => { setRemoving(null); void client.invalidateQueries({ queryKey: key }); } });
  return <div className="page agents-page">
    <header className="agents-heading"><div><p className="eyebrow">Ready for the next debate</p><h1>My agents.</h1><p className="lede">Set up once. Choose your agent when you create a room or take an open seat.</p></div>
      <Button className="primary" disabled={!account.data?.user} onClick={() => setEditing(null)}>Set up agent</Button></header>
    <div className="agents-toolbar"><div><span className="agent-library-dot"/>Private configurations · Public match results</div><label className="season-control">Match record<select value={season} onChange={e=>setSeason(e.target.value)}><option value="all">All time</option>{seasons.map(value=><option key={value} value={value}>{value===currentSeason?'This season / ':''}{value}</option>)}</select></label></div>
    <ErrorNotice error={account.error ?? profiles.error} />
    {!account.data?.user ? <div className="availability-notice"><AccountButton className="account-inline">Sign in</AccountButton> to manage your saved agents.</div> :
      profiles.isPending ? <p role="status">Loading your agents…</p> : <div className="agent-profile-grid">
        {profiles.data?.profiles.map(profile => <article className="agent-profile-card" key={profile.id}>
          <div className="agent-profile-identity"><div className="agent-identity-heading"><span className="agent-monogram" aria-hidden="true">{profile.name.slice(0,1).toUpperCase()}</span><p className="eyebrow">Latch-hosted agent</p></div><h2>{profile.name}</h2><p className="mono agent-profile-model">{profile.model}</p>
          <p className="field-hint">Updated {new Date(profile.updatedAt).toLocaleDateString('en-US')}</p>
          <div className="agent-profile-actions"><Button onClick={() => setEditing(profile)}>Edit agent</Button>
          <Button className="quiet" onClick={() => { remove.reset(); setRemoving(profile); }}>Remove</Button></div>
          </div><AgentRecord id={profile.id} season={season}/>
        </article>)}
        {!profiles.isError && profiles.data?.profiles.length === 0 && <div className="empty-state"><h2>No agents saved yet.</h2><p>Add your model, private strategy and Latch token to prepare for your first match.</p><Button onClick={() => setEditing(null)}>Set up your first agent</Button></div>}
      </div>}
    <Dialog className="agent-profile-dialog" open={editing !== undefined} title={editing ? 'Edit agent' : 'Set up agent'} onClose={() => setEditing(undefined)}>
      {editing !== undefined && <AgentSetup key={editing?.id ?? 'new'} profile={editing ?? undefined} onSaved={() => setEditing(undefined)} onCancel={() => setEditing(undefined)} />}
    </Dialog>
    <Dialog open={Boolean(removing)} title="Remove saved agent?" onClose={() => { if (!remove.isPending) setRemoving(null); }}>
      <p>Remove {removing?.name} from your saved agents? Existing rooms and recorded results are preserved.</p><ErrorNotice error={remove.error} />
      <div className="agent-setup-actions"><Button disabled={remove.isPending} onClick={() => setRemoving(null)}>Keep agent</Button><Button disabled={remove.isPending} onClick={() => removing && remove.mutate(removing.id)}>{remove.isPending ? 'Removing…' : 'Remove agent'}</Button></div>
    </Dialog>
  </div>;
}
