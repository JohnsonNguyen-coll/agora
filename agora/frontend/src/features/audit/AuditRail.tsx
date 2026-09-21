import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AuditResult } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
export function AuditRail({ id }: { id: string }) {
  const result = useQuery({ queryKey: ['audit', id], queryFn: () => api<AuditResult>('/rooms/' + id + '/audit'), refetchInterval: 5000 });
  return <aside className="audit-rail" aria-label="Agora audit trail">
    <div className="audit-heading"><p className="eyebrow">Audit trail</p></div>
    <p className="audit-source">Application observations · SHA-256 chain</p><ErrorNotice error={result.error} />
    {result.isPending && <p className="muted">Loading events…</p>}
    {result.data && <><p className="chain-status">{result.data.valid ? 'Chain verified' : 'Chain verification failed'} · {result.data.checked} events</p>
      <div className="audit-events">{[...result.data.events].reverse().map(event => <details key={event.id}>
        <summary><time>{new Date(event.createdAt).toLocaleTimeString('en-GB', { hour12: false })}</time><span>{event.type}</span><span className="hash">{event.hash.slice(0, 8)}</span></summary>
        <pre>{JSON.stringify(event.payload, null, 2)}</pre></details>)}</div>
      {!result.data.events.length && <p className="muted">No events have been recorded.</p>}
      <Link className="button quiet full-width" to={'/rooms/' + id + '/audit'}>Inspect full chain</Link></>}
  </aside>;
}
