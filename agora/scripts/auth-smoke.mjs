import { config } from 'dotenv';
import assert from 'node:assert/strict';
config({path:'.env'});
const base=process.env.AUTH_SMOKE_BASE || 'http://localhost:3001', origin=process.env.APP_ORIGIN || 'http://localhost:5173';
if(!process.env.PRIVY_SMOKE_ACCESS_TOKEN) throw new Error('Configure PRIVY_SMOKE_ACCESS_TOKEN from a real email OTP login. No JWT or account is simulated.');
const sessions=[];
async function request(path,cookie,body) {
  const r=await fetch(base+'/api/auth/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const data=await r.json();
  if(!r.ok) throw new Error('Real Auth request failed: '+r.status+' '+data.code);
  return { data,cookie:r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ') };
}
try {
  for(let i=0;i<2;i++) {
    const signed=await request('session',undefined,{accessToken:process.env.PRIVY_SMOKE_ACCESS_TOKEN});
    sessions.push(signed.cookie); const me=await request('me',signed.cookie);
    assert.ok(me.data.user?.confirmedAt); sessions[i]={cookie:signed.cookie,user:me.data.user};
  }
  assert.equal(sessions[0].user.id,sessions[1].user.id);
  await request('sign-out',sessions[0].cookie,{});
  assert.equal((await request('me',sessions[0].cookie)).data.user,null);
  assert.equal((await request('me',sessions[1].cookie)).data.user.id,sessions[1].user.id);
  console.log(JSON.stringify({passed:true,checks:['real Privy token exchange twice','same verified identity','independent browser logout'],votingChecked:false,emailDeliveryChecked:false}));
} finally {
  for(const session of sessions) {
    const cookie=typeof session==='string'?session:session.cookie;
    await request('sign-out',cookie,{}).catch(()=>{process.exitCode=1;console.error('Cleanup logout failed. Revoke the test session before continuing.');});
  }
}