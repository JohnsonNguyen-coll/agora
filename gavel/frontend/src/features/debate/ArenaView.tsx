import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Room } from '../../../../shared/src/types';
import { useRoom } from '../room/useRoom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { JoinRoom } from '../room/JoinRoom';
import { Transcript } from './Transcript';
import { Seats } from './Seats';
import { RoomClock } from './RoomClock';
import { AuditRail } from '../audit/AuditRail';
import { VoteBar } from '../vote/VoteBar';
import { exportTranscript } from './export';
export function ArenaView() {
  const { id, data: room, error, runtime, connected } = useRoom();
  const [joining, setJoining] = useState(false), [auditOpen, setAuditOpen] = useState(false), [copyText, setCopyText] = useState('Copy room link');
  const client = useQueryClient();
  const ready = useMutation({ mutationFn: () => api<Room>('/rooms/' + id + '/ready', {}),
    onSuccess: value => client.setQueryData(['room', id], value) });
  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); setCopyText('Link copied'); }
    catch { setCopyText('Copy the URL from your browser'); }
  }
  if (error) return <div className="page"><ErrorNotice error={error} /><Link to="/">Back to lobby</Link></div>;
  if (!room) return <div className="page loading-state">Loading the room…</div>;
  const me = room.agents.find(a => a.side === room.mySide);
  return <div className="page arena-page"><div className="arena-breadcrumb"><Link to="/">← The floor</Link>
    <span className="mono muted">{connected ? 'CONNECTED' : 'RECONNECTING'}</span></div>
    <header className="arena-header"><div><p className="eyebrow">{room.status === 'waiting' ? 'Waiting for the opening bell' : room.status}</p><h1>{room.topic}</h1>
      <p className="mono muted">{room.turns} {room.turns === 1 ? 'TURN' : 'TURNS'} RECORDED</p></div>
      <RoomClock end={room.endsAt} minutes={room.durationMinutes} live={room.status === 'live'} /></header>
    <div className="arena-actions"><Button className="quiet" onClick={() => void copy()}>{copyText}</Button>
      <Button className="quiet" onClick={() => exportTranscript(room)} disabled={!room.transcript.length}>Export transcript</Button>
      <Button className="quiet" onClick={() => setAuditOpen(!auditOpen)}>{auditOpen ? 'Hide audit trail' : 'View audit trail'}</Button></div>
    {runtime && !runtime.debateAvailable && room.status === 'waiting' && <div className="availability-notice" role="status">{runtime.reason} You can create or join a room in the meantime.</div>}
    <div className={'arena-layout ' + (auditOpen ? 'audit-visible' : '')}><div className="arena-main">
      <Seats room={room} onJoin={() => setJoining(true)} />
      {room.status === 'waiting' && me && <div className="ready-strip"><p>{me.ready ? 'You’re ready. Waiting for your opponent.' : 'Ready to stand behind your argument?'}</p>
        <Button className="primary" disabled={me.ready || ready.isPending || !runtime?.debateAvailable} onClick={() => ready.mutate()}>{me.ready ? 'Ready' : ready.isPending ? 'Confirming…' : 'I’m ready'}</Button></div>}
      <ErrorNotice error={ready.error} /><Transcript turns={room.transcript} agents={room.agents} live={room.status === 'live'} />
      {room.endReason && <p className="end-reason">{room.endReason}</p>}
      <VoteBar room={room} />
      {['voting','closed'].includes(room.status) && <Link className="text-link results-link" to={'/rooms/' + id + '/results'}>View results →</Link>}
    </div><AuditRail id={id} open={auditOpen} onClose={() => setAuditOpen(false)} /></div>
    {joining && <JoinRoom id={id} side={room.agents.some(a => a.side === 'FOR') ? 'AGAINST' : 'FOR'} open onClose={() => setJoining(false)} />}
  </div>;
}
