// lib/imageProcessing.ts
import type { FrameLayoutSettings } from '@/types';

/**
 * Apply frame overlay to photo using Canvas API
 */
export async function applyFrameToPhoto(
  photoSrc: string,
  frameSrc: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Load photo
    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';
    
    photoImg.onload = () => {
      // Set canvas size to photo size
      canvas.width = photoImg.width;
      canvas.height = photoImg.height;

      // Draw photo
      ctx.drawImage(photoImg, 0, 0);

      // Load and draw frame
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      
      frameImg.onload = () => {
        // Draw frame on top
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const result = canvas.toDataURL('image/jpeg', 0.95);
        resolve(result);
      };

      frameImg.onerror = () => {
        reject(new Error('Failed to load frame image'));
      };

      frameImg.src = frameSrc;
    };

    photoImg.onerror = () => {
      reject(new Error('Failed to load photo'));
    };

    photoImg.src = photoSrc;
  });
}

/**
 * Create composite image with 3 photos in 1 frame (vertical strip)
 * Photo 1: Top slot
 * Photo 2: Middle slot
 * Photo 3: Bottom slot
 */
// lib/imageProcessing.ts

/**
 * Create composite image with 3 photos in 1 frame (vertical strip)
 * IMPROVED: Better positioning & clipping with custom layout settings
 */
export async function createPhotoStripWithFrame(
  photos: string[],
  frameSrc: string,
  layoutSettings?: FrameLayoutSettings
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      if (photos.length !== 3) {
        reject(new Error('Exactly 3 photos required'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Load frame first
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';

      frameImg.onload = async () => {
        // Set canvas to frame size
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;

        // Calculate photo slots using custom or default settings
        const frameWidth = canvas.width;
        const frameHeight = canvas.height;

        let photoSlots: Array<{ x: number; y: number; width: number; height: number; radius?: number }>; 

        if ((layoutSettings as FrameLayoutSettings | undefined)?.slots && (layoutSettings as FrameLayoutSettings).slots!.length === 3) {
          // Use explicit percent-based slots from settings
          photoSlots = (layoutSettings as FrameLayoutSettings).slots!.map((s: { x: number; y: number; width: number; height: number; radius?: number }) => ({
            x: Math.round((s.x / 100) * frameWidth),
            y: Math.round((s.y / 100) * frameHeight),
            width: Math.round((s.width / 100) * frameWidth),
            height: Math.round((s.height / 100) * frameHeight),
            radius: s.radius,
          }));
        } else {
          // Fallback to padding-based layout
          const settings: FrameLayoutSettings = layoutSettings || {
            sidePadding: 12,
            verticalPadding: 6,
            gapBetweenPhotos: 4,
          };

          const sidePadding = Math.floor(frameWidth * (((settings.sidePadding ?? 12)) / 100));
          const verticalPadding = Math.floor(frameHeight * (((settings.verticalPadding ?? 6)) / 100));
          const gapBetweenPhotos = Math.floor(frameHeight * (((settings.gapBetweenPhotos ?? 4)) / 100));
          
          const photoWidth = frameWidth - (sidePadding * 2);
          const availableHeight = frameHeight - (verticalPadding * 2) - (gapBetweenPhotos * 2);
          const photoHeight = Math.floor(availableHeight / 3);

          photoSlots = [
            { x: sidePadding, y: verticalPadding, width: photoWidth, height: photoHeight },
            { x: sidePadding, y: verticalPadding + photoHeight + gapBetweenPhotos, width: photoWidth, height: photoHeight },
            { x: sidePadding, y: verticalPadding + (photoHeight * 2) + (gapBetweenPhotos * 2), width: photoWidth, height: photoHeight },
          ];
        }

        // Fill background with frame color (light blue/white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load and draw all photos with proper clipping
        const loadAndDrawPhoto = (src: string, slot: typeof photoSlots[0]): Promise<void> => {
          return new Promise((resolvePhoto, rejectPhoto) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              // Calculate aspect ratios
              const imgAspect = img.width / img.height;
              const slotAspect = slot.width / slot.height;
              
              let drawWidth, drawHeight, drawX, drawY;
              
              // Cover fit (fill the slot completely)
              if (imgAspect > slotAspect) {
                // Image wider - fit to height
                drawHeight = slot.height;
                drawWidth = drawHeight * imgAspect;
                drawX = slot.x - (drawWidth - slot.width) / 2;
                drawY = slot.y;
              } else {
                // Image taller - fit to width
                drawWidth = slot.width;
                drawHeight = drawWidth / imgAspect;
                drawX = slot.x;
                drawY = slot.y - (drawHeight - slot.height) / 2;
              }

              // Save context
              ctx.save();
              
              // Create clipping region with rounded corners
              const cornerRadius = (slot.radius !== undefined)
                ? (Math.min(slot.width, slot.height) * (slot.radius / 100))
                : (Math.min(slot.width, slot.height) * 0.08); // default 8%
              ctx.beginPath();
              ctx.moveTo(slot.x + cornerRadius, slot.y);
              ctx.lineTo(slot.x + slot.width - cornerRadius, slot.y);
              ctx.quadraticCurveTo(slot.x + slot.width, slot.y, slot.x + slot.width, slot.y + cornerRadius);
              ctx.lineTo(slot.x + slot.width, slot.y + slot.height - cornerRadius);
              ctx.quadraticCurveTo(slot.x + slot.width, slot.y + slot.height, slot.x + slot.width - cornerRadius, slot.y + slot.height);
              ctx.lineTo(slot.x + cornerRadius, slot.y + slot.height);
              ctx.quadraticCurveTo(slot.x, slot.y + slot.height, slot.x, slot.y + slot.height - cornerRadius);
              ctx.lineTo(slot.x, slot.y + cornerRadius);
              ctx.quadraticCurveTo(slot.x, slot.y, slot.x + cornerRadius, slot.y);
              ctx.closePath();
              ctx.clip();
              
              // Draw image
              ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
              
              // Restore context
              ctx.restore();

              resolvePhoto();
            };

            img.onerror = () => rejectPhoto(new Error('Failed to load photo'));
            img.src = src;
          });
        };

        // Draw all 3 photos sequentially
        try {
          await loadAndDrawPhoto(photos[0], photoSlots[0]);
          await loadAndDrawPhoto(photos[1], photoSlots[1]);
          await loadAndDrawPhoto(photos[2], photoSlots[2]);

          // Draw frame overlay on top
          ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

          // Convert to base64
          const result = canvas.toDataURL('image/jpeg', 0.95);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      frameImg.onerror = () => {
        reject(new Error('Failed to load frame'));
      };

      frameImg.src = frameSrc;
    } catch (error) {
      reject(error);
    }
  });
}
/**
 * Generate GIF from multiple photos (WITHOUT FRAME - original photos only)
 */
export async function generateGIF(photos: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Dynamic import gifshot (client-side only)
    import('gifshot').then((gifshot) => {
      gifshot.createGIF(
        {
          images: photos, // Original photos WITHOUT frame
          gifWidth: 400, // Reduced from 600
          gifHeight: 533, // Reduced from 800 (maintains 3:4 ratio)
          interval: 0.5, // Faster animation - 0.5 seconds per frame
          numFrames: photos.length,
          frameDuration: 5, // 0.5s * 10 = 5
          sampleInterval: 15, // Increased from 10 for better compression
          numWorkers: 2,
        },
        (obj) => {
          if (!obj.error) {
            // Validate the GIF data
            if (!obj.image || !obj.image.startsWith('data:image/gif')) {
              reject(new Error('Invalid GIF data generated'));
              return;
            }
            resolve(obj.image);
          } else {
            reject(new Error(obj.errorMsg || 'Failed to create GIF'));
          }
        }
      );
    }).catch(reject);
  });
}

/**
 * Convert base64 to Blob for upload
 */
export function base64ToBlob(base64: string, contentType: string = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

/**
 * Download base64 image
 */
export function downloadBase64Image(base64: string, filename: string) {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}