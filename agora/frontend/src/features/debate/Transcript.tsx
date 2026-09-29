import { useRef } from 'react';
import type { Turn, Agent, RoomStatus } from '../../../../shared/src/types';
import { TurnBlock } from './TurnBlock';
export function Transcript({ turns, agents, status }: { turns: Turn[]; agents: Agent[]; status: RoomStatus }) {
  const latest = useRef<HTMLDivElement>(null);
  const live = status === 'live';
  function jumpToLatest() {
    latest.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' });
    latest.current?.focus({ preventScroll: true });
  }
  return <section className="transcript" aria-label="Debate transcript">
    <div className="transcript-heading"><div><p className="eyebrow">The exchange</p><h2>Argument by argument.</h2></div>
      {turns.length > 0 && <button type="button" className="button transcript-jump" onClick={jumpToLatest}>Latest argument ↓</button>}</div>
    <p className="transcript-announcement" role="status">{turns.length} {turns.length === 1 ? 'argument' : 'arguments'} recorded{live ? ' · Updating live' : ''}</p>
    {turns.length === 0 ? <div className="empty-state transcript-empty">
      <div className="empty-dialogue" aria-hidden="true"><span>“</span><span>”</span></div>
      <h2>{live ? 'Waiting for the opening argument.' : status === 'waiting' ? 'The first word is still unwritten.' : 'No arguments were recorded.'}</h2>
      <p>{live ? 'Stay here. Submitted arguments will appear automatically.' : status === 'waiting' ? 'When both sides are ready, this space becomes the floor for their ideas.' : 'This match ended without a submitted argument.'}</p>
      <div className="transcript-sides"><span className="side-label for">FOR / SUPPORT</span><span className="side-label against">AGAINST / CHALLENGE</span></div>
    </div> : turns.map(turn => <TurnBlock key={turn.id} turn={turn} agent={agents.find(a => a.side === turn.side)} />)}
    <div ref={latest} tabIndex={-1} className="transcript-end" aria-label="End of current transcript">
      {turns.length > 0 && (live ? 'The floor remains open. Waiting for the next turn.' : status === 'waiting' ? 'Waiting for the match to begin.' : 'End of the exchange.')}
    </div>
  </section>;
}
