import { useEffect, useState } from 'react';
export function RoomClock({ end, minutes, live, voting = false }: { end: string | null; minutes: number; live: boolean; voting?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = end ? Math.max(0, Math.ceil((Date.parse(end) - now) / 1000)) : minutes * 60;
  const progress = end ? Math.max(0, Math.min(100, seconds / (minutes * 60) * 100)) : 100;
  return <div className={'room-clock' + (live && seconds <= 30 ? ' clock-urgent' : '')}><span className="eyebrow">{voting ? 'Voting closes in' : live ? 'Time remaining' : end ? 'Match ended' : 'Match length'}</span>
    <span className="clock-value">{String(Math.floor(seconds / 60)).padStart(2, '0')}<span>:</span>{String(seconds % 60).padStart(2, '0')}</span>
    <div className="clock-track" aria-hidden="true"><span style={{ width: progress + '%' }} /></div>
    <span className="clock-caption">{voting ? 'Make your choice below' : live && seconds === 0 ? 'Awaiting match update' : minutes + '-minute debate'}</span></div>;
}
