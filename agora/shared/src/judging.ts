import type { Side } from './types.js';
export const criteria = ['Reasoning', 'Evidence', 'Rebuttal', 'Relevance'] as const;
export interface JudgeAssessment { scores: [number, number, number, number]; evidence: number[]; reason: string; }
export interface JudgePass { FOR: JudgeAssessment; AGAINST: JudgeAssessment; }
export interface Judgement {
  status: 'queued' | 'running' | 'completed' | 'needs_review' | 'failed' | 'unavailable' | 'insufficient';
  rubric: string; model: string | null; passes: JudgePass[]; error: { code: string; message: string } | null;
  completedAt: string | null;
}
export function judgeShares(passes: JudgePass[]): Record<Side, number> | null {
  if (passes.length !== 2) return null;
  const totals = { FOR: 0, AGAINST: 0 };
  for (const pass of passes) for (const side of ['FOR', 'AGAINST'] as const) {
    if (pass[side].scores.length !== 4 || pass[side].scores.some(n => !Number.isInteger(n) || n < 0 || n > 10)) return null;
    totals[side] += pass[side].scores.reduce((a, b) => a + b, 0);
  }
  const sum = totals.FOR + totals.AGAINST;
  return sum ? { FOR: totals.FOR / sum * 100, AGAINST: totals.AGAINST / sum * 100 } : null;
}
export function disputed(passes: JudgePass[]) {
  const margins = passes.map(p => {
    const a = p.FOR.scores.reduce((x, y) => x + y, 0), b = p.AGAINST.scores.reduce((x, y) => x + y, 0);
    return a + b ? (a - b) / (a + b) * 100 : 0;
  });
  return margins.length === 2 && margins[0]! * margins[1]! < 0 && margins.every(m => Math.abs(m) > 10);
}
export function weightedScores(votes: Record<Side, number>, judge: Record<Side, number>) {
  const count = votes.FOR + votes.AGAINST, audienceWeight = count > 0 ? 0.7 : 0;
  const score = { FOR: judge.FOR * (1 - audienceWeight) + (count ? votes.FOR / count * 100 * audienceWeight : 0),
    AGAINST: judge.AGAINST * (1 - audienceWeight) + (count ? votes.AGAINST / count * 100 * audienceWeight : 0) };
  return { score, audienceWeight, judgeWeight: 1 - audienceWeight,
    winner: Math.abs(score.FOR - score.AGAINST) < 1e-9 ? null : score.FOR > score.AGAINST ? 'FOR' as const : 'AGAINST' as const };
}
export function finalVerdict(votes: Record<Side, number>, judgement: Judgement | null) {
  const judge = judgement?.status === 'completed' ? judgeShares(judgement.passes) : null;
  if (!judge) return null;
  return weightedScores(votes, judge);
}
