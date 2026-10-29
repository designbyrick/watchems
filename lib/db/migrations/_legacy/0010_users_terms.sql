-- Users table for tracking terms acceptance
CREATE TABLE IF NOT EXISTS users (
  clerk_id TEXT PRIMARY KEY,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
