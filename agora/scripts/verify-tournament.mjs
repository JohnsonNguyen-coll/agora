import { config } from 'dotenv';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
config({path:'.env'});
const id=process.env.TOURNAMENT_VERIFY_ID, base=process.env.TOURNAMENT_VERIFY_BASE || 'http://localhost:3001';
if(!id || !/^[0-9a-f-]{36}$/.test(id)) throw new Error('Set TOURNAMENT_VERIFY_ID to a real, completed tournament UUID. No tournament is seeded.');
async function read(path) { const response=await fetch(base+'/api'+path,{signal:AbortSignal.timeout(15000)}); assert.equal(response.status,200,'Real API request must succeed');return response.json(); }
const tournament=await read('/tournaments/'+id);
assert.equal(tournament.status,'completed');assert.ok(tournament.championId);assert.equal(tournament.entries.length,tournament.capacity);
const resolved=tournament.matches.filter(m=>m.winnerEntry);
assert.equal(resolved.length,tournament.capacity-1);
const matches=[];
for(const match of tournament.matches) {
  const [room,audit]=await Promise.all([read('/rooms/'+match.roomId),read('/rooms/'+match.roomId+'/audit')]);
  assert.equal(room.status,'closed');assert.equal(audit.valid,true);assert.ok(audit.checked>0);
  if(match.winnerEntry && !match.recovery?.outcome?.startsWith('forfeit:')) {
    assert.equal(room.judgement?.status,'completed');assert.equal(room.judgement.passes.length,2);assert.ok(room.verdict?.winner);
    assert.equal(match.winnerEntry,room.verdict.winner==='FOR'?match.forEntry:match.againstEntry);
    assert.equal(room.votingRule,'verified-account-v1');
    const successful=audit.events.filter(e=>e.type==='judge.proxy_response' && e.payload?.observation?.status===200);
    assert.ok(successful.length>=2,'Played matches need two real successful proxy observations');
    assert.ok(room.transcript.some(t=>t.side==='FOR' && t.status==='completed'));assert.ok(room.transcript.some(t=>t.side==='AGAINST' && t.status==='completed'));
  }
  matches.push({matchId:match.id,roomId:room.id,turns:room.transcript.length,outcome:match.recovery?.outcome || 'played',auditChecked:audit.checked,judgeStatus:room.judgement?.status || null});
}
const final=resolved.reduce((a,b)=>a.round>b.round?a:b);assert.equal(final.winnerEntry,tournament.championId);
for(const match of resolved.filter(m=>m.round>0)) {
  const previous=resolved.filter(m=>m.round===match.round-1 && [match.position*2,match.position*2+1].includes(m.position)).map(m=>m.winnerEntry);
  assert.deepEqual(new Set([match.forEntry,match.againstEntry]),new Set(previous));
}
assert.ok(matches.some(m=>m.outcome==='played' && m.judgeStatus==='completed'),'At least one match must complete real judging; an all-forfeit bracket does not verify live judging');
const proof={passed:true,checkedAt:new Date().toISOString(),tournamentId:id,championId:tournament.championId,matches,latchSignedReceipt:false,sybilResistanceProven:false};
await mkdir('data/qa',{recursive:true});await writeFile('data/qa/tournament-'+id+'.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));