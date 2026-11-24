import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { Turn, Agent, RoomStatus } from '../../../../shared/src/types';
import { TRANSCRIPT_PAGE_SIZE } from './transcript-pagination';
import { TurnBlock } from './TurnBlock';
export function Transcript({ turns, agents, status }: { turns: Turn[]; agents: Agent[]; status: RoomStatus }) {
  const latest = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLElement>(null);
  const [params, setParams] = useSearchParams();
  const pageSize = TRANSCRIPT_PAGE_SIZE;
  const { hash } = useLocation();
  const totalPages = Math.max(1, Math.ceil(turns.length / pageSize));
  const requested = Number(params.get('turnPage'));
  const following = !params.has('turnPage');
  const page = following ? totalPages : Math.min(totalPages, Number.isSafeInteger(requested) && requested > 0 ? requested : 1);
  const start = (page - 1) * pageSize;
  const visible = turns.slice(start, start + pageSize);
  useEffect(() => {
    if (following || params.get('turnPage') === String(page)) return;
    const next = new URLSearchParams(params); next.set('turnPage', String(page)); setParams(next, { replace: true });
  }, [following, page, params, setParams]);
  useEffect(() => {
    if (!hash.startsWith('#turn-')) return;
    const frame = requestAnimationFrame(() => {
      const turn = document.getElementById(hash.slice(1));
      turn?.scrollIntoView({ block: 'center', behavior: 'auto' });
      turn?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, page]);
  function changePage(target: number) {
    const next = new URLSearchParams(params); next.set('turnPage', String(target)); setParams(next);
    requestAnimationFrame(() => container.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  }
  const live = status === 'live';
  let endLabel = 'End of the exchange.';
  if (status === 'waiting') endLabel = 'Waiting for the match to begin.';
  if (live) endLabel = following ? 'Following the latest arguments.' : 'You are reading earlier arguments. Use Latest argument to follow live.';
  function jumpToLatest() {
    const next = new URLSearchParams(params); next.delete('turnPage'); setParams(next);
    requestAnimationFrame(() => {
      latest.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' });
      latest.current?.focus({ preventScroll: true });
    });
  }
  return <section ref={container} className="transcript" aria-label="Debate transcript">
    <div className="transcript-heading"><div><p className="eyebrow">The exchange</p><h2>The conversation.</h2></div>
      {turns.length > 0 && <button type="button" className="button transcript-jump" onClick={jumpToLatest}>Latest argument</button>}</div>
    <p className="transcript-announcement" role="status">{turns.length} {turns.length === 1 ? 'argument' : 'arguments'} recorded{live ? ' · Updating live' : ''}</p>
    {turns.length === 0 ? <div className="empty-state transcript-empty">
      <div className="empty-dialogue" aria-hidden="true"><span>“</span><span>”</span></div>
      <h2>{live ? 'Waiting for the opening argument.' : status === 'waiting' ? 'The first word is still unwritten.' : 'No arguments were recorded.'}</h2>
      <p>{live ? 'Stay here. Submitted arguments will appear automatically.' : status === 'waiting' ? 'When both sides are ready, this space becomes the floor for their ideas.' : 'This match ended without a submitted argument.'}</p>
      <div className="transcript-sides"><span className="side-label for">FOR / SUPPORT</span><span className="side-label against">AGAINST / CHALLENGE</span></div>
    </div> : <div className="dialogue-thread">{visible.map(turn => <TurnBlock key={turn.id} turn={turn} agent={agents.find(a => a.side === turn.side)} />)}</div>}
    {turns.length > 0 && <nav className="transcript-pagination" aria-label="Transcript pagination">
      <p>Turns {start + 1}–{Math.min(start + pageSize, turns.length)} of {turns.length}</p>
      <div><button type="button" className="button" disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="button" disabled={page === totalPages} onClick={() => changePage(page + 1)}>Next</button></div>
    </nav>}
    <div ref={latest} tabIndex={-1} className="transcript-end" aria-label="End of current transcript">
      {turns.length > 0 && endLabel}
    </div>
  </section>;
}
