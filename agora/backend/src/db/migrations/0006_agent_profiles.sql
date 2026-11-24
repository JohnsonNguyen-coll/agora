CREATE TABLE IF NOT EXISTS agent_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  strategy TEXT NOT NULL,
  latch_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_profiles_owner ON agent_profiles(user_id, created_at);
