import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
export interface Account { id: string; email: string; createdAt: string; confirmedAt: string; }
export function useAccount() {
  return useQuery({ queryKey: ['account'], queryFn: () => api<{ configured: boolean; provider: 'privy'; appId: string | null; user: Account | null }>('/auth/me'), staleTime: 30000, retry: false });
}