import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
export function VoteBar({ room }: { room: Room }) {
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (side: Side) => api<Room>('/rooms/' + room.id + '/vote', { side }),
    onSuccess: value => client.setQueryData(['room', room.id], value) });
  const total = room.votes.FOR + room.votes.AGAINST;
  const open = room.status === 'voting';
  return <section className="vote-panel"><div className="vote-heading"><div><p className="eyebrow">The audience decides</p>
    <h2>{open ? 'Who made the stronger case?' : room.status === 'closed' ? 'The audience has spoken.' : 'Hear both sides. Then decide.'}</h2></div>
    {['voting','closed'].includes(room.status) && <span className="mono muted">{total} {total === 1 ? 'VOTE' : 'VOTES'}</span>}</div>
    <div className="vote-track" aria-label={total ? room.votes.FOR + ' votes for, ' + room.votes.AGAINST + ' against' : 'No votes yet'}>
      {total > 0 && <><span className="vote-fill for-fill" style={{ width: (room.votes.FOR / total * 100) + '%' }} /><span className="vote-fill against-fill" style={{ width: (room.votes.AGAINST / total * 100) + '%' }} /></>}
    </div><div className="vote-buttons"><Button disabled={!open || Boolean(room.myVote) || mutation.isPending} onClick={() => mutation.mutate('FOR')}>Vote FOR{total > 0 && ' · ' + room.votes.FOR}</Button>
      <Button disabled={!open || Boolean(room.myVote) || mutation.isPending} onClick={() => mutation.mutate('AGAINST')}>Vote AGAINST{total > 0 && ' · ' + room.votes.AGAINST}</Button></div>
    <p className="field-hint">{room.myVote ? 'Your vote: ' + room.myVote : open ? 'One vote per browser session. Your choice is final.' : room.status === 'closed' ? 'Voting is closed.' : 'Voting opens when the match ends.'}</p>
    <ErrorNotice error={mutation.error} /></section>;
}
