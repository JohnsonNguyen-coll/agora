import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthBoundary';
import type { Account } from './useAccount';
import { api } from '../../lib/api';
const appId=import.meta.env.VITE_PRIVY_APP_ID as string;
function Bridge({children}:PropsWithChildren) {
  const {ready,authenticated,user,getAccessToken,login,logout:privyLogout}=usePrivy(),client=useQueryClient();
  const [syncing,setSyncing]=useState(false),[error,setError]=useState<Error|null>(null);
  const clearing=useRef<Promise<void>|null>(null);
  const pending=useRef<Promise<void>|null>(null),generation=useRef(0);
  const sync=useCallback(async()=>{
    if(pending.current)return pending.current;
    const current=generation.current;
    const task=(async()=>{
      setSyncing(true);setError(null);
      try {
        await clearing.current;
        if(current!==generation.current)return;
        const accessToken=await getAccessToken();if(!accessToken)throw new Error('Privy could not refresh your session. Sign in again.');
        const session=await api<{user:Account}>('/auth/session',{accessToken});
        if(current!==generation.current)return;
        client.setQueryData(['account'],{configured:true,provider:'privy',appId,user:session.user});
        await client.invalidateQueries({predicate:q=>q.queryKey[0]!=='account'});
      }catch(cause){if(current===generation.current)setError(cause instanceof Error?cause:new Error('Unable to verify your Privy session.'));}
      finally{if(current===generation.current)setSyncing(false);}
    })();pending.current=task;try{await task;}finally{if(pending.current===task)pending.current=null;}
  },[client,getAccessToken]);
  const logout=useCallback(async()=>{
    generation.current++;setSyncing(true);setError(null);
    // Wait for a pending exchange before revoking its cookie, so it cannot sign us back in.
    try {
      await clearing.current;await pending.current;await api('/auth/sign-out',{});await privyLogout();
      client.setQueryData(['account'],{configured:true,provider:'privy',appId,user:null});
      await client.resetQueries({predicate:q=>q.queryKey[0]!=='account'});
    }catch(cause){setError(cause instanceof Error?cause:new Error('Sign out could not be completed.'));}
    finally{setSyncing(false);}
  },[client,privyLogout]);
  useEffect(()=>{
    if(!ready)return;
    if(!authenticated){
      const current=++generation.current;
      const task=(async()=>{await pending.current;await api('/auth/sign-out',{});if(current!==generation.current)return;setSyncing(false);setError(null);client.setQueryData(['account'],{configured:true,provider:'privy',appId,user:null});await client.resetQueries({predicate:q=>q.queryKey[0]!=='account'});})().catch(cause=>setError(cause instanceof Error?cause:new Error('Unable to clear the previous session.')));
      clearing.current=task;void task.finally(()=>{if(clearing.current===task)clearing.current=null;});
      return;
    }
    generation.current++;
    void (async()=>{await pending.current;await sync();})();const timer=window.setInterval(()=>void sync(),60000);
    const focus=()=>{if(document.visibilityState==='visible')void sync();};document.addEventListener('visibilitychange',focus);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',focus);};
  },[ready,authenticated,user?.id,sync,client]);
  return <AuthContext.Provider value={{configured:true,ready,authenticated,syncing,error,login:()=>login({loginMethods:['email']}),logout,sync}}>{children}</AuthContext.Provider>;
}
export default function PrivyAuthProvider({children}:PropsWithChildren) {
  return <PrivyProvider appId={appId} config={{loginMethods:['email'],appearance:{theme:'light',accentColor:'#a84d30'},embeddedWallets:{ethereum:{createOnLogin:'off'},solana:{createOnLogin:'off'}}}}><Bridge>{children}</Bridge></PrivyProvider>;
}