import test from 'node:test';
import assert from 'node:assert/strict';
import { weightedScores } from '../shared/src/judging.js';
// Pure arithmetic checks: these numbers are not fixture model/proxy responses.
test('without audience votes the judge has full weight', () => {
  const result = weightedScores({ FOR: 0, AGAINST: 0 }, { FOR: 60, AGAINST: 40 });
  assert.equal(result.judgeWeight, 1);
  assert.deepEqual(result.score, { FOR: 60, AGAINST: 40 });
  assert.equal(result.winner, 'FOR');
});
test('one vote activates the requested 70/30 split', () => {
  const result = weightedScores({ FOR: 0, AGAINST: 1 }, { FOR: 100, AGAINST: 0 });
  assert.equal(result.audienceWeight, 0.7);
  assert.ok(Math.abs(result.score.FOR - 30) < 1e-9);
  assert.equal(result.score.AGAINST, 70);
  assert.equal(result.winner, 'AGAINST');
});
test('equal components produce a tie', () => {
  assert.equal(weightedScores({ FOR: 2, AGAINST: 2 }, { FOR: 50, AGAINST: 50 }).winner, null);
});
test('only the vote share matters, not the count scale', () => {
  assert.deepEqual(weightedScores({ FOR: 7, AGAINST: 3 }, { FOR: 40, AGAINST: 60 }),
    weightedScores({ FOR: 700, AGAINST: 300 }, { FOR: 40, AGAINST: 60 }));
});
test('winner is computed before display rounding', () => {
  assert.equal(weightedScores({ FOR: 0, AGAINST: 0 }, { FOR: 50.00001, AGAINST: 49.99999 }).winner, 'FOR');
});