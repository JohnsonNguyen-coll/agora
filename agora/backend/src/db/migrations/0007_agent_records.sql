CREATE TABLE IF NOT EXISTS agent_profile_seats (
 agent_id TEXT PRIMARY KEY REFERENCES agents(id),
 profile_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS agent_profile_seats_profile ON agent_profile_seats(profile_id);
CREATE INDEX IF NOT EXISTS agent_profile_seats_owner ON agent_profile_seats(user_id);
