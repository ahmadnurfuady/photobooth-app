-- ============================================
-- ADD FRAME_CONFIG COLUMN TO FRAMES TABLE
-- Run this migration to add preset-based frame configuration
-- ============================================

-- Add frame_config column to frames table
ALTER TABLE frames 
ADD COLUMN IF NOT EXISTS frame_config JSONB DEFAULT NULL;

-- Add photo_slots column if it doesn't exist
ALTER TABLE frames 
ADD COLUMN IF NOT EXISTS photo_slots JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN frames.frame_config IS 'JSON object containing photo_count, layout, aspect_ratio, and default_slot_size from preset';
COMMENT ON COLUMN frames.photo_slots IS 'JSON array of photo slot positions (id, x, y, width, height percentages)';

-- Example frame_config structure:
-- {
--   "photo_count": 3,
--   "layout": "strip",
--   "aspect_ratio": 1.5,
--   "default_slot_size": {
--     "width": 80,
--     "height": 26.67
--   }
-- }

-- Example photo_slots structure:
-- [
--   {"id": 1, "x": 10, "y": 6, "width": 80, "height": 26.67},
--   {"id": 2, "x": 10, "y": 36, "width": 80, "height": 26.67},
--   {"id": 3, "x": 10, "y": 66, "width": 80, "height": 26.67}
-- ]

-- Update existing frames to have default 3-photo strip config if they don't have frame_config
UPDATE frames 
SET frame_config = '{
  "photo_count": 3,
  "layout": "strip",
  "aspect_ratio": 1.5,
  "default_slot_size": {"width": 80, "height": 26.67}
}'::jsonb
WHERE frame_config IS NULL;
