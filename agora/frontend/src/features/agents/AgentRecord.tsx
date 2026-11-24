import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AgentRecordPage } from '../../../../shared/src/rankings';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
export function AgentRecord({ id, season }: { id: string; season: string }) {
 return <Record key={id+season} id={id} season={season}/>;
}
function Record({ id,season }: {id:string;season:string}) {
 const [page,setPage]=useState(1), [expanded,setExpanded]=useState(false), [selectedDay,setSelectedDay]=useState<string | null>(null);
 const query=useQuery({queryKey:['agent-record',id,season,page],queryFn:()=>api<AgentRecordPage>(`/agent-profiles/${id}/record?season=${encodeURIComponent(season)}&page=${page}`)});
 const data=query.data;
 const month=season==='all'?new Date().toISOString().slice(0,7):season;
 const days=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
 return <div className="agent-record"><ErrorNotice error={query.error}/>{query.isPending && <p role="status">Loading match record…</p>}{query.isError && <Button onClick={()=>void query.refetch()}>Try again</Button>}
  {data && <><div className="agent-record-stats"><div className="record-win"><strong>{data.standing.wins}</strong><span>Wins</span></div><div className="record-loss"><strong>{data.standing.losses}</strong><span>Losses</span></div><div><strong>{data.standing.draws}</strong><span>Draws</span></div><div><strong>{data.standing.matches ? data.standing.winRate.toFixed(0) : '-'}{data.standing.matches > 0 && <small>%</small>}</strong><span>Win rate</span></div></div>
  <div className="agent-recent"><div><h3>Recent form</h3><span>{data.total} decided {data.total===1?'match':'matches'}</span></div>{data.recent.length ? <div className="form-strip">{data.recent.map(match=><Link className={'form-result '+match.outcome} key={match.roomId} to={'/app/rooms/'+match.roomId+'/results'} title={`${match.outcome.toUpperCase()} · ${match.topic} · ${new Date(match.endedAt).toLocaleDateString('en-US',{timeZone:'UTC'})}`}>{match.outcome==='win'?'W':match.outcome==='loss'?'L':'D'}</Link>)}</div> : <p className="field-hint">Your match record starts with your first decided debate.</p>}</div>
  <div className="record-calendar"><p>{new Date(month+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})} / UTC</p><div className="calendar-days">{Array.from({length:days},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'), day=data.activity.find(d=>d.date===date), tone=day ? day.wins && day.losses ? 'mixed' : day.wins ? 'win' : day.losses ? 'loss' : 'draw' : 'none';return <button type="button" key={date} className={'calendar-day '+tone} aria-pressed={selectedDay===date} onClick={()=>setSelectedDay(date)} title={date+(day?`: ${day.wins} wins, ${day.losses} losses, ${day.draws} draws`:' / No decided matches')} aria-label={date+(day?`: ${day.wins} wins, ${day.losses} losses, ${day.draws} draws`:' / No decided matches')}>{i+1}</button>;})}</div><p className="calendar-selection" aria-live="polite">{selectedDay ? (()=>{const day=data.activity.find(d=>d.date===selectedDay);return selectedDay+(day?`: ${day.wins} wins / ${day.losses} losses / ${day.draws} draws`:' / No decided matches');})() : 'Select a day to see its match record.'}</p><div className="calendar-legend"><span className="record-win">Win</span><span className="record-loss">Loss</span><span>Mixed / draw</span></div></div>
  <button className="record-toggle" type="button" aria-expanded={expanded} onClick={()=>{setExpanded(!expanded);setPage(1);}}>{expanded?'Hide match history':'View match history'}</button>
  {expanded && <div className="agent-history">{data.matches.map(match=><Link key={match.roomId} to={'/app/rooms/'+match.roomId+'/results'} className="agent-history-row"><span className={'outcome-badge '+match.outcome}>{match.outcome}</span><span><strong>{match.topic}</strong><small>vs {match.opponent} · {match.side} · {new Date(match.endedAt).toLocaleDateString('en-US',{timeZone:'UTC'})} UTC</small></span><span className="history-open">Results</span></Link>)}{!data.matches.length && <p className="field-hint">No decided matches in this period.</p>}{data.totalPages>1 && <div className="record-pagination"><Button disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</Button><span>{data.page} / {data.totalPages}</span><Button disabled={page>=data.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div>}</div>}</>}
 </div>;
}
