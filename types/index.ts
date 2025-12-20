// types/index.ts

// Photo slot configuration (used by admin to set photo positions)
export interface PhotoSlot {
  id: number;  // 1, 2, 3
  x: number;   // % from left (0-100)
  y: number;   // % from top (0-100)
  width:  number;   // % of frame width (0-100)
  height: number;  // % of frame height (0-100)
}

// Frame interface
export interface Frame {
  id: string;
  name: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  thumbnail_url: string | null;
  is_active: boolean;
  photo_slots? :  PhotoSlot[] | null;  // Photo slot positions from admin
  created_at: string;
  updated_at: string;
}

// Photo data in session
export interface PhotoData {
  url: string;
  public_id: string;
  order:  number;
}

// Photo session
export interface PhotoSession {
  id: string;
  frame_id: string;
  created_at: string;
  expires_at: string;
  photos: PhotoData[];
  composite_url: string | null;
  composite_public_id: string | null;
  gif_url: string | null;
  gif_public_id: string | null;
  photo_count:   number;
  files_deleted: boolean;
  deleted_at:   string | null;
}

// Cloudinary upload result
export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

// API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User
export interface User {
  uid: string;
  email: string | null;
  displayName? :  string | null;
}