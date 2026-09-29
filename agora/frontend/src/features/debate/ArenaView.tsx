import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Room } from '../../../../shared/src/types';
import { useRoom } from '../room/useRoom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { RoomNavigation } from '../room/RoomNavigation';
import { Transcript } from './Transcript';
import { MatchStatus } from './MatchStatus';
import { Seats } from './Seats';
import { RoomClock } from './RoomClock';
import { AuditRail } from '../audit/AuditRail';
import { VoteBar } from '../vote/VoteBar';
import { exportTranscript } from './export';
export function ArenaView() {
  const { id, data: room, error, runtime, connected } = useRoom();
  const [copyText, setCopyText] = useState('Copy room link');
  const navigate = useNavigate();
  const client = useQueryClient();
  const ready = useMutation({ mutationFn: () => api<Room>('/rooms/' + id + '/ready', {}),
    onSuccess: value => client.setQueryData(['room', id], value) });
  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); setCopyText('Link copied'); }
    catch { setCopyText('Copy the URL from your browser'); }
  }
  if (error) return <div className="page"><ErrorNotice error={error} /><Link to="/app">Back to lobby</Link></div>;
  if (!room) return <div className="page loading-state">Loading the room…</div>;
  const me = room.agents.find(a => a.side === room.mySide);
  return <div className="page arena-page"><div className="arena-breadcrumb"><Link to="/app">← Lobby</Link>
    <span className="mono muted">{room.mode === 'external' ? 'MCP ARENA' : 'LATCH ARENA'}</span></div>
    <header className="arena-header"><div><p className="eyebrow">{room.status === 'waiting' ? 'Waiting for the opening bell' : room.status === 'live' ? 'Live on the floor' : room.status === 'voting' ? 'Audience voting is open' : 'A debate on the record'}</p><h1>{room.topic}</h1>
      <p className="mono muted">{room.turns} {room.turns === 1 ? 'TURN' : 'TURNS'} RECORDED</p></div>
      <RoomClock end={room.status === 'voting' ? room.votingEndsAt : room.endsAt} minutes={room.status === 'voting' ? 1 : room.durationMinutes} live={room.status === 'live'} voting={room.status === 'voting'} /></header>
    <div className="arena-actions"><Button className="quiet" onClick={() => void copy()}>{copyText}</Button>
      <Button className="quiet" onClick={() => exportTranscript(room)} disabled={!room.transcript.length}>Export transcript</Button>
      <Link className="button quiet" to={'/app/rooms/' + id + '/audit'}>View audit trail</Link></div><RoomNavigation id={id} />
    {room.mode === 'external' && <div className="availability-notice">External agents · Model labels are self-reported. Arguments are published one turn at a time. <Link to="/app/connect">Connect agent →</Link></div>}
    {room.mode === 'latch' && runtime && !runtime.debateAvailable && room.status === 'waiting' && <div className="availability-notice" role="status">{runtime.reason} You can create or join a room in the meantime.</div>}
    <MatchStatus room={room} connected={connected} />
    <div className="arena-layout"><div className="arena-main">
      <Seats room={room} onJoin={() => navigate('/app/rooms/' + id + '/join')} />
      {room.status === 'waiting' && me && <div className="ready-strip"><p>{me.ready ? 'You’re ready. Waiting for your opponent.' : 'Ready to stand behind your argument?'}</p>
        <Button className="primary" disabled={me.ready || ready.isPending || (room.mode === 'latch' && !runtime?.debateAvailable)} onClick={() => ready.mutate()}>{me.ready ? 'Ready' : ready.isPending ? 'Confirming…' : 'I’m ready'}</Button></div>}
      <ErrorNotice error={ready.error} /><Transcript turns={room.transcript} agents={room.agents} status={room.status} />
      {room.endReason && <p className="end-reason">{room.endReason}</p>}
      <VoteBar room={room} />
      {['voting','closed'].includes(room.status) && <Link className="text-link results-link" to={'/app/rooms/' + id + '/results'}>View results →</Link>}
    </div><AuditRail id={id} /></div>
  </div>;
}
