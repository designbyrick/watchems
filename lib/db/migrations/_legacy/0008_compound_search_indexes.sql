-- Compound index for the hot path: WHERE status = 'approved' ORDER BY created_at DESC
-- Eliminates sort step on every gallery load and paginated fetch
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_status_created_idx
  ON photos (status, created_at DESC);

-- Compound index for brand/model filter queries: WHERE watch_id IN (...) AND status = 'approved'
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_watchid_status_idx
  ON photos (watch_id, status);
