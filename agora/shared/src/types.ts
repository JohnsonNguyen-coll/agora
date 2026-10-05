import type { Judgement, finalVerdict } from './judging.js';
export type Side = 'FOR' | 'AGAINST';
export type RoomStatus = 'waiting' | 'live' | 'voting' | 'closed';
export interface Agent {
  id: string; side: Side; name: string; model: string; ready: boolean;
  latchId: string | null; status: 'active' | 'failed';
}
export interface RoomSummary {
  id: string; mode: 'latch' | 'external'; topic: string; durationMinutes: number; status: RoomStatus;
  createdAt: string; startsAt: string | null; endsAt: string | null;
  agents: Agent[]; turns: number;
}
export interface Turn {
  id: string; roomId: string; side: Side; turnIndex: number; content: string;
  tokensUsed: number | null; startedAt: string; completedAt: string | null;
  status: 'streaming' | 'completed' | 'interrupted' | 'failed';
}
export interface Room extends RoomSummary {
  tournamentControl: { paused: boolean; readyDeadline: string; turnDeadline: string | null; nextSide: Side | null; outcome: string | null; reason: string | null } | null;
  votingRule: 'verified-account-v1' | 'legacy-session';
  nextTurnIndex: number; nextSide: Side | null; transcript: Turn[]; mySide: Side | null; myVote: Side | null;
  tournament: { id: string; title: string; round: number; attempt: number; isEntrant: boolean } | null; verdict: ReturnType<typeof finalVerdict>; judgement: Judgement | null; votes: Record<Side, number>; votingEndsAt: string | null; endReason: string | null;
}
export interface AuditEvent {
  id: string; roomId: string; sequence: number; type: string; payload: unknown;
  prevHash: string | null; hash: string; createdAt: string; source: 'gavel';
}
export interface AuditResult { events: AuditEvent[]; valid: boolean; checked: number; }
export interface ParticipantInput { name: string; model: string; strategy: string; latchToken: string; }
export interface CreateRoomInput extends ParticipantInput { topic: string; durationMinutes: number; side: Side; }
export interface ApiError { error: string; code: string; details?: unknown; }
export interface RuntimeStatus { debateAvailable: boolean; reason: string | null; }
