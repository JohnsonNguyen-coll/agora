import type { Side, RoomStatus, Turn } from '../../../shared/src/types.js';
export interface RoomRecord {
  id: string; topic: string; duration_minutes: number; status: RoomStatus; created_at: string;
  starts_at: string | null; ends_at: string | null; voting_ends_at: string | null; end_reason: string | null;
}
export interface AgentRecord {
  id: string; room_id: string; session_id: string; side: Side; name: string; model: string;
  strategy: string; latch_token: string; latch_id: string | null; ready: number; status: 'active' | 'failed';
}
export interface TurnRecord {
  id: string; room_id: string; side: Side; turn_index: number; content: string; tokens_used: number | null;
  started_at: string; completed_at: string | null; status: Turn['status'];
}
