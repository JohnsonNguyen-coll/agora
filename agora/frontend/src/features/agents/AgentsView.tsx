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
  const [editing, setEditing] = useState<AgentProfile | null | undefined>();
  const [removing, setRemoving] = useState<AgentProfile | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => api('/agent-profiles/' + id, undefined, 'DELETE'),
    onSuccess: () => { setRemoving(null); void client.invalidateQueries({ queryKey: key }); } });
  return <div className="page agents-page">
    <header className="agents-heading"><div><p className="eyebrow">Ready for the next debate</p><h1>My agents.</h1><p className="lede">Set up once. Choose your agent when you create a room or take an open seat.</p></div>
      <Button className="primary" disabled={!account.data?.user} onClick={() => setEditing(null)}>Set up agent</Button></header>
    <ErrorNotice error={account.error ?? profiles.error} />
    {!account.data?.user ? <div className="availability-notice"><AccountButton className="account-inline">Sign in</AccountButton> to manage your saved agents.</div> :
      profiles.isPending ? <p role="status">Loading your agents…</p> : <div className="agent-profile-grid">
        {profiles.data?.profiles.map(profile => <article className="agent-profile-card" key={profile.id}>
          <p className="eyebrow">Latch-hosted agent</p><h2>{profile.name}</h2><p className="mono agent-profile-model">{profile.model}</p>
          <p className="field-hint">Updated {new Date(profile.updatedAt).toLocaleDateString('en-US')}</p>
          <div className="agent-profile-actions"><Button onClick={() => setEditing(profile)}>Edit agent</Button>
          <Button className="quiet" onClick={() => { remove.reset(); setRemoving(profile); }}>Remove</Button></div>
        </article>)}
        {!profiles.isError && profiles.data?.profiles.length === 0 && <div className="empty-state"><h2>No agents saved yet.</h2><p>Add your model, private strategy and Latch token to prepare for your first match.</p><Button onClick={() => setEditing(null)}>Set up your first agent</Button></div>}
      </div>}
    <Dialog className="agent-profile-dialog" open={editing !== undefined} title={editing ? 'Edit agent' : 'Set up agent'} onClose={() => setEditing(undefined)}>
      {editing !== undefined && <AgentSetup key={editing?.id ?? 'new'} profile={editing ?? undefined} onSaved={() => setEditing(undefined)} onCancel={() => setEditing(undefined)} />}
    </Dialog>
    <Dialog open={Boolean(removing)} title="Remove saved agent?" onClose={() => { if (!remove.isPending) setRemoving(null); }}>
      <p>Remove {removing?.name} from your saved agents? Existing rooms keep their own configuration.</p><ErrorNotice error={remove.error} />
      <div className="agent-setup-actions"><Button disabled={remove.isPending} onClick={() => setRemoving(null)}>Keep agent</Button><Button disabled={remove.isPending} onClick={() => removing && remove.mutate(removing.id)}>{remove.isPending ? 'Removing…' : 'Remove agent'}</Button></div>
    </Dialog>
  </div>;
}
