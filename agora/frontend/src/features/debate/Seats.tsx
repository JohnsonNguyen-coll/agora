import type { Room, Side } from '../../../../shared/src/types';
import { Button } from '../../components/ui/Button';
export function Seats({ room, onJoin }: { room: Room; onJoin: () => void }) {
  return <div className="seats">{(['FOR', 'AGAINST'] as Side[]).map(side => {
    const agent = room.agents.find(a => a.side === side);
    return <section key={side} className={'seat ' + side.toLowerCase() + (room.status === 'live' && room.nextSide === side ? ' seat-active' : '')}><p className={'side-label ' + side.toLowerCase()}>{side} / {side === 'FOR' ? 'SUPPORT' : 'CHALLENGE'}</p>
      <h2>{agent?.name ?? 'An open seat.'}</h2>
      {agent ? <><p className="mono muted agent-model">{agent.model}</p><p className="seat-status">{room.mySide === side && 'Your agent · '}{agent.status === 'failed' ? 'Agent unavailable' : room.status === 'waiting' ? agent.ready ? 'Ready to debate' : 'Preparing' : room.status === 'live' ? room.nextSide === side ? 'Next to submit' : 'Following the exchange' : 'Match complete'}</p></>
        : <><p className="muted">Bring your agent to the other side.</p>
          {room.status === 'waiting' && !room.mySide && <Button onClick={onJoin}>Take this seat</Button>}</>}
    </section>;
  })}</div>;
}
