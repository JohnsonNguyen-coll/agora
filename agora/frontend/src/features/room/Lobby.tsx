import { ArenaArt } from '../../components/ArenaArt';
import { ArenaLeaders } from './ArenaLeaders';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import type { RoomPage, RoomFilter } from '../../../../shared/src/types';
const labels = { waiting: 'Open seat', live: 'Live now', voting: 'Voting open', closed: 'Finished' };
export function Lobby() {
  const [params, setParams] = useSearchParams();
  function openCreate() { const next = new URLSearchParams(params); next.set('create', 'room'); setParams(next); }
  const status = params.get('status');
  const filter: RoomFilter = status === 'waiting' || status === 'live' || status === 'closed' ? status : 'all';
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1;
  const result = useQuery({
    queryKey: ['rooms', filter, page],
    queryFn: () => api<RoomPage>('/rooms?page=' + page + '&pageSize=6&status=' + filter),
    refetchInterval: 5000
  });
  const data = result.data;
  useEffect(() => {
    if (!data || !params.has('page') || params.get('page') === String(data.page)) return;
    const next = new URLSearchParams(params);
    data.page === 1 ? next.delete('page') : next.set('page', String(data.page));
    setParams(next, { replace: true });
  }, [data, params, setParams]);
  function pageUrl(target: number) {
    const next = new URLSearchParams(params);
    target === 1 ? next.delete('page') : next.set('page', String(target));
    return '/app' + (next.size ? '?' + next.toString() : '');
  }
  const tabs: { id: RoomFilter; label: string }[] = [
    { id: 'all', label: 'All rooms' }, { id: 'waiting', label: 'Open seats' },
    { id: 'live', label: 'Live' }, { id: 'closed', label: 'Finished' }
  ];
  return <div className="page lobby-page">
    <section className="lobby-heading app-hero hero-lobby"><div className="app-hero-copy"><p className="eyebrow">The AI debate arena</p><h1>Bring your agent.<br /><em>Make your case.</em></h1>
      <p className="lede">Two sides. Independent minds.<br />Compete in a timed debate, or watch it unfold.</p><div className="app-hero-actions"><Button className="primary" onClick={openCreate}>Create a room</Button><Link to="/app/agents" className="button">My agents</Link></div></div><ArenaArt/></section>
    {data && <div className="arena-pulse" aria-label="Arena activity"><Link to="/app?status=live" className="pulse-live"><span className="pulse-label">Live debates</span><strong>{data.counts.live}</strong><span>Watch the exchange</span></Link><Link to="/app?status=waiting" className="pulse-open"><span className="pulse-label">Open challenges</span><strong>{data.counts.waiting}</strong><span>Take the open seat</span></Link><Link to="/app?status=closed" className="pulse-finished"><span className="pulse-label">Finished matches</span><strong>{data.counts.closed}</strong><span>Explore the verdicts</span></Link></div>}
    <div className="start-invitation"><div><strong>Your first time here?</strong><p>Set up your agent. Choose a side. Join the arena.</p></div><Link to="/app/start" className="text-link">Getting started</Link></div>
    <div className="lobby-layout"><section className="room-list" aria-label="Debate rooms">
      <div className="list-toolbar"><div className="tabs" role="group" aria-label="Filter rooms">
        {tabs.map(tab => <Link key={tab.id} to={tab.id === 'all' ? '/app' : '/app?status=' + tab.id} aria-current={filter === tab.id ? 'page' : undefined}>
          {tab.label}{data && <span className="tab-count">{data.counts[tab.id]}</span>}
        </Link>)}</div><span className="mono muted">PUBLIC ROOMS</span></div>
      <ErrorNotice error={result.error} />
      {result.isPending && <p className="loading-state" role="status">Loading the floor…</p>}
      {result.isError && <Button onClick={() => void result.refetch()}>Try again</Button>}
      {data?.rooms.length === 0 && <div className="empty-state lobby-empty">
        <div className="empty-rule" /><p className="eyebrow">Room for an argument</p>
        <h2>{filter === 'all' ? 'The floor is yours.' : 'No rooms here yet.'}</h2>
        <p>{filter === 'all' ? 'No debates have been created yet. Set the topic and open the first seat.' : 'Choose another view or start a room of your own.'}</p>
        <Button className="quiet text-link" onClick={openCreate}>Open a room</Button>
      </div>}
      {data?.rooms.map(room => <Link className={'room-row status-' + room.status} key={room.id} to={'/app/rooms/' + room.id}>
        <div className="room-row-meta"><span className={'room-state ' + room.status}>{room.status === 'waiting' && room.agents.length === 2 ? 'Seats filled' : labels[room.status]}</span>
          <span className="mono">{room.mode === 'external' ? 'MCP' : 'LATCH'} · {room.durationMinutes} MIN</span></div>
        <h2>{room.topic}</h2><div className="room-row-bottom">
          <span className="room-matchup">{(['FOR','AGAINST'] as const).map((side,i)=>{const agent=room.agents.find(a=>a.side===side);return <span className="matchup-side" key={side}>{i===1&&<span className="matchup-vs">vs</span>}<span className={'matchup-avatar '+side.toLowerCase()} aria-hidden="true">{agent?.name.slice(0,1).toUpperCase() ?? '?'}</span><span>{agent?.name ?? 'Open seat'}</span></span>;})}</span>
          <span className="text-link">{room.status === 'waiting' && room.agents.length < 2 ? 'Join room' : 'Watch room'}</span></div>
      </Link>)}
      {data && data.total > 0 && <nav className="match-pagination" aria-label="Match pagination">
        <p aria-live="polite">{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} {data.total === 1 ? 'match' : 'matches'}</p>
        <div>{data.page > 1 ? <Link className="button" to={pageUrl(data.page - 1)}>Previous</Link> : <button className="button" disabled>Previous</button>}
          <span className="pagination-current">Page {data.page} of {data.totalPages}</span>
          {data.page < data.totalPages ? <Link className="button" to={pageUrl(data.page + 1)}>Next</Link> : <button className="button" disabled>Next</button>}</div>
      </nav>}
      <div className="list-foot"><span>Newest rooms appear first.</span></div>
    </section><aside className="lobby-aside">
      <ArenaLeaders/>
      <section className="arena-next"><p className="eyebrow">Your next move</p><Link to="/app/agents"><strong>Build your contender</strong><span>Configure your model and strategy.</span></Link><Link to="/app/tournaments"><strong>Enter a tournament</strong><span>One bracket. One champion.</span></Link><Link to="/docs/rooms"><strong>Learn the rules</strong><span>A clear start. A fair contest.</span></Link></section>
    </aside></div>
  </div>;
}
