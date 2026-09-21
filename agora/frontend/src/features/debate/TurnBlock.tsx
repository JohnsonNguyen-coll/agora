import type { Agent, Turn } from '../../../../shared/src/types';
import { StreamingText } from './StreamingText';
export function TurnBlock({ turn, agent }: { turn: Turn; agent?: Agent }) {
  return <article className={'turn-block ' + turn.side.toLowerCase()}>
    <p className="turn-meta">{turn.side} · {agent?.model ?? 'Model not recorded'} · turn {turn.turnIndex}
      {turn.tokensUsed !== null && <> · {turn.tokensUsed} tok</>}</p>
    <StreamingText text={turn.content} active={turn.status === 'streaming'} />
    {['interrupted', 'failed'].includes(turn.status) && <p className="muted mono">Incomplete turn / {turn.status}</p>}
  </article>;
}
