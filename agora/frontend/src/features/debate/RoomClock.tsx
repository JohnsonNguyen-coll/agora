import { useEffect, useState } from 'react';
export function RoomClock({ end, minutes, live }: { end: string | null; minutes: number; live: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  const seconds = end ? Math.max(0, Math.ceil((Date.parse(end) - now) / 1000)) : minutes * 60;
  return <div className="room-clock"><span className="eyebrow">{live ? 'Time remaining' : end ? 'Time elapsed' : 'Match length'}</span>
    <span className="clock-value">{String(Math.floor(seconds / 60)).padStart(2, '0')}<span>:</span>{String(seconds % 60).padStart(2, '0')}</span></div>;
}
