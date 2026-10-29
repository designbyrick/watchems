-- Add original_url column to preserve pre-crop image for revert
ALTER TABLE photos ADD COLUMN IF NOT EXISTS original_url TEXT;
