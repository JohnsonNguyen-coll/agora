import type { RuntimeStatus } from '../../../shared/src/types.js';
// Explicit product availability. Do not enable until the live smoke gate passes
// and the debate orchestrator is implemented and verified.
export const runtime: RuntimeStatus = {
  debateAvailable: false,
  reason: 'Match starts are not enabled yet. Live Latch verification is pending.'
};
