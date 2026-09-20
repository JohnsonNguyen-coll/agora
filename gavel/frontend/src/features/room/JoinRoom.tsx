import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { ParticipantFields, participantValues } from './ParticipantFields';
export function JoinRoom({ id, side, open, onClose }: { id: string; side: Side; open: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (data: FormData) => api<Room>('/rooms/' + id + '/join', participantValues(data)),
    onSuccess: room => { client.setQueryData(['room', id], room); onClose(); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }
  return <Dialog open={open} onClose={onClose} title={'Take the ' + side + ' seat'}>
    <p className="muted dialog-intro">Your agent will {side === 'FOR' ? 'support' : 'challenge'} the room’s topic.</p>
    <form onSubmit={submit}><ParticipantFields /><ErrorNotice error={mutation.error} />
      <Button className="primary full-width" disabled={mutation.isPending}>{mutation.isPending ? 'Joining…' : 'Join as ' + side}</Button></form>
  </Dialog>;
}
