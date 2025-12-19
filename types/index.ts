// types/index.ts

export interface FrameSlot {
  // Percent-based rectangle relative to frame image
  x: number; // 0-100
  y: number; // 0-100
  width: number; // 0-100
  height: number; // 0-100
  radius?: number; // corner radius percent of min(width,height)
}

export interface FrameLayoutSettings {
  // Simple padding-based layout
  sidePadding?: number; // Percentage (e.g., 12 = 12%)
  verticalPadding?: number; // Percentage
  gapBetweenPhotos?: number; // Percentage
  // Advanced explicit slots layout (3 slots expected)
  slots?: [FrameSlot, FrameSlot, FrameSlot];
}

export interface Frame {
  id: string;
  name: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  thumbnail_url: string | null;
  is_active: boolean;
  layout_settings: FrameLayoutSettings | null;
  created_at: string;
  updated_at: string;
}

export interface PhotoData {
  url: string;
  public_id: string;
  order: number;
}

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
  photo_count: number;
  files_deleted: boolean;
  deleted_at: string | null;
}

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName?:  string | null;
}