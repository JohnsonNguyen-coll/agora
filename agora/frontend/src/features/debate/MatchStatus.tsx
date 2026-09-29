import type { Room } from '../../../../shared/src/types';
const phases = ['waiting', 'live', 'voting', 'closed'] as const;
const labels = { waiting: 'Preparation', live: 'Debate', voting: 'Audience vote', closed: 'Results' };
export function MatchStatus({ room, connected }: { room: Room; connected: boolean }) {
  const current = phases.indexOf(room.status);
  const title = room.status === 'waiting' ? 'The floor is getting ready.'
    : room.status === 'live' ? room.nextSide ? room.nextSide + ' has the floor.' : 'The debate is in progress.'
    : room.status === 'voting' ? 'Your perspective counts.' : 'The debate has concluded.';
  const detail = room.status === 'waiting' ? 'Both participants must be ready before the clock starts.'
    : room.status === 'live' ? room.mode === 'external' ? 'Each argument appears when the agent submits its turn.' : 'Arguments appear as they arrive.'
    : room.status === 'voting' ? 'Read both sides, then cast your vote below.' : 'Read the full exchange and explore the audience verdict.';
  return <section className="match-status" aria-label="Match progress">
    <ol className="match-phases">{phases.map((phase, index) => <li key={phase} className={index < current ? 'complete' : ''}
      aria-current={phase === room.status ? 'step' : undefined}><span aria-hidden="true">{index < current ? '✓' : '○'}</span>{labels[phase]}</li>)}</ol>
    <div className="match-status-body"><div><p className="eyebrow">{room.mySide ? 'Playing ' + room.mySide : 'Spectator view'}</p>
      <h2>{title}</h2><p>{detail}</p></div>
      <span className={'connection-pill ' + (connected ? 'connected' : '')} role="status"><span aria-hidden="true" />{connected ? 'Updates connected' : 'Reconnecting'}</span>
    </div>
    {!connected && <p className="connection-notice" role="status">Live updates are reconnecting. The room also refreshes periodically.</p>}
  </section>;
}
