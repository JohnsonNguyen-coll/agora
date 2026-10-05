import { PrivyClient, InvalidAuthTokenError, APIError, type User } from '@privy-io/node';
import { createHash, randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { query } from '../../db/client.js';
import { env } from '../../config/env.js';
import { seal, unseal } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
export const authConfigured = () => Boolean(env.PRIVY_APP_ID && env.PRIVY_APP_SECRET);
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
let client: PrivyClient | null = null;
export function provider() {
  if (!authConfigured()) throw new AppError(503,'auth_unavailable','Account access is not configured. The operator must connect Privy.');
  return client ??= new PrivyClient({ appId: env.PRIVY_APP_ID!, appSecret: env.PRIVY_APP_SECRET!, timeout: 10000, maxRetries: 0 });
}
export function publicUser(user: User) {
  const email=user.linked_accounts.find(a=>a.type==='email' && Number.isFinite(a.verified_at) && a.verified_at>0);
  if(user.is_guest || !email || email.type!=='email') throw new AppError(403,'email_unverified','Sign in using a verified email OTP account.');
  return { id:user.id,email:email.address,createdAt:new Date(user.created_at*1000).toISOString(),confirmedAt:new Date(email.verified_at*1000).toISOString() };
}
async function verify(accessToken: string) {
  try {
    const api=provider(),claims=await api.utils().auth().verifyAccessToken(accessToken);
    const user=await api.users()._get(claims.user_id);
    if(user.id!==claims.user_id) throw new AppError(401,'invalid_auth_session','Sign in again.');
    const account=publicUser(user);
    await query(sql`INSERT INTO accounts (id,email,created_at,confirmed_at) VALUES (${account.id},${account.email},${account.createdAt},${account.confirmedAt})
      ON CONFLICT(id) DO UPDATE SET email=excluded.email,confirmed_at=excluded.confirmed_at`);
    return {user,expiresAt:new Date(claims.expiration*1000).toISOString()};
  } catch(error) {
    if(error instanceof AppError) throw error;
    if(error instanceof InvalidAuthTokenError || (error instanceof APIError && error.status===404))
      throw new AppError(401,'invalid_auth_session','Your Privy session is invalid or expired. Sign in again.');
    throw new AppError(503,'auth_provider_unavailable','Privy verification is temporarily unavailable. Try again.');
  }
}
export async function establish(accessToken: string, existingToken?: string) {
  const verified=await verify(accessToken);
  const existing=existingToken && /^[a-f0-9]{64}$/.test(existingToken) ? (await query<{user_id:string}>(sql`SELECT user_id FROM privy_sessions WHERE token_hash=${hash(existingToken)}`))[0] : null;
  const token=existing?.user_id===verified.user.id ? existingToken! : randomBytes(32).toString('hex');
  if(existingToken && token!==existingToken) await logout(existingToken);
  await query(sql`INSERT INTO privy_sessions (token_hash,user_id,access_token,expires_at) VALUES (${hash(token)},${verified.user.id},${seal(accessToken)},${verified.expiresAt})
    ON CONFLICT(token_hash) DO UPDATE SET access_token=excluded.access_token,expires_at=excluded.expires_at`);
  return {token,user:publicUser(verified.user),expiresAt:verified.expiresAt};
}
const inflight=new Map<string,Promise<User|null>>();
export async function resolveAccount(token: string): Promise<User|null> {
  if(!/^[a-f0-9]{64}$/.test(token)) return null;
  const key=hash(token),running=inflight.get(key);if(running)return running;
  const task=resolve(key);inflight.set(key,task);
  try{return await task;}finally{inflight.delete(key);}
}
async function resolve(key: string): Promise<User|null> {
  const row=(await query<{user_id:string;access_token:string;expires_at:string}>(sql`SELECT * FROM privy_sessions WHERE token_hash=${key}`))[0];
  if(!row)return null;
  if(Date.parse(row.expires_at)<=Date.now()){await query(sql`DELETE FROM privy_sessions WHERE token_hash=${key}`);return null;}
  try {
    const verified=await verify(unseal(row.access_token));
    if(verified.user.id!==row.user_id){await query(sql`DELETE FROM privy_sessions WHERE token_hash=${key}`);return null;}
    return verified.user;
  }catch(error){
    if(error instanceof AppError && error.statusCode===401){await query(sql`DELETE FROM privy_sessions WHERE token_hash=${key}`);return null;}
    throw error;
  }
}
export async function logout(token: string|undefined) {
  if(token)await query(sql`DELETE FROM privy_sessions WHERE token_hash=${hash(token)}`);
}
export async function requireAccount(identity: string) {
  const uid=identity.startsWith('account:did:privy:')?identity.slice(8):'';
  const account=uid?(await query<{id:string;created_at:string}>(sql`SELECT id,created_at FROM accounts WHERE id=${uid}`))[0]:null;
  if(!account)throw new AppError(401,'account_required','Sign in with a verified Agora account to continue. Replace legacy browser and agent access tokens.');
  return account;
}