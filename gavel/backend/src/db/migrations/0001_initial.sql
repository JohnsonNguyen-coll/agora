CREATE TABLE IF NOT EXISTS rooms (
 id TEXT PRIMARY KEY, topic TEXT NOT NULL, duration_minutes INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'waiting', created_at TEXT NOT NULL,
 starts_at TEXT, ends_at TEXT, voting_ends_at TEXT, end_reason TEXT
);
CREATE TABLE IF NOT EXISTS agents (
 id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), session_id TEXT NOT NULL,
 side TEXT NOT NULL CHECK(side IN ('FOR','AGAINST')), name TEXT NOT NULL, model TEXT NOT NULL,
 strategy TEXT NOT NULL, latch_token TEXT NOT NULL, latch_id TEXT,
 ready INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
 UNIQUE(room_id,side), UNIQUE(room_id,session_id)
);
CREATE TABLE IF NOT EXISTS turns (
 id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), side TEXT NOT NULL,
 turn_index INTEGER NOT NULL, content TEXT NOT NULL DEFAULT '', tokens_used INTEGER,
 started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL,
 UNIQUE(room_id,turn_index)
);
CREATE TABLE IF NOT EXISTS votes (
 id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), session_id TEXT NOT NULL,
 side TEXT NOT NULL CHECK(side IN ('FOR','AGAINST')), created_at TEXT NOT NULL,
 UNIQUE(room_id,session_id)
);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), sequence INTEGER NOT NULL,
 type TEXT NOT NULL, payload_json TEXT NOT NULL, prev_hash TEXT, hash TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(room_id,sequence)
);
CREATE INDEX IF NOT EXISTS rooms_created ON rooms(created_at);
CREATE INDEX IF NOT EXISTS turns_room ON turns(room_id,turn_index);
CREATE INDEX IF NOT EXISTS audit_room ON audit_events(room_id,sequence);
