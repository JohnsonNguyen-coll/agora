import { Link } from 'react-router-dom';
import { useRoom } from '../room/useRoom';
import { RoomNavigation } from '../room/RoomNavigation';
import { VoteBar } from './VoteBar';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { Button } from '../../components/ui/Button';
import { exportTranscript } from '../debate/export';
import { criteria, judgeShares } from '../../../../shared/src/judging';
export function ResultsView() {
  const { data: room, error } = useRoom();
  if (error) return <div className="page"><ErrorNotice error={error} /></div>;
  if (!room) return <div className="page loading-state">Loading results…</div>;
  const total = room.votes.FOR + room.votes.AGAINST, closed = room.status === 'closed';
  const verdict = closed ? room.verdict : null;
  const judge = room.judgement, shares = judge ? judgeShares(judge.passes) : null;
  const title = !closed ? 'The verdict is still open.' : verdict ? verdict.winner ? `The case ${verdict.winner} wins.` : 'A tied verdict.' : !room.judgement || ['failed','needs_review','insufficient','unavailable'].includes(room.judgement.status) ? 'No final verdict is available.' : 'The final verdict is pending.';
  const audience = !total ? 'No audience votes were cast.' : room.votes.FOR === room.votes.AGAINST ? 'The audience vote is tied.' : `Audience choice: ${room.votes.FOR > room.votes.AGAINST ? 'FOR' : 'AGAINST'}.`;
  return <div className="page results-page"><Link to={'/app/rooms/' + room.id} className="back-link">← Arena</Link>
    <p className="eyebrow">{verdict ? 'Final verdict' : room.status === 'voting' ? 'Voting is open' : 'Match results'}</p>
    <h1>{title}</h1><p className="result-topic">{room.topic}</p><RoomNavigation id={room.id} />
    <section className="judge-panel" aria-labelledby="judge-heading"><div className="vote-heading"><div><p className="eyebrow">Transparent scoring</p>
      <h2 id="judge-heading">{verdict ? 'The combined result' : 'How this match is decided'}</h2></div><Link to="/docs/voting">Scoring rules ↗</Link></div>
      <p>{verdict ? `${Math.round(verdict.audienceWeight * 100)}% audience · ${Math.round(verdict.judgeWeight * 100)}% judge` : 'With audience votes: 70% audience + 30% judge. With no votes: 100% judge.'}</p>
      {verdict && <div className="verdict-scores">{(['FOR','AGAINST'] as const).map(side => <div key={side}><span className="eyebrow">{side}</span><strong>{verdict.score[side].toFixed(2)}<small> / 100</small></strong>
        <p>Audience {total ? (room.votes[side] / total * 100).toFixed(2) + '%' : '—'} · Judge {shares?.[side].toFixed(2)}%</p></div>)}</div>}
      <p className="field-hint">{total} {total === 1 ? 'recorded vote' : 'recorded votes'}. Even one vote activates the 70% audience weight. Session votes do not verify unique people. The winner is computed before rounding.</p>
    </section>
    <section className="judge-panel" aria-labelledby="assessment-heading"><p className="eyebrow">AI assessment</p><h2 id="assessment-heading">Judge’s verdict</h2>
      <p>{judge?.status === 'completed' && shares ? shares.FOR === shares.AGAINST ? 'The judge assessment is tied.' : `The judge favors ${shares.FOR > shares.AGAINST ? 'FOR' : 'AGAINST'}.` :
        judge?.status === 'needs_review' ? 'Assessment requires review.' : judge?.status === 'failed' ? 'Judging could not be completed.' : judge?.status === 'insufficient' ? 'Not enough completed arguments.' :
        judge?.status === 'running' ? 'The judge is assessing the transcript…' : judge?.status === 'unavailable' ? 'Live judging is not available yet.' : 'Judging begins after voting closes.'}</p>
      {!judge && <p className="field-hint">This match has no recorded AI assessment. No combined winner can be declared.</p>}
      {judge?.error && <div className="judge-error" role="status"><span className="mono">{judge.error.code}</span><pre>{judge.error.message}</pre></div>}
      {judge && <p className="field-hint">Rubric: {judge.rubric} · Model: {judge.model ?? 'Not configured'} · Completed assessments: {judge.passes.length}/2</p>}
      {judge?.passes.length === 2 && <div className="judge-table-wrap"><table className="judge-table"><caption>Average rubric scores across both assessments (0–10)</caption><thead><tr><th>Criterion</th><th>FOR</th><th>AGAINST</th></tr></thead>
        <tbody>{criteria.map((criterion, i) => <tr key={criterion}><th>{criterion}</th>{(['FOR','AGAINST'] as const).map(side => <td key={side}>{((judge.passes[0]![side].scores[i]! + judge.passes[1]![side].scores[i]!) / 2).toFixed(1)}</td>)}</tr>)}</tbody></table></div>}
      {judge?.passes.map((pass, i) => <details className="judge-assessment" key={i}><summary>Assessment {i + 1} · {i === 0 ? 'FOR labeled A' : 'AGAINST labeled A'}</summary>
        {(['FOR','AGAINST'] as const).map(side => <div key={side}><h3>{side}</h3><p>{pass[side].reason}</p><p className="field-hint">Scores: {pass[side].scores.join(' / ')} · Transcript turns: {pass[side].evidence.map(n => n + 1).join(', ')}</p></div>)}</details>)}
      <p className="field-hint">Agent identities, model names, strategies and votes are excluded from the judge input. Two assessments reverse the labels. AI judging can still be biased and does not independently verify sources.</p>
    </section>
    {closed && <p>{audience}</p>}<VoteBar room={room} />
    <div className="form-actions"><Button onClick={() => exportTranscript(room)} disabled={!room.transcript.length}>Export transcript</Button></div>
  </div>;
}