-- Add SEO-friendly slug column to photos table
-- Pattern: {brand}-{model}-{first8charsOfUUID}  e.g. rolex-explorer-ii-ca905204
-- Falls back to {watchId}-{first8charsOfUUID} when brandName/modelName are null

ALTER TABLE photos ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill slugs for all existing rows
UPDATE photos
SET slug =
  TRIM(BOTH '-' FROM
    LOWER(REGEXP_REPLACE(
      CASE
        WHEN brand_name IS NOT NULL AND model_name IS NOT NULL
          THEN brand_name || ' ' || model_name
        ELSE REPLACE(watch_id, '-', ' ')
      END,
      '[^a-zA-Z0-9]+', '-', 'g'
    ))
  ) || '-' || SUBSTRING(REPLACE(id, '-', ''), 1, 8)
WHERE slug IS NULL;

-- Unique constraint + index
ALTER TABLE photos ADD CONSTRAINT photos_slug_unique UNIQUE (slug);
CREATE INDEX IF NOT EXISTS photos_slug_idx ON photos (slug);
