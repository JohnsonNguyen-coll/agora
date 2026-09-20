import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Room, RuntimeStatus } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { useEventStream } from '../../lib/useEventStream';
export function useRoom() {
  const { id = '' } = useParams();
  const room = useQuery({ queryKey: ['room', id], queryFn: () => api<Room>('/rooms/' + id), refetchInterval: 5000 });
  const runtime = useQuery({ queryKey: ['runtime'], queryFn: () => api<RuntimeStatus>('/runtime'), refetchInterval: 15000 });
  const connected = useEventStream(id);
  return { id, ...room, runtime: runtime.data, connected };
}
