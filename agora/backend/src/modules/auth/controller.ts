import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authConfigured, establish, logout } from './service.js';
export function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/me',async req=>({configured:authConfigured(),appId:env.PRIVY_APP_ID||null,provider:'privy',user:req.account}));
  app.post('/api/auth/session',{config:{rateLimit:{max:30,timeWindow:'1 minute'}}},async(req,reply)=>{
    const input=z.object({accessToken:z.string().min(20).max(8000)}).strict().parse(req.body);
    const existing=req.cookies.agora_auth?req.unsignCookie(req.cookies.agora_auth):null;
    const session=await establish(input.accessToken,existing?.valid?existing.value??undefined:undefined);
    reply.setCookie('agora_auth',session.token,{httpOnly:true,signed:true,sameSite:'lax',secure:env.NODE_ENV==='production',path:'/',maxAge:Math.max(1,Math.floor((Date.parse(session.expiresAt)-Date.now())/1000))});
    return {user:session.user,expiresAt:session.expiresAt};
  });
  app.post('/api/auth/sign-out',async(req,reply)=>{
    z.object({}).strict().parse(req.body);
    const signed=req.cookies.agora_auth?req.unsignCookie(req.cookies.agora_auth):null;
    await logout(signed?.valid?signed.value??undefined:undefined);
    reply.clearCookie('agora_auth',{path:'/'});return {signedOut:true};
  });
}