-- Add visual characteristic columns (AI-detected, hidden from users)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS dial_color TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS bezel_color TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS case_material TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS strap_type TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS watch_style TEXT;
