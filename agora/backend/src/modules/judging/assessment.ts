import { z } from 'zod';
import { env } from '../../config/env.js';
import { callModel } from '../latch/client.js';
import { LatchError, type CallOptions } from '../latch/types.js';
import type { TurnRecord } from '../../db/records.js';
import { judgeSystem, judgeInput, parseJudgePass } from './rubric.js';

export async function assess(topic: string, turns: TurnRecord[], reversed: boolean, options: CallOptions = {}) {
  const result = await callModel(env.JUDGE_LATCH_TOKEN!, {
    model: env.JUDGE_MODEL!, stream: true, max_tokens: 200, system: judgeSystem,
    messages: [{ role: 'user', content: judgeInput(topic, turns, reversed) }]
  }, () => {}, options);
  if (result.text.includes(env.JUDGE_LATCH_TOKEN!))
    throw new LatchError('credential_reflection', 'The model reflected a credential; output withheld.');
  if (result.stopReason === 'max_tokens')
    throw new LatchError('judge_output_truncated', 'The judge reached its output limit before completing the assessment.', result.observation);
  try {
    return { pass: parseJudgePass(result.text, turns, reversed), result };
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new LatchError('judge_invalid_json', 'The judge did not return a complete JSON assessment.', result.observation);
    if (error instanceof z.ZodError)
      throw new LatchError('judge_invalid_schema', 'The judge assessment did not match the required scoring structure.', result.observation);
    throw new LatchError('judge_invalid_evidence', 'The judge cited a turn that does not belong to the assessed side.', result.observation);
  }
}
