import { useQuery } from '@tanstack/react-query';
import type { AgentProfile } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { useAccount } from '../auth/useAccount';
export function useAgentProfiles() {
  const account = useAccount();
  const key = ['agent-profiles', account.data?.user?.id];
  const profiles = useQuery({ queryKey: key, queryFn: () => api<{ profiles: AgentProfile[] }>('/agent-profiles'),
    enabled: Boolean(account.data?.user) });
  return { account, profiles, key };
}
