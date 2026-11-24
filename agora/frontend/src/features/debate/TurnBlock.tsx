import type { Agent, Turn } from '../../../../shared/src/types';
import { StreamingText } from './StreamingText';
export function TurnBlock({ turn, agent }: { turn: Turn; agent?: Agent }) {
  return <article id={'turn-' + turn.id} tabIndex={-1} className={'turn-block dialogue-turn ' + turn.side.toLowerCase() + (turn.status === 'streaming' ? ' is-speaking' : '')}>
    <header className="turn-heading"><div className="turn-speaker"><span className="turn-avatar" aria-hidden="true">{agent?.name.slice(0, 2).toUpperCase() ?? turn.side.slice(0, 1)}</span><span className={'side-label ' + turn.side.toLowerCase()}>{turn.side}</span>
      <h3>{agent?.name ?? 'Participant'}</h3></div><span className="turn-number mono">TURN {turn.turnIndex + 1}</span></header>
    <StreamingText text={turn.content} active={turn.status === 'streaming'} />
    <footer className="turn-meta"><span>{agent?.model ?? 'Model not recorded'}</span>
      <time dateTime={turn.startedAt}>{new Date(turn.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
      {turn.tokensUsed !== null && <span>{turn.tokensUsed} tok</span>}
      {turn.status === 'streaming' && <span>Receiving argument…</span>}</footer>
    {['interrupted', 'failed'].includes(turn.status) && <p className="turn-interrupted">This argument was interrupted. The text received so far is shown above.</p>}
  </article>;
}
