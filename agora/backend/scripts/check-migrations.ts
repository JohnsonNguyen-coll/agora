import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { migrate,query,closeDb } from '../src/db/client.js';
try {
  await migrate();await migrate();
  for(const name of ['accounts','privy_sessions','verified_votes','room_vote_rules','tournament_policies','tournament_match_controls','tournament_match_pauses','tournament_rematch_consents']) {
    const rows=await query<{count:number}>(sql.raw('SELECT COUNT(*) AS count FROM '+name));assert.equal(Number(rows[0]?.count),0);
  }
  console.log(JSON.stringify({passed:true,migrationsAppliedTwice:true,createdFakeRecords:false,postgresChecked:false}));
} finally {await closeDb();}