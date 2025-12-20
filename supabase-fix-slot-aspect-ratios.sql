-- ============================================
-- FIX PHOTO SLOT ASPECT RATIOS IN EXISTING FRAMES
-- Run this migration to fix incorrect slot percentages
-- ============================================

-- This migration fixes existing frames where photo_slots have incorrect aspect ratios
-- The issue: slot percentages were calculated without considering actual frame dimensions
-- Result: landscape slots (1.5 aspect ratio) were rendering as portrait (0.5 aspect ratio)

-- Fix slots for frames with aspect_ratio = 1.5 (landscape photos)
-- 
-- IMPORTANT: This migration uses hardcoded frame dimensions (1088 × 3264 pixels)
-- These are the typical dimensions for portrait-oriented photobooth frames.
-- 
-- LIMITATIONS:
-- - If your frames have different dimensions, you'll need to adjust frame_width and frame_height
-- - Alternatively, you could query actual frame dimensions from your image storage (e.g., Cloudinary)
-- - The migration will work correctly if all frames have the same aspect ratio (2:3)
-- - For frames with different dimensions, consider running this migration per frame size
--
-- For each slot: recalculate height% to maintain aspect ratio from frame_config

DO $$
DECLARE
  frame_record RECORD;
  slot_record JSONB;
  updated_slots JSONB := '[]'::jsonb;
  frame_width NUMERIC := 1088;  -- Default portrait frame width (adjust if needed)
  frame_height NUMERIC := 3264; -- Default portrait frame height (adjust if needed)
  target_aspect_ratio NUMERIC;
  width_percent NUMERIC;
  width_pixels NUMERIC;
  height_pixels NUMERIC;
  new_height_percent NUMERIC;
BEGIN
  -- Loop through all active frames with frame_config
  FOR frame_record IN 
    SELECT id, frame_config, photo_slots 
    FROM frames 
    WHERE is_active = true 
      AND frame_config IS NOT NULL
      AND photo_slots IS NOT NULL
      AND jsonb_array_length(photo_slots) > 0
  LOOP
    -- Get target aspect ratio from frame_config
    target_aspect_ratio := (frame_record.frame_config->>'aspect_ratio')::numeric;
    
    -- Reset updated_slots for this frame
    updated_slots := '[]'::jsonb;
    
    -- Loop through each slot and fix the height percentage
    FOR slot_record IN 
      SELECT * FROM jsonb_array_elements(frame_record.photo_slots)
    LOOP
      -- Get current width percentage
      width_percent := (slot_record->>'width')::numeric;
      
      -- Calculate correct height percentage to maintain aspect ratio
      -- width_pixels = width_percent * frame_width / 100
      -- height_pixels = width_pixels / aspect_ratio
      -- height_percent = (height_pixels / frame_height) * 100
      width_pixels := (width_percent / 100) * frame_width;
      height_pixels := width_pixels / target_aspect_ratio;
      new_height_percent := (height_pixels / frame_height) * 100;
      
      -- Create updated slot with corrected height
      updated_slots := updated_slots || jsonb_build_object(
        'id', (slot_record->>'id')::int,
        'x', slot_record->>'x',
        'y', slot_record->>'y',
        'width', slot_record->>'width',
        'height', new_height_percent::text
      );
    END LOOP;
    
    -- Update the frame with corrected slots
    UPDATE frames 
    SET photo_slots = updated_slots
    WHERE id = frame_record.id;
    
    RAISE NOTICE 'Fixed frame %: % slots updated', frame_record.id, jsonb_array_length(updated_slots);
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;

-- Verify the fix by checking aspect ratios
-- This query will show the before/after aspect ratios for each slot
-- Run this AFTER the migration to verify:
/*
SELECT 
  f.id,
  f.name,
  (f.frame_config->>'aspect_ratio')::numeric as target_ratio,
  slot->>'id' as slot_id,
  (slot->>'width')::numeric as width_pct,
  (slot->>'height')::numeric as height_pct,
  -- Calculate pixel aspect ratio assuming 1088×3264 frame
  (((slot->>'width')::numeric / 100 * 1088) / 
   ((slot->>'height')::numeric / 100 * 3264))::numeric(10,3) as actual_ratio,
  CASE 
    WHEN ABS((((slot->>'width')::numeric / 100 * 1088) / 
              ((slot->>'height')::numeric / 100 * 3264)) - 
             (f.frame_config->>'aspect_ratio')::numeric) < 0.1 
    THEN '✅ CORRECT'
    ELSE '❌ INCORRECT'
  END as status
FROM frames f,
     jsonb_array_elements(f.photo_slots) as slot
WHERE f.frame_config IS NOT NULL
  AND f.photo_slots IS NOT NULL
ORDER BY f.id, slot->>'id';
*/
