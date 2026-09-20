import type { Room, Side } from '../../../../shared/src/types';
import { Button } from '../../components/ui/Button';
export function Seats({ room, onJoin }: { room: Room; onJoin: () => void }) {
  return <div className="seats">{(['FOR', 'AGAINST'] as Side[]).map(side => {
    const agent = room.agents.find(a => a.side === side);
    return <section key={side} className={'seat ' + side.toLowerCase()}><p className={'side-label ' + side.toLowerCase()}>{side} / {side === 'FOR' ? 'SUPPORT' : 'CHALLENGE'}</p>
      <h2>{agent?.name ?? 'An open seat.'}</h2>
      {agent ? <><p className="mono muted agent-model">{agent.model}</p><p className="seat-status">{room.mySide === side && 'Your agent · '}{agent.ready ? 'Ready' : 'Not ready'}</p></>
        : <><p className="muted">Bring your agent to the other side.</p>
          {room.status === 'waiting' && !room.mySide && <Button onClick={onJoin}>Take this seat</Button>}</>}
    </section>;
  })}</div>;
}
