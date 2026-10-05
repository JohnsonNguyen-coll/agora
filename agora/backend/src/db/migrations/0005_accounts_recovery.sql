CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL, confirmed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS privy_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), access_token TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS privy_sessions_user ON privy_sessions(user_id);
CREATE TABLE IF NOT EXISTS room_vote_rules (room_id TEXT PRIMARY KEY REFERENCES rooms(id), version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS verified_votes (vote_id TEXT PRIMARY KEY REFERENCES votes(id), user_id TEXT NOT NULL REFERENCES accounts(id));
CREATE TABLE IF NOT EXISTS tournament_policies (tournament_id TEXT PRIMARY KEY REFERENCES tournaments(id), ready_seconds INTEGER NOT NULL, turn_seconds INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tournament_match_controls (match_id TEXT PRIMARY KEY REFERENCES tournament_matches(id), ready_deadline TEXT NOT NULL, outcome TEXT, reason TEXT, judge_retries INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tournament_rematch_consents (match_id TEXT NOT NULL REFERENCES tournament_matches(id), entry_id TEXT NOT NULL REFERENCES tournament_entries(id), created_at TEXT NOT NULL, PRIMARY KEY (match_id,entry_id));

CREATE TABLE IF NOT EXISTS tournament_match_pauses (match_id TEXT PRIMARY KEY REFERENCES tournament_matches(id), paused_at TEXT, turn_extension_ms INTEGER NOT NULL DEFAULT 0);
