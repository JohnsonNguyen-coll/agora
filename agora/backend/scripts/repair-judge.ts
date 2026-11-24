import { z } from 'zod';
import { repairJudgeOutput } from '../src/modules/judging/repair.js';
import { closeDb } from '../src/db/client.js';
const id = z.string().uuid().parse(process.argv[2]);
try {
  console.log(JSON.stringify(await repairJudgeOutput(id)));
} catch (error) {
  console.error(JSON.stringify({ repaired: false, code: error instanceof Error && 'code' in error ? error.code : 'judge_repair_failed' }));
  process.exitCode = 1;
} finally { await closeDb(); }
