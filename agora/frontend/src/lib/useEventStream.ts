import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
export function useEventStream(id: string) {
  const client = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!id) return;
    const stream = new EventSource('/api/rooms/' + id + '/stream');
    let refresh: ReturnType<typeof setTimeout> | undefined;
    stream.onopen = () => setConnected(true);
    stream.onerror = () => setConnected(false);
    stream.addEventListener('room.update', () => {
      if (refresh) return;
      refresh = setTimeout(() => {
        void client.invalidateQueries({ queryKey: ['room', id] });
        void client.invalidateQueries({ queryKey: ['audit', id] });
        refresh = undefined;
      }, 100);
    });
    return () => { stream.close(); clearTimeout(refresh); setConnected(false); };
  }, [id, client]);
  return connected;
}
