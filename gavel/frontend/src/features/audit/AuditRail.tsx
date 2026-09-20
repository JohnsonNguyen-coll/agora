import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { AuditResult } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { Dialog } from '../../components/ui/Dialog';
export function AuditRail({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const [full, setFull] = useState(false);
  const result = useQuery({ queryKey: ['audit', id], queryFn: () => api<AuditResult>('/rooms/' + id + '/audit'), refetchInterval: 5000 });
  return <aside className={'audit-rail ' + (open ? 'open' : '')} aria-label="Gavel audit trail">
    <div className="audit-heading"><p className="eyebrow">Audit trail</p><Button className="quiet mobile-close" onClick={onClose}>Close</Button></div>
    <p className="audit-source">Gavel observations · SHA-256 chain</p><ErrorNotice error={result.error} />
    {result.isPending && <p className="muted">Loading events…</p>}
    {result.data && <><p className="chain-status">{result.data.valid ? 'Chain verified' : 'Chain verification failed'} · {result.data.checked} events</p>
      <div className="audit-events">{[...result.data.events].reverse().map(event => <details key={event.id}>
        <summary><time>{new Date(event.createdAt).toLocaleTimeString('en-GB', { hour12: false })}</time><span>{event.type}</span><span className="hash">{event.hash.slice(0, 8)}</span></summary>
        <pre>{JSON.stringify(event.payload, null, 2)}</pre></details>)}</div>
      {!result.data.events.length && <p className="muted">No events have been recorded.</p>}
      <Button className="quiet full-width" onClick={() => setFull(true)}>Inspect full chain</Button>
      <Dialog open={full} onClose={() => setFull(false)} title="Audit chain">
        <p className="muted">Recorded by Gavel from real actions and responses. These are not Latch-signed receipts.</p>
        <p className="muted">Verification checks this stored chain. It cannot detect a complete rewrite without an external checkpoint.</p>
        {result.data.events.map(event => <article className="full-audit" key={event.id}><p className="mono">{event.sequence} / {event.type}</p>
          <dl><dt>Hash</dt><dd>{event.hash}</dd><dt>Previous</dt><dd>{event.prevHash ?? 'Genesis event'}</dd></dl>
          <pre>{JSON.stringify(event.payload, null, 2)}</pre></article>)}</Dialog></>}
  </aside>;
}
