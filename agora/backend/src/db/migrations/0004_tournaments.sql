CREATE TABLE IF NOT EXISTS tournaments (
 id TEXT PRIMARY KEY, owner_session TEXT NOT NULL, title TEXT NOT NULL, topic TEXT NOT NULL,
 capacity INTEGER NOT NULL CHECK(capacity IN (4,8)), duration_minutes INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'registration', created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT,
 champion_id TEXT, blocked_reason TEXT, rules_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tournament_entries (
 id TEXT PRIMARY KEY, tournament_id TEXT NOT NULL REFERENCES tournaments(id), session_id TEXT NOT NULL,
 name TEXT NOT NULL, model TEXT NOT NULL, registered_at TEXT NOT NULL, seed INTEGER,
 UNIQUE(tournament_id,session_id), UNIQUE(tournament_id,seed)
);
CREATE TABLE IF NOT EXISTS tournament_matches (
 id TEXT PRIMARY KEY, tournament_id TEXT NOT NULL REFERENCES tournaments(id), round_index INTEGER NOT NULL,
 match_index INTEGER NOT NULL, attempt INTEGER NOT NULL, room_id TEXT NOT NULL UNIQUE REFERENCES rooms(id),
 for_entry TEXT NOT NULL REFERENCES tournament_entries(id), against_entry TEXT NOT NULL REFERENCES tournament_entries(id),
 winner_entry TEXT REFERENCES tournament_entries(id), resolved_at TEXT,
 UNIQUE(tournament_id,round_index,match_index,attempt)
);
CREATE TABLE IF NOT EXISTS tournament_events (
 id TEXT PRIMARY KEY, tournament_id TEXT NOT NULL REFERENCES tournaments(id), sequence INTEGER NOT NULL,
 type TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(tournament_id,sequence)
);
CREATE INDEX IF NOT EXISTS tournament_matches_room ON tournament_matches(room_id);
CREATE TABLE IF NOT EXISTS tournament_judge_settings (tournament_id TEXT PRIMARY KEY REFERENCES tournaments(id), model TEXT NOT NULL, rubric_hash TEXT NOT NULL);
