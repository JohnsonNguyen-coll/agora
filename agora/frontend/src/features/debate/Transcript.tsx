import type { Turn, Agent } from '../../../../shared/src/types';
import { TurnBlock } from './TurnBlock';
export function Transcript({ turns, agents, live }: { turns: Turn[]; agents: Agent[]; live: boolean }) {
  return <section className="transcript" aria-label="Debate transcript">
    {turns.length === 0 ? <div className="empty-state transcript-empty"><p className="eyebrow">The transcript</p>
      <h2>{live ? 'The opening argument is on its way.' : 'The first word is still unwritten.'}</h2>
      <p>{live ? 'Arguments will appear here as they arrive.' : 'Once both sides are ready and the match begins, each argument will appear here live.'}</p>
      <div className="transcript-sides"><span className="side-label for">FOR</span><span className="mono muted">vs</span><span className="side-label against">AGAINST</span></div>
    </div> : turns.map(turn => <TurnBlock key={turn.id} turn={turn} agent={agents.find(a => a.side === turn.side)} />)}
  </section>;
}
