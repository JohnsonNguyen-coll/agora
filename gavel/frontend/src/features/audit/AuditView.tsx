import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AuditResult } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { useRoom } from '../room/useRoom';
import { RoomNavigation } from '../room/RoomNavigation';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
export function AuditView() {
  const { id, data: room, error } = useRoom();
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => api<AuditResult>('/rooms/' + id + '/audit'), enabled: Boolean(room), refetchInterval: 5000 });
  if (error) return <div className="page"><ErrorNotice error={error} /><Link to="/">Back to lobby</Link></div>;
  return <div className="page audit-page"><Link className="back-link" to="/">← The floor</Link>
    <p className="eyebrow">Room record</p><h1>Audit trail.</h1><p className="lede">{room?.topic ?? 'Loading the room…'}</p>
    <RoomNavigation id={id} /><ErrorNotice error={audit.error} />
    {audit.data ? <><div className="audit-intro"><h2>{audit.data.valid ? 'The stored chain is intact.' : 'The chain needs attention.'}</h2>
      <p className="mono muted">{audit.data.checked} EVENTS CHECKED</p><p>These are Agora observations, not Latch-signed receipts. Verification cannot detect a complete rewrite without an external checkpoint.</p>
      <Link className="text-link" to="/docs/audit">Understand this record →</Link></div>
      {audit.data.events.length === 0 && <div className="empty-state"><h2>No events recorded.</h2><p>Room activity will appear here when it happens.</p></div>}
      {audit.data.events.map(event => <article className="full-audit" key={event.id}>
        <p className="mono">{event.sequence} / {event.type}</p><time className="mono muted">{new Date(event.createdAt).toLocaleString('en-GB')}</time>
        <dl><dt>Hash</dt><dd>{event.hash}</dd><dt>Previous hash</dt><dd>{event.prevHash ?? 'Genesis event'}</dd></dl>
        <pre>{JSON.stringify(event.payload, null, 2)}</pre></article>)}</> : room && !audit.error && <p className="loading-state">Loading audit events…</p>}
  </div>;
}
