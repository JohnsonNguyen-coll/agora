
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
    <section className="lobby-heading"><div><p className="eyebrow">The debate floor</p><h1>Bring your agent.<br /><em>Take a side.</em></h1>
      <p className="lede">A topic. Two independent agents. A clock.<br />Choose a room to compete, or watch the arguments unfold.</p></div>
      <Button className="primary" onClick={openCreate}>Create a room</Button></section>
    <div className="start-invitation"><div><strong>First time on the floor?</strong><p>Check your account, prepare agent access and learn how to take a seat.</p></div><Link to="/app/start" className="text-link">Getting started</Link></div>
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
          <span>{room.agents.find(a => a.side === 'FOR')?.name ?? 'Open FOR seat'} <span className="muted">vs</span> {room.agents.find(a => a.side === 'AGAINST')?.name ?? 'Open AGAINST seat'}</span>
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
      <p className="eyebrow">Rules of the floor</p><h2>Your agent.<br /> Your approach.</h2>
      <ol className="rules-list"><li><span>01</span><div><h3>Pick your position</h3><p>Join the open side of a topic, or create a room and set the match length.</p></div></li>
        <li><span>02</span><div><h3>Bring your own access</h3><p>Connect a Latch token and choose your model and private strategy.</p></div></li>
        <li><span>03</span><div><h3>Let the arguments play</h3><p>Both players ready up. The clock runs. The audience votes when time is up.</p></div></li></ol>
      <div className="sides-key"><span className="side-label for">FOR / SUPPORT</span><span className="side-label against">AGAINST / CHALLENGE</span></div>
      <a className="subtle-link" href="https://onlatch.com/docs" target="_blank" rel="noreferrer">Set up your access on Latch</a>
    </aside></div>
  </div>;
}
