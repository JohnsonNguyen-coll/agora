import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(), topic: text('topic').notNull(), durationMinutes: integer('duration_minutes').notNull(),
  status: text('status').notNull().default('waiting'), createdAt: text('created_at').notNull(),
  startsAt: text('starts_at'), endsAt: text('ends_at'), votingEndsAt: text('voting_ends_at'), endReason: text('end_reason')
});
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(), roomId: text('room_id').notNull().references(() => rooms.id),
  sessionId: text('session_id').notNull(), side: text('side').notNull(), name: text('name').notNull(),
  model: text('model').notNull(), strategy: text('strategy').notNull(), latchToken: text('latch_token').notNull(),
  latchId: text('latch_id'), ready: integer('ready').notNull().default(0), status: text('status').notNull().default('active')
}, t => [uniqueIndex('agents_side').on(t.roomId, t.side), uniqueIndex('agents_session').on(t.roomId, t.sessionId)]);
export const turns = sqliteTable('turns', {
  id: text('id').primaryKey(), roomId: text('room_id').notNull().references(() => rooms.id), side: text('side').notNull(),
  turnIndex: integer('turn_index').notNull(), content: text('content').notNull(), tokensUsed: integer('tokens_used'),
  startedAt: text('started_at').notNull(), completedAt: text('completed_at'), status: text('status').notNull()
});
export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(), roomId: text('room_id').notNull().references(() => rooms.id),
  sessionId: text('session_id').notNull(), side: text('side').notNull(), createdAt: text('created_at').notNull()
}, t => [uniqueIndex('votes_session').on(t.roomId, t.sessionId)]);
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(), roomId: text('room_id').notNull().references(() => rooms.id),
  sequence: integer('sequence').notNull(), type: text('type').notNull(), payloadJson: text('payload_json').notNull(),
  prevHash: text('prev_hash'), hash: text('hash').notNull(), createdAt: text('created_at').notNull()
});
export const externalRooms = sqliteTable('external_rooms', {
  roomId: text('room_id').primaryKey().references(() => rooms.id)
});
export const externalAgents = sqliteTable('external_agents', {
  id: text('id').primaryKey(), roomId: text('room_id').notNull().references(() => externalRooms.roomId),
  sessionId: text('session_id').notNull(), side: text('side').notNull(), name: text('name').notNull(),
  model: text('model').notNull(), ready: integer('ready').notNull().default(0), status: text('status').notNull().default('active')
}, t => [uniqueIndex('external_agents_side').on(t.roomId, t.side), uniqueIndex('external_agents_session').on(t.roomId, t.sessionId)]);
export const agentAccess = sqliteTable('agent_access', {
  id: text('id').primaryKey(), sessionId: text('session_id').notNull(), name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(), createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(), revokedAt: text('revoked_at')
});
export const externalSubmissions = sqliteTable('external_submissions', {
  id: text('id').notNull(), roomId: text('room_id').notNull().references(() => externalRooms.roomId),
  agentId: text('agent_id').notNull().references(() => externalAgents.id), turnId: text('turn_id').notNull().references(() => turns.id)
}, t => [uniqueIndex('external_submission_identity').on(t.roomId, t.agentId, t.id)]);
