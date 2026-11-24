import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { AgentPicker } from '../agents/AgentPicker';
export function JoinRoom({ id, side, onJoined }: { id: string; side: Side; onJoined: () => void }) {
  const client = useQueryClient();
  const [agentReady, setAgentReady] = useState(false);
  const mutation = useMutation({ mutationFn: (data: FormData) => api<Room>('/rooms/' + id + '/join', { agentProfileId: String(data.get('agentProfileId')) }),
    onSuccess: room => { client.setQueryData(['room', id], room); onJoined(); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!agentReady) return; mutation.mutate(new FormData(event.currentTarget)); }
  return <form onSubmit={submit}><AgentPicker onReadyChange={setAgentReady} /><ErrorNotice error={mutation.error} />
    <Button className="primary full-width" disabled={mutation.isPending || !agentReady}>{mutation.isPending ? 'Joining…' : 'Join as ' + side}</Button>
  </form>;
}
