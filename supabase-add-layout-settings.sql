-- ============================================
-- ADD LAYOUT SETTINGS COLUMN TO FRAMES TABLE
-- Run this migration if frames table already exists
-- ============================================

-- Add layout_settings column to frames table
ALTER TABLE frames 
ADD COLUMN IF NOT EXISTS layout_settings JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN frames.layout_settings IS 'JSON object containing sidePadding, verticalPadding, and gapBetweenPhotos percentages';

-- Example layout_settings structure:
-- {
--   "sidePadding": 12,
--   "verticalPadding": 6,
--   "gapBetweenPhotos": 4
-- }
