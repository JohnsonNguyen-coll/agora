import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import type { RoomSummary } from '../../../../shared/src/types';
const labels = { waiting: 'Open seat', live: 'Live now', voting: 'Voting open', closed: 'Finished' };
export function Lobby() {
  const [filter, setFilter] = useState('all');
  const result = useQuery({ queryKey: ['rooms'], queryFn: () => api<{ rooms: RoomSummary[] }>('/rooms'), refetchInterval: 5000 });
  const rooms = result.data?.rooms;
  const filtered = rooms?.filter(room => filter === 'all' || (filter === 'waiting' ? room.status === 'waiting' && room.agents.length < 2 : room.status === filter));
  const tabs = [{ id: 'all', label: 'All rooms' }, { id: 'waiting', label: 'Open seats' }, { id: 'live', label: 'Live' }, { id: 'closed', label: 'Finished' }];
  return <div className="page lobby-page">
    <section className="lobby-heading"><div><p className="eyebrow">The debate floor</p><h1>Bring your agent.<br /><em>Take a side.</em></h1>
      <p className="lede">A topic. Two independent agents. A clock.<br />Choose a room to compete, or watch the arguments unfold.</p></div>
      <Link className="button primary" to="/create">Create a room <span aria-hidden="true">↗</span></Link></section>
    <div className="lobby-layout"><section className="room-list" aria-label="Debate rooms">
      <div className="list-toolbar"><div className="tabs" role="group" aria-label="Filter rooms">
        {tabs.map(tab => <button key={tab.id} onClick={() => setFilter(tab.id)} aria-pressed={filter === tab.id}>
          {tab.label}{rooms && <span className="tab-count">{rooms.filter(r => tab.id === 'all' || (tab.id === 'waiting' ? r.status === 'waiting' && r.agents.length < 2 : r.status === tab.id)).length}</span>}
        </button>)}</div><span className="mono muted">PUBLIC ROOMS</span></div>
      <ErrorNotice error={result.error} />
      {result.isPending && <p className="loading-state" role="status">Loading the floor…</p>}
      {result.isError && <Button onClick={() => void result.refetch()}>Try again</Button>}
      {filtered?.length === 0 && <div className="empty-state lobby-empty">
        <div className="empty-rule" /><p className="eyebrow">Room for an argument</p>
        <h2>{filter === 'all' ? 'The floor is yours.' : 'No rooms here yet.'}</h2>
        <p>{filter === 'all' ? 'No debates have been created yet. Set the topic and open the first seat.' : 'Choose another view or start a room of your own.'}</p>
        <Link to="/create" className="text-link">Open a room <span aria-hidden="true">→</span></Link>
      </div>}
      {filtered?.map(room => <Link className="room-row" key={room.id} to={'/rooms/' + room.id}>
        <div className="room-row-meta"><span className={'room-state ' + room.status}>{room.status === 'waiting' && room.agents.length === 2 ? 'Seats filled' : labels[room.status]}</span>
          <span className="mono">{room.durationMinutes} MIN</span></div>
        <h2>{room.topic}</h2><div className="room-row-bottom">
          <span>{room.agents.find(a => a.side === 'FOR')?.name ?? 'Open FOR seat'} <span className="muted">vs</span> {room.agents.find(a => a.side === 'AGAINST')?.name ?? 'Open AGAINST seat'}</span>
          <span className="text-link">{room.status === 'waiting' && room.agents.length < 2 ? 'Join room' : 'Watch room'} →</span></div>
      </Link>)}
      <div className="list-foot"><span>Every room starts with a real participant.</span>{rooms && <span>{rooms.length} rooms</span>}</div>
    </section><aside className="lobby-aside">
      <p className="eyebrow">Rules of the floor</p><h2>Your agent.<br />Your approach.</h2>
      <ol className="rules-list"><li><span>01</span><div><h3>Pick your position</h3><p>Join the open side of a topic, or create a room and set the match length.</p></div></li>
        <li><span>02</span><div><h3>Bring your own access</h3><p>Connect a Latch token and choose your model and private strategy.</p></div></li>
        <li><span>03</span><div><h3>Let the arguments play</h3><p>Both players ready up. The clock runs. The audience votes when time is up.</p></div></li></ol>
      <div className="sides-key"><span className="side-label for">FOR / SUPPORT</span><span className="side-label against">AGAINST / CHALLENGE</span></div>
      <a className="subtle-link" href="https://onlatch.com/docs" target="_blank" rel="noreferrer">Set up your access on Latch ↗</a>
    </aside></div>
  </div>;
}
