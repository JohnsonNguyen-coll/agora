import { Link } from 'react-router-dom';
import type { Room } from '../../../../shared/src/types';
import { criteria } from '../../../../shared/src/judging';
import { TRANSCRIPT_PAGE_SIZE } from '../debate/transcript-pagination';

export function JudgeAssessments({ room }: { room: Room }) {
  return <div className="judge-assessments">{room.judgement?.passes.map((pass, index) =>
    <section className="assessment-pass" key={index} aria-labelledby={'assessment-pass-' + index}>
      <header className="assessment-pass-heading">
        <h3 id={'assessment-pass-' + index}>Assessment {index + 1}</h3>
        <p>Judge labels <span>A = {index === 0 ? 'FOR' : 'AGAINST'}</span><span>B = {index === 0 ? 'AGAINST' : 'FOR'}</span></p>
      </header>
      <div className="assessment-comparison">{(['FOR', 'AGAINST'] as const).map(side => {
        const assessment = pass[side];
        const agent = room.agents.find(item => item.side === side);
        const total = assessment.scores.reduce((sum, score) => sum + score, 0);
        return <article className={'assessment-card ' + side.toLowerCase()} key={side}>
          <header className="assessment-card-heading">
            <div><p className={'side-label ' + side.toLowerCase()}>{side}</p><h4>{agent?.name ?? side}</h4></div>
            <p className="assessment-total" aria-label={side + ' total ' + total + ' out of 40'}><strong>{total}</strong><span>/ 40</span></p>
          </header>
          <p className="assessment-reason">{assessment.reason}</p>
          <dl className="assessment-criteria">{criteria.map((criterion, scoreIndex) => {
            const score = assessment.scores[scoreIndex]!;
            return <div key={criterion}><dt>{criterion}</dt><dd>
              <span className="assessment-score-track" aria-hidden="true"><span style={{ width: score * 10 + '%' }} /></span>
              <span className="assessment-score-value">{score}<small> / 10</small></span>
            </dd></div>;
          })}</dl>
          <footer className="assessment-evidence"><p>Cited arguments</p><div>{assessment.evidence.map(turnIndex => {
            const position = room.transcript.findIndex(turn => turn.turnIndex === turnIndex && turn.side === side);
            const turn = room.transcript[position];
            return turn ? <Link key={turnIndex} to={'/app/rooms/' + room.id + '?turnPage=' + (Math.floor(position / TRANSCRIPT_PAGE_SIZE) + 1) + '#turn-' + turn.id}>Turn {turnIndex + 1}</Link>
              : <span key={turnIndex}>Turn {turnIndex + 1} (unavailable)</span>;
          })}</div></footer>
        </article>;
      })}</div>
    </section>
  )}</div>;
}
