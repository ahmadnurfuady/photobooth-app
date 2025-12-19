-- ============================================
-- PHOTOBOOTH APP DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FRAMES TABLE
-- ============================================
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

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_frames_is_active ON frames(is_active);
CREATE INDEX IF NOT EXISTS idx_frames_created_at ON frames(created_at DESC);

-- ============================================
-- PHOTO SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS photo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb,
  composite_url TEXT,
  composite_public_id VARCHAR(255),
  gif_url TEXT,
  gif_public_id VARCHAR(255),
  photo_count INTEGER DEFAULT 0,
  files_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_photo_sessions_frame_id ON photo_sessions(frame_id);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_created_at ON photo_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_expires_at ON photo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_files_deleted ON photo_sessions(files_deleted);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for frames table
DROP TRIGGER IF EXISTS update_frames_updated_at ON frames;
CREATE TRIGGER update_frames_updated_at
  BEFORE UPDATE ON frames
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_sessions ENABLE ROW LEVEL SECURITY;

-- Frames policies
-- Allow all read access (public can view frames)
CREATE POLICY "Allow public read access to frames"
  ON frames FOR SELECT
  USING (true);

-- Only authenticated users can insert/update/delete frames
CREATE POLICY "Allow authenticated insert frames"
  ON frames FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update frames"
  ON frames FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete frames"
  ON frames FOR DELETE
  USING (true);

-- Photo sessions policies
-- Allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on photo_sessions"
  ON photo_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================
-- Uncomment to insert sample frames
/*
INSERT INTO frames (name, cloudinary_url, cloudinary_public_id, thumbnail_url, is_active)
VALUES 
  ('Classic Frame', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'sample_frame_1', 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_400,h_400/sample.jpg', true),
  ('Birthday Frame', 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'sample_frame_2', 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_400,h_400/sample2.jpg', true)
ON CONFLICT (cloudinary_public_id) DO NOTHING;
*/
