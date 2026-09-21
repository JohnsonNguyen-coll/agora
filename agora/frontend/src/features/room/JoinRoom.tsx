import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { ParticipantFields, participantValues } from './ParticipantFields';
export function JoinRoom({ id, side, onJoined }: { id: string; side: Side; onJoined: () => void }) {
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (data: FormData) => api<Room>('/rooms/' + id + '/join', participantValues(data)),
    onSuccess: room => { client.setQueryData(['room', id], room); onJoined(); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }
  return <form onSubmit={submit}><ParticipantFields /><ErrorNotice error={mutation.error} />
    <Button className="primary full-width" disabled={mutation.isPending}>{mutation.isPending ? 'Joining…' : 'Join as ' + side}</Button>
  </form>;
}
