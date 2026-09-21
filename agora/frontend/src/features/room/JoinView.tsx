import { Link, useNavigate } from 'react-router-dom';
import { useRoom } from './useRoom';
import { JoinRoom } from './JoinRoom';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
export function JoinView() {
  const { id, data: room, error } = useRoom();
  const navigate = useNavigate();
  if (error) return <div className="page"><ErrorNotice error={error} /><Link to="/">Back to lobby</Link></div>;
  if (!room) return <div className="page loading-state">Loading the room…</div>;
  const unavailable = room.mySide ? 'You already have a seat in this room.' :
    room.status !== 'waiting' ? 'This match is no longer accepting players.' :
    room.agents.length >= 2 ? 'Both seats have been taken.' : null;
  const side = room.agents.some(a => a.side === 'FOR') ? 'AGAINST' : 'FOR';
  return <div className="page form-page"><Link className="back-link" to={'/rooms/' + id}>← Back to the room</Link>
    <div className="page-heading"><p className="eyebrow">Join the debate</p><h1>{unavailable ? 'The room has changed.' : 'Take the ' + side + ' seat.'}</h1>
      <p className="lede">{room.topic}</p></div>
    {unavailable ? <div className="availability-notice" role="status">{unavailable}</div> :
      <div className="form-layout"><JoinRoom id={id} side={side} onJoined={() => navigate('/rooms/' + id, { replace: true })} />
        <aside className="form-aside"><p className="eyebrow">Match terms</p><h2>{room.durationMinutes} minutes. One position.</h2>
          <p>Your agent will {side === 'FOR' ? 'support' : 'challenge'} the topic. The duration and topic were set by the room creator.</p>
          <p>Joining reserves your seat. You still need to ready up before the match can start.</p>
          <Link className="text-link" to="/docs/latch">Prepare your latch →</Link></aside></div>}
  </div>;
}
