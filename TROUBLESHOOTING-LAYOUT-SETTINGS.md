============================================
TROUBLESHOOTING: Failed to save frame to database
============================================

ERROR CAUSE:
The "layout_settings" column doesn't exist in the frames table yet.

SOLUTION - Run this SQL in Supabase SQL Editor:
============================================

-- Step 1: Add layout_settings column to frames table
ALTER TABLE frames 
ADD COLUMN IF NOT EXISTS layout_settings JSONB DEFAULT NULL;

-- Step 2: Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'frames';

-- Expected output should include:
-- layout_settings | jsonb


============================================
TESTING AFTER MIGRATION:
============================================

After running the SQL above, test by:
1. Go to Admin Dashboard
2. Click "Add New Frame"
3. Fill in the form with:
   - Frame name
   - Upload an image
   - Adjust layout sliders
4. Click "Create Frame"

The frame should now save successfully with custom layout settings!

============================================
ALTERNATIVE: If frames table doesn't exist yet
============================================

If you haven't created the frames table yet, run the full schema:
File: supabase-schema.sql (contains complete database structure)

Or just run this quick create:

CREATE TABLE IF NOT EXISTS frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL UNIQUE,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  layout_settings JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frames_is_active ON frames(is_active);
CREATE INDEX IF NOT EXISTS idx_frames_created_at ON frames(created_at DESC);
