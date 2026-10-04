CREATE TABLE IF NOT EXISTS judgements (
 room_id TEXT PRIMARY KEY REFERENCES rooms(id), status TEXT NOT NULL,
 rubric TEXT NOT NULL, model TEXT, passes_json TEXT NOT NULL DEFAULT '[]',
 error_json TEXT, completed_at TEXT, lease_until TEXT
);
CREATE TABLE IF NOT EXISTS judge_dispatch (
 id INTEGER PRIMARY KEY CHECK(id=1), next_at TEXT NOT NULL
);
INSERT INTO judge_dispatch (id,next_at) VALUES (1,'1970-01-01T00:00:00.000Z') ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS judge_inputs (room_id TEXT PRIMARY KEY REFERENCES judgements(room_id), input_hash TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS judge_rules (room_id TEXT PRIMARY KEY REFERENCES judgements(room_id), rubric_hash TEXT NOT NULL);
