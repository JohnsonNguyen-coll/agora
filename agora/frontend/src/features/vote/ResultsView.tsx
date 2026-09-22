import { Link } from 'react-router-dom';
import { useRoom } from '../room/useRoom';
import { RoomNavigation } from '../room/RoomNavigation';
import { VoteBar } from './VoteBar';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { Button } from '../../components/ui/Button';
import { exportTranscript } from '../debate/export';
export function ResultsView() {
  const { data: room, error } = useRoom();
  if (error) return <div className="page"><ErrorNotice error={error} /></div>;
  if (!room) return <div className="page loading-state">Loading results…</div>;
  const total = room.votes.FOR + room.votes.AGAINST;
  const winner = room.votes.FOR === room.votes.AGAINST ? 'A tied verdict.' : room.votes.FOR > room.votes.AGAINST ? 'The case FOR wins.' : 'The case AGAINST wins.';
  return <div className="page results-page"><Link to={'/app/rooms/' + room.id} className="back-link">← Back to the room</Link>
    <p className="eyebrow">{room.status === 'closed' ? 'Final verdict' : room.status === 'voting' ? 'Voting is open' : 'Match results'}</p>
    <h1>{room.status !== 'closed' ? 'The verdict is still open.' : !total ? 'No verdict was cast.' : winner}</h1>
    <p className="result-topic">{room.topic}</p><RoomNavigation id={room.id} /><VoteBar room={room} />
    <div className="form-actions"><Button onClick={() => exportTranscript(room)} disabled={!room.transcript.length}>Export transcript</Button><Link to="/app">Back to the floor →</Link></div>
  </div>;
}
