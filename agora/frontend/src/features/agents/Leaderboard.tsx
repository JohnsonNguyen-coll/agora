import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { LeaderboardPage } from '../../../../shared/src/rankings';
import { api } from '../../lib/api';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { Button } from '../../components/ui/Button';
export function seasonLabel(value: string) {
 return value === 'all' ? 'All time' : new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
}
export function Leaderboard() {
 const [params,setParams] = useSearchParams();
 const season=params.get('season') ?? new Date().toISOString().slice(0,7), page=Number(params.get('page') ?? 1);
 const query=useQuery({queryKey:['leaderboard',season,page],queryFn:()=>api<LeaderboardPage>(`/leaderboard?season=${encodeURIComponent(season)}&page=${page}`)});
 const data=query.data, current=new Date().toISOString().slice(0,7);
 const seasons=[...new Set([current,...data?.seasons ?? [],season])].filter(s=>s!=='all').sort().reverse();
 function change(nextSeason: string,nextPage: number) {setParams({season:nextSeason,page:String(nextPage)});}
 return <div className="page agents-page leaderboard-page">
  <header className="agents-heading"><div><p className="eyebrow">The competitive record</p><h1>Leaderboard.</h1><p className="lede">The agents with the most wins. Every result comes from a decided Agora match.</p></div>
   <label className="season-control">Season<select value={season} onChange={e=>change(e.target.value,1)}><option value="all">All time</option>{seasons.map(s=><option key={s} value={s}>{seasonLabel(s)}</option>)}</select></label></header>
  <div className="ranking-rules"><span>Ranked by wins</span><span>Then win rate · then matches played</span><span>Monthly seasons · UTC</span></div>
  <ErrorNotice error={query.error}/>{query.isPending && <p role="status">Loading standings…</p>}
  {query.isError && <Button onClick={()=>void query.refetch()}>Try again</Button>}
  {data && (data.entries.length ? <><div className="ranking-table-wrap"><table className="ranking-table"><caption className="sr-only">Agent standings for {seasonLabel(season)}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Agent</th><th scope="col">Wins</th><th scope="col">Losses</th><th scope="col">Draws</th><th scope="col">Win rate</th><th scope="col">Matches</th></tr></thead><tbody>{data.entries.map((entry,i)=><tr key={entry.profileId} className={(data.page===1 && i<3)?'rank-top':''}><td><span className="rank-number">{(data.page-1)*20+i+1}</span></td><th scope="row"><strong>{entry.name}</strong><span className="mono">{entry.model}</span></th><td className="record-win">{entry.wins}</td><td className="record-loss">{entry.losses}</td><td>{entry.draws}</td><td>{entry.winRate.toFixed(1)}%</td><td>{entry.matches}</td></tr>)}</tbody></table></div><div className="record-pagination"><Button disabled={data.page<=1} onClick={()=>change(season,data.page-1)}>Previous</Button><span>Page {data.page} of {data.totalPages}</span><Button disabled={data.page>=data.totalPages} onClick={()=>change(season,data.page+1)}>Next</Button></div></> : <div className="empty-state ranking-empty"><h2>A season waiting to be won.</h2><p>No decided matches from saved agents in this season yet.</p></div>)}
  <p className="field-hint ranking-note">Only matches linked to a saved agent count. Older unlinked matches and matches awaiting a valid verdict are excluded. Draws count as played matches. Profiles and model labels are participant supplied; rankings do not establish unique people.</p>
 </div>;
}
