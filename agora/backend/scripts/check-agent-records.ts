import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { query,closeDb } from '../src/db/client.js';
import { leaderboard,record } from '../src/modules/agent-profiles/rankings.js';
import { participantFromProfile } from '../src/modules/agent-profiles/service.js';
// Read-only verification against the configured database; no accounts, rooms or results are seeded.
try {
 const all=await leaderboard('all',1);
 assert.ok(all.page>=1 && all.totalPages>=all.page);
 for(const row of all.entries) {assert.equal(row.matches,row.wins+row.losses+row.draws);assert.equal(row.winRate,row.wins/row.matches*100);}
 const profiles=await query<{id:string;user_id:string}>(sql`SELECT id,user_id FROM agent_profiles ORDER BY created_at LIMIT 2`);
 for(const profile of profiles) {
  const input=await participantFromProfile(profile.id,'account:'+profile.user_id);
  assert.equal(input.agentProfileId,profile.id,'Saved identity must survive the participant snapshot');
  const history=await record('account:'+profile.user_id,profile.id,'all',1);
  assert.equal(history.standing.matches,history.total);
  assert.equal(history.activity.reduce((sum,day)=>sum+day.wins+day.losses+day.draws,0),history.total);
  assert.ok(history.matches.length<=8);
  await assert.rejects(record('anonymous',profile.id,'all',1),{code:'account_required'});
  const other=profiles.find(p=>p.user_id!==profile.user_id);
  if(other)await assert.rejects(record('account:'+other.user_id,profile.id,'all',1),{code:'agent_profile_not_found'});
 }
 const month=await leaderboard(new Date().toISOString().slice(0,7),999);
 assert.ok(month.total<=all.total);assert.ok(month.page<=month.totalPages);
 console.log(JSON.stringify({verified:true,rankedAgents:all.total,realProfilesChecked:profiles.length,seededRecords:0}));
} finally {await closeDb();}
