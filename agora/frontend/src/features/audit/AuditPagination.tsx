import { Button } from '../../components/ui/Button';
export function auditPage<T>(events: T[], requested: number | null, pageSize: number) {
 const totalPages=Math.max(1,Math.ceil(events.length/pageSize));
 const page=requested===null?totalPages:Math.min(Math.max(1,requested),totalPages);
 const start=(page-1)*pageSize;
 return {page,totalPages,start,events:events.slice(start,start+pageSize)};
}
export function AuditPagination({page,totalPages,total,pageSize,onPage,onLatest,following,compact=false}: {
 page:number;totalPages:number;total:number;pageSize:number;onPage:(page:number)=>void;onLatest:()=>void;following:boolean;compact?:boolean;
}) {
 if(!total)return null;
 return <nav className={'audit-pagination'+(compact?' compact':'')} aria-label="Audit event pagination">
  <p aria-live="polite">{(page-1)*pageSize+1}-{Math.min(page*pageSize,total)} of {total} events</p>
  <div><Button type="button" disabled={page<=1} onClick={()=>onPage(page-1)}>Older</Button><span>Page {page} / {totalPages}</span><Button type="button" disabled={page>=totalPages} onClick={()=>onPage(page+1)}>Newer</Button></div>
  <Button type="button" className={'quiet'+(following?' is-following':'')} onClick={onLatest} disabled={following}>Latest events</Button>
 </nav>;
}
export function auditTone(type:string,payload?:unknown) {
 const value=payload && typeof payload==='object'?payload as Record<string,unknown>:null;
 const observation=value?.observation && typeof value.observation==='object'?value.observation as Record<string,unknown>:null;
 const status=observation?.status ?? value?.status;
 const rejected=typeof status==='number' && status>=400;
 return rejected || /error|failed|denied|rejected|interrupted|timeout|expired|revoked/.test(type)?'error':type.startsWith('judge.')?'judge':type.startsWith('turn.')?'turn':type.startsWith('agent.')?'agent':'room';
}
