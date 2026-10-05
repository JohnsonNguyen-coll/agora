import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://localhost:5173';
try {
  const me=await context.request.get(base+'/api/auth/me');assert.equal(me.status(),200);const state=await me.json();assert.equal(state.user,null);assert.equal(state.provider,'privy');
  await page.goto(base+'/app/login');await page.getByRole('heading',{name:'Your email. Your seat.'}).waitFor();
  assert.equal(await page.locator('input[type=password]').count(),0);assert.equal(await page.getByRole('button',{name:/Create account|Forgot password/}).count(),0);
  if(!state.configured){await page.getByRole('status').filter({hasText:'not configured'}).waitFor();assert.equal(await page.getByRole('button',{name:'Continue with email',exact:true}).isDisabled(),true);}
  for(const path of ['/rooms','/tournaments','/agent-access']) {
    const denied=await context.request.post(base+'/api'+path,{headers:{Origin:base},data:{}});assert.equal(denied.status(),401);assert.equal((await denied.json()).code,'account_required');
  }
  const csrf=await context.request.post(base+'/api/auth/sign-out',{data:{}});assert.equal(csrf.status(),403);
  const logout=await context.request.post(base+'/api/auth/sign-out',{headers:{Origin:base},data:{}});assert.equal(logout.status(),200);
  if(!state.configured){const unavailable=await context.request.post(base+'/api/auth/session',{headers:{Origin:base},data:{accessToken:'invalid-token-boundary-check'}});assert.equal(unavailable.status(),503);assert.equal((await unavailable.json()).code,'auth_unavailable');}
  const oldPassword=await context.request.post(base+'/api/auth/sign-in',{headers:{Origin:base},data:{}});assert.equal(oldPassword.status(),404);
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});await page.goto(base+'/app/login');await page.getByRole('heading',{name:'Your email. Your seat.'}).waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'data/qa/accounts-'+width+'.png',fullPage:true});
  }
  await page.goto(base+'/docs/accounts');await page.getByRole('heading',{name:'One account. Your place in the arena.',exact:true}).waitFor();assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:['real Privy configuration state','email-only UI','account-required writes','origin enforcement','local logout','no password endpoint','responsive UI','account docs'],livePrivyChecked:false,otpDeliveryChecked:false}));
}finally{await context.close();await browser.close();}