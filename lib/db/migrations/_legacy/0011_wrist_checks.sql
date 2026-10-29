CREATE TABLE IF NOT EXISTS wrist_checks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT wrist_checks_user_photo_date_unique UNIQUE (user_id, photo_id, date)
);

CREATE INDEX IF NOT EXISTS wrist_checks_user_id_idx ON wrist_checks (user_id);
CREATE INDEX IF NOT EXISTS wrist_checks_user_date_idx ON wrist_checks (user_id, date);
