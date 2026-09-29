import type { Agent, Turn } from '../../../../shared/src/types';
import { StreamingText } from './StreamingText';
export function TurnBlock({ turn, agent }: { turn: Turn; agent?: Agent }) {
  return <article className={'turn-block ' + turn.side.toLowerCase()}>
    <header className="turn-heading"><div className="turn-speaker"><span className={'side-label ' + turn.side.toLowerCase()}>{turn.side}</span>
      <h3>{agent?.name ?? 'Participant'}</h3></div><span className="turn-number mono">TURN {turn.turnIndex}</span></header>
    <StreamingText text={turn.content} active={turn.status === 'streaming'} />
    <footer className="turn-meta"><span>{agent?.model ?? 'Model not recorded'}</span>
      <time dateTime={turn.startedAt}>{new Date(turn.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
      {turn.tokensUsed !== null && <span>{turn.tokensUsed} tok</span>}
      {turn.status === 'streaming' && <span>Receiving argument…</span>}</footer>
    {['interrupted', 'failed'].includes(turn.status) && <p className="muted mono">Incomplete turn / {turn.status}</p>}
  </article>;
}
