import { Link, useSearchParams } from 'react-router-dom';
import { AuditPagination, auditPage, auditTone } from './AuditPagination';
import { useQuery } from '@tanstack/react-query';
import type { AuditResult } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { useRoom } from '../room/useRoom';
import { RoomNavigation } from '../room/RoomNavigation';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
export function AuditView() {
  const { id, data: room, error } = useRoom();
  const [params,setParams]=useSearchParams();
  const requested=Number(params.get('auditPage'));
  const explicitPage=params.has('auditPage') && Number.isSafeInteger(requested) && requested>0?requested:null;
  const filter=['turn','agent','judge','room','error'].includes(params.get('eventType') ?? '')?params.get('eventType')!:'all';
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => api<AuditResult>('/rooms/' + id + '/audit'), enabled: Boolean(room), refetchInterval: 5000 });
  const events=audit.data?.events.filter(event=>filter==='all'||auditTone(event.type,event.payload)===filter) ?? [];
  const window=auditPage(events,explicitPage,12);
  function change(page:number|null,type=filter) {
    const next=new URLSearchParams(params); page===null?next.delete('auditPage'):next.set('auditPage',String(page));
    type==='all'?next.delete('eventType'):next.set('eventType',type); setParams(next,{preventScrollReset:true});
  }
  const pagination=<AuditPagination {...window} total={events.length} pageSize={12} onPage={page=>change(page)} onLatest={()=>change(null)} following={explicitPage===null}/>;
  if (error) return <div className="page"><ErrorNotice error={error} /><Link to="/app">Back to lobby</Link></div>;
  return <div className="page audit-page"><Link className="back-link" to={'/app/rooms/' + id}>← Arena</Link>
    <p className="eyebrow">Room record</p><h1>Audit trail.</h1><p className="lede">{room?.topic ?? 'Loading the room…'}</p>
    <RoomNavigation id={id} /><ErrorNotice error={audit.error} />
    {audit.data ? <><div className={"audit-intro "+(audit.data.valid?"chain-valid":"chain-invalid")}><h2>{audit.data.valid ? 'The stored chain is intact.' : 'The chain needs attention.'}</h2>
      <p className="mono muted">{audit.data.checked} EVENTS CHECKED</p><p>These are Agora observations, not Latch-signed receipts. Verification cannot detect a complete rewrite without an external checkpoint.</p>
      <Link className="text-link" to="/docs/audit">Understand this record</Link></div>
      <div className="audit-filter-bar" role="group" aria-label="Filter audit events">{[['all','All activity'],['turn','Arguments'],['agent','Agents'],['judge','Judging'],['room','Room'],['error','Errors']].map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>change(null,key)}>{label}<span>{key==='all'?audit.data.events.length:audit.data.events.filter(e=>auditTone(e.type,e.payload)===key).length}</span></button>)}</div>
      {pagination}
      {events.length === 0 && <div className="empty-state"><h2>{audit.data.events.length?'No events in this view.':'No events recorded.'}</h2><p>{audit.data.events.length?'Choose another category to inspect the record.':'Room activity will appear here when it happens.'}</p></div>}
      <div className="audit-timeline">{window.events.map(event => <article className={"full-audit tone-"+auditTone(event.type,event.payload)} key={event.id}>
        <header className="audit-row-heading"><p className="mono audit-event-title"><span>EVENT {event.sequence}</span><strong>{event.type}</strong></p><time className="mono muted">{new Date(event.createdAt).toLocaleString('en-GB')}</time></header><div className="audit-event-tools">
        <details className="audit-integrity"><summary>Integrity hashes</summary><dl><dt>Hash</dt><dd>{event.hash}</dd><dt>Previous hash</dt><dd>{event.prevHash ?? 'Genesis event'}</dd></dl></details>
        <details className="audit-payload" open={auditTone(event.type,event.payload)==='error'}><summary>Event data</summary><pre>{JSON.stringify(event.payload, null, 2)}</pre></details></div></article>)}</div>{events.length>12 && pagination}</> : room && !audit.error && <p className="loading-state">Loading audit events…</p>}
  </div>;
}
