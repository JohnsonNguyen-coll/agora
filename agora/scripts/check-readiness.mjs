import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
config({ path: '.env' });
const present=name=>Boolean(process.env[name]?.trim());
const fields=['PRIVY_APP_ID','PRIVY_APP_SECRET','VITE_PRIVY_APP_ID','LATCH_SMOKE_TOKEN','LATCH_MODEL','JUDGE_LATCH_TOKEN','JUDGE_MODEL'];
const configured=Object.fromEntries(fields.map(name=>[name,present(name)]));
let judgeStreamingVerified=false;
try {
  const proof=JSON.parse(await readFile('data/judge-smoke.json','utf8'));
  const fingerprint=createHash('sha256').update(JSON.stringify([process.env.JUDGE_LATCH_TOKEN,process.env.JUDGE_MODEL,process.env.LATCH_PROXY_BASE || 'https://onlatch.com/proxy'])).digest('hex');
  judgeStreamingVerified=proof.passed===true && proof.fingerprint===fingerprint;
} catch { /* Missing live proof is not success. */ }
const appIdsMatch=present('PRIVY_APP_ID') && process.env.PRIVY_APP_ID===process.env.VITE_PRIVY_APP_ID;
const databaseConfigured=Boolean(process.env.DATABASE_URL?.startsWith('postgres'));
console.log(JSON.stringify({configured,supabaseDatabaseConfigured:databaseConfigured,judgeStreamingVerified,appIdsMatch,liveReady:appIdsMatch&&Object.values(configured).every(Boolean)&&databaseConfigured&&judgeStreamingVerified},null,2));
if(!appIdsMatch||!Object.values(configured).every(Boolean)||!databaseConfigured||!judgeStreamingVerified) process.exitCode=1;