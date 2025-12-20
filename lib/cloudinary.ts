// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryUploadResult } from '@/types';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000, // 120 seconds timeout
});

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: any[];
}

/**
 * Upload file to Cloudinary
 * @param file - File buffer or base64 string
 * @param options - Upload options
 */
export async function uploadToCloudinary(
  file: string | Buffer,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const defaultOptions: UploadOptions = {
      folder: 'photobooth',
      resource_type: 'auto',
      overwrite: false,
      // ✅ CRITICAL FIX: Preserve original orientation, ignore EXIF rotation
      transformation: [
        {
          angle: 0,  // No rotation
          flags: 'ignore_aspect_ratio',  // Ignore EXIF orientation data
        }
      ],
    };

    const uploadOptions = { ...defaultOptions, ...options };

    // Convert Buffer to base64 if needed
    let fileToUpload: string;
    if (Buffer.isBuffer(file)) {
      fileToUpload = `data:image/png;base64,${file.toString('base64')}`;
    } else {
      fileToUpload = file;
    }

    // Add timeout and chunk settings for large files
    const uploadConfig = {
      ...uploadOptions,
      timeout: 120000, // 120 seconds
      chunk_size: 6000000, // 6MB chunks for large files
    };

    console.log('📤 Uploading to Cloudinary with config:', {
      folder: uploadConfig.folder,
      transformation: uploadConfig.transformation,
    });

    const result = await cloudinary.uploader.upload(fileToUpload, uploadConfig);

    console.log('✅ Cloudinary upload result:', {
      url: result. secure_url,
      width: result.width,
      height: result.height,
      aspectRatio: (result.width / result.height).toFixed(3),
      format: result.format,
    });

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    const errorMessage = error.message || error. error?.message || JSON.stringify(error);
    throw new Error(`Failed to upload to Cloudinary:  ${errorMessage}`);
  }
}

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
}

/**
 * Delete multiple files from Cloudinary
 * @param publicIds - Array of Cloudinary public IDs
 */
export async function deleteMultipleFromCloudinary(publicIds: string[]): Promise<void> {
  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch (error: any) {
    console.error('Cloudinary batch delete error:', error);
    throw new Error(`Failed to delete multiple files: ${error.message}`);
  }
}

/**
 * Generate thumbnail URL with Cloudinary transformations
 * @param publicId - Cloudinary public ID
 * @param width - Thumbnail width
 * @param height - Thumbnail height
 */
export function generateThumbnailUrl(
  publicId: string,
  width: number = 300,
  height: number = 300
): string {
  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
    ],
  });
}

/**
 * Generate optimized image URL
 * @param publicId - Cloudinary public ID
 */
export function generateOptimizedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    transformation: [{ quality: 'auto:best', fetch_format: 'auto' }],
  });
}

export default cloudinary;