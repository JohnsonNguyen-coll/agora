import { createContext, lazy, Suspense, useContext, type PropsWithChildren } from 'react';
export interface AuthControls { configured: boolean; ready: boolean; authenticated: boolean; syncing: boolean; error: Error | null; login: () => void; logout: () => Promise<void>; sync: () => Promise<void>; }
const unavailable=()=>{throw new Error('Privy login is not configured.');};
export const AuthContext=createContext<AuthControls>({configured:false,ready:false,authenticated:false,syncing:false,error:null,login:unavailable,logout:async()=>unavailable(),sync:async()=>unavailable()});
export const useAuthControls=()=>useContext(AuthContext);
const PrivyAuthProvider=lazy(()=>import('./PrivyAuthProvider'));
export function AuthBoundary({children}:PropsWithChildren) {
  if(!import.meta.env.VITE_PRIVY_APP_ID)return <>{children}</>;
  return <Suspense fallback={<div className="page loading-state" role="status">Loading secure sign-in…</div>}><PrivyAuthProvider>{children}</PrivyAuthProvider></Suspense>;
}