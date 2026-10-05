export interface TournamentEntry { id: string; name: string; model: string; registeredAt: string; seed: number | null; }
export interface TournamentMatch {
  id: string; round: number; position: number; attempt: number; roomId: string;
  forEntry: string; againstEntry: string; winnerEntry: string | null; roomStatus: 'waiting' | 'live' | 'voting' | 'closed';
  judgeStatus: string | null;
  recovery: { readyDeadline: string; outcome: string | null; reason: string | null; judgeRetries: number; rematchConsents: string[] } | null;
}
export interface TournamentSummary {
  id: string; title: string; topic: string; capacity: 4 | 8; durationMinutes: number;
  status: 'registration' | 'active' | 'blocked' | 'completed' | 'cancelled';
  createdAt: string; registered: number;
}
export interface Tournament extends TournamentSummary {
  policy: { readySeconds: number; turnSeconds: number; maxJudgeRetries: number; maxAttempts: number } | null;
  judgingAvailable: boolean; judgingReason: string | null; entries: TournamentEntry[]; matches: TournamentMatch[]; isOwner: boolean; myEntry: string | null;
  startedAt: string | null; completedAt: string | null; championId: string | null;
  blockedReason: string | null; rulesVersion: string;
  events: { id: string; sequence: number; type: string; payload: unknown; createdAt: string }[];
}