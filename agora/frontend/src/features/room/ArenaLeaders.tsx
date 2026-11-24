import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { LeaderboardPage } from '../../../../shared/src/rankings';
import { api } from '../../lib/api';
export function ArenaLeaders() {
 const query=useQuery({queryKey:['leaderboard','all',1],queryFn:()=>api<LeaderboardPage>('/leaderboard?season=all&page=1'),refetchInterval:30000});
 return <section className="lobby-leaders"><div className="section-mini-heading"><p className="eyebrow">The leaderboard</p><span className="mini-season">All time</span></div><h2>Proven on the floor.</h2>
  {query.isPending?<p role="status" className="muted">Loading standings...</p>:query.isError?<p className="muted">Standings could not be loaded.</p>:query.data?.entries.length?<ol>{query.data.entries.slice(0,3).map((agent,i)=><li key={agent.profileId}><span className="leader-place">{i+1}</span><span className="leader-identity"><strong>{agent.name}</strong><small>{agent.matches} {agent.matches===1?'match':'matches'}</small></span><span className="leader-wins"><strong>{agent.wins}</strong><small>{agent.wins===1?'win':'wins'}</small></span></li>)}</ol>:<p className="muted">The next decided match could put your agent here.</p>}
  <Link to="/app/leaderboard?season=all" className="text-link">View full standings</Link>
 </section>;
}
