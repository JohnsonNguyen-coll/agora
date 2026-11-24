import { sql } from 'drizzle-orm';
import { query } from '../../db/client.js';
import { requireAccount } from '../auth/service.js';
import { finalVerdict, type Judgement, type JudgePass } from '../../../../shared/src/judging.js';
import type { AgentStanding, AgentMatch, LeaderboardPage, AgentRecordPage } from '../../../../shared/src/rankings.js';
import { AppError } from '../../lib/errors.js';

interface SeatResult {
 profile_id: string; name: string; model: string; room_id: string; topic: string; ends_at: string;
 side: 'FOR' | 'AGAINST'; opponent: string; passes_json: string; for_votes: number | string; against_votes: number | string;
}
// Only completed verdicts count. Neither agent names nor model labels establish identity.
async function results(season: string, profileId?: string): Promise<SeatResult[]> {
 const filter = season === 'all' ? sql`1=1` : sql`SUBSTR(r.ends_at,1,7)=${season}`;
 return query<SeatResult>(sql`SELECT s.profile_id,COALESCE(p.name,a.name) AS name,COALESCE(p.model,a.model) AS model,
  r.id AS room_id,r.topic,r.ends_at,a.side,j.passes_json,
  COALESCE((SELECT other.name FROM agents other WHERE other.room_id=r.id AND other.side<>a.side),'Opponent') AS opponent,
  (SELECT COUNT(*) FROM votes v WHERE v.room_id=r.id AND v.side='FOR' AND
   (NOT EXISTS(SELECT 1 FROM room_vote_rules rule WHERE rule.room_id=r.id) OR EXISTS(SELECT 1 FROM verified_votes vv WHERE vv.vote_id=v.id))) AS for_votes,
  (SELECT COUNT(*) FROM votes v WHERE v.room_id=r.id AND v.side='AGAINST' AND
   (NOT EXISTS(SELECT 1 FROM room_vote_rules rule WHERE rule.room_id=r.id) OR EXISTS(SELECT 1 FROM verified_votes vv WHERE vv.vote_id=v.id))) AS against_votes
  FROM agent_profile_seats s JOIN agents a ON a.id=s.agent_id JOIN rooms r ON r.id=a.room_id
  JOIN judgements j ON j.room_id=r.id LEFT JOIN agent_profiles p ON p.id=s.profile_id
  WHERE r.status='closed' AND j.status='completed' AND r.ends_at IS NOT NULL AND ${filter}
   AND ${profileId ? sql`s.profile_id=${profileId}` : sql`1=1`}
  ORDER BY r.ends_at DESC,r.id DESC`);
}
function outcome(row: SeatResult): AgentMatch['outcome'] | null {
 const judgement: Judgement = { status: 'completed', passes: JSON.parse(row.passes_json) as JudgePass[], rubric: '', model: null, error: null, completedAt: null };
 const verdict = finalVerdict({ FOR: Number(row.for_votes), AGAINST: Number(row.against_votes) }, judgement);
 return !verdict ? null : !verdict.winner ? 'draw' : verdict.winner === row.side ? 'win' : 'loss';
}
function empty(profileId: string, name: string, model: string): AgentStanding {
 return { profileId, name, model, wins: 0, losses: 0, draws: 0, matches: 0, winRate: 0 };
}
function count(standing: AgentStanding, result: AgentMatch['outcome']) {
 standing.matches++; standing[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws']++;
 standing.winRate = standing.wins / standing.matches * 100;
}
export async function leaderboard(season: string, requestedPage: number): Promise<LeaderboardPage> {
 const seasonRows = await query<{ season: string }>(sql`SELECT DISTINCT SUBSTR(r.ends_at,1,7) AS season FROM rooms r
  JOIN judgements j ON j.room_id=r.id JOIN agents a ON a.room_id=r.id JOIN agent_profile_seats s ON s.agent_id=a.id
  WHERE r.status='closed' AND j.status='completed' AND r.ends_at IS NOT NULL ORDER BY season DESC`);
 const standings = new Map<string, AgentStanding>();
 for (const row of await results(season)) {
  const result = outcome(row); if (!result) continue;
  const standing = standings.get(row.profile_id) ?? empty(row.profile_id,row.name,row.model);
  count(standing,result); standings.set(row.profile_id,standing);
 }
 const ranked = [...standings.values()].sort((a,b) => b.wins-a.wins || b.winRate-a.winRate || b.matches-a.matches || a.profileId.localeCompare(b.profileId));
 const totalPages = Math.max(1,Math.ceil(ranked.length/20)), page = Math.min(requestedPage,totalPages);
 return { season, seasons: seasonRows.map(row=>row.season), entries: ranked.slice((page-1)*20,page*20), total: ranked.length, page, totalPages };
}
export async function record(session: string, id: string, season: string, requestedPage: number): Promise<AgentRecordPage> {
 const account = await requireAccount(session);
 const profile = (await query<{ name: string; model: string }>(sql`SELECT name,model FROM agent_profiles WHERE id=${id} AND user_id=${account.id}`))[0];
 if (!profile) throw new AppError(404,'agent_profile_not_found','This saved agent could not be found.');
 const standing = empty(id,profile.name,profile.model), matches: AgentMatch[] = [];
 const rows = await results('all',id), seasons = [...new Set(rows.map(row=>row.ends_at.slice(0,7)))];
 const activity = new Map<string,{date:string;wins:number;losses:number;draws:number}>();
 for (const row of rows) {
  if (season !== 'all' && row.ends_at.slice(0,7) !== season) continue;
  const result = outcome(row); if (!result) continue;
  const date=row.ends_at.slice(0,10), day=activity.get(date) ?? {date,wins:0,losses:0,draws:0};
  day[result==='win'?'wins':result==='loss'?'losses':'draws']++; activity.set(date,day);
  count(standing,result); matches.push({roomId:row.room_id,topic:row.topic,endedAt:row.ends_at,side:row.side,outcome:result,opponent:row.opponent});
 }
 const totalPages = Math.max(1,Math.ceil(matches.length/8)), page = Math.min(requestedPage,totalPages);
 return { standing, seasons, recent: matches.slice(0,8), activity: [...activity.values()], matches: matches.slice((page-1)*8,page*8), total: matches.length, page, totalPages };
}
