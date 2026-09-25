CREATE TABLE IF NOT EXISTS external_rooms (
 room_id TEXT PRIMARY KEY REFERENCES rooms(id)
);
CREATE TABLE IF NOT EXISTS external_agents (
 id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES external_rooms(room_id),
 session_id TEXT NOT NULL, side TEXT NOT NULL CHECK(side IN ('FOR','AGAINST')),
 name TEXT NOT NULL, model TEXT NOT NULL, ready INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'active', UNIQUE(room_id,side), UNIQUE(room_id,session_id)
);
CREATE TABLE IF NOT EXISTS agent_access (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS external_submissions (
 id TEXT NOT NULL, room_id TEXT NOT NULL REFERENCES external_rooms(room_id),
 agent_id TEXT NOT NULL REFERENCES external_agents(id), turn_id TEXT NOT NULL REFERENCES turns(id),
 PRIMARY KEY(room_id,agent_id,id)
);
CREATE INDEX IF NOT EXISTS agent_access_owner ON agent_access(session_id);
