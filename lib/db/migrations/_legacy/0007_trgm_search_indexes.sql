-- Enable pg_trgm extension for trigram-based fuzzy search
-- This powers fast ilike '%...%' queries and similarity() for typo tolerance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on searchable text columns
-- These turn full-table-scan ilike into index-backed lookups
CREATE INDEX IF NOT EXISTS photos_brand_trgm_idx  ON photos USING GIN (brand_name      gin_trgm_ops);
CREATE INDEX IF NOT EXISTS photos_model_trgm_idx  ON photos USING GIN (model_name      gin_trgm_ops);
CREATE INDEX IF NOT EXISTS photos_ref_trgm_idx    ON photos USING GIN (reference_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS photos_watchid_trgm_idx ON photos USING GIN (watch_id       gin_trgm_ops);
