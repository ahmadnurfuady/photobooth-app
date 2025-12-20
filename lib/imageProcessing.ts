// lib/imageProcessing.ts
import type { PhotoSlot } from '@/types';

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
 * Create composite image with photos in frame
 * Uses PhotoSlot[] configuration from admin with CORRECT aspect ratios
 * Supports 1-4 photos
 */
export async function createPhotoStripWithFrame(
  photos: string[],
  frameSrc: string,
  photoSlots?: PhotoSlot[] | null
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      if (photos.length < 1 || photos.length > 4) {
        reject(new Error('1 to 4 photos required'));
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

        console.log('🖼️  Frame size:', canvas.width, '×', canvas.height);

        // Calculate photo slots in pixels
        const frameWidth = canvas.width;
        const frameHeight = canvas.height;

        let slots: Array<{ 
          x: number; 
          y: number; 
          width: number; 
          height: number;
          aspectRatio: number;
        }>;

        if (photoSlots && photoSlots.length === photos.length) {
          // Use custom slots from admin (convert % to pixels)
          slots = photoSlots.map((s, index) => {
            const slotX = Math.round((s.x / 100) * frameWidth);
            const slotY = Math.round((s.y / 100) * frameHeight);
            const slotWidth = Math.round((s.width / 100) * frameWidth);
            const slotHeight = Math.round((s.height / 100) * frameHeight);
            const aspectRatio = slotWidth / slotHeight;

            console.log(`📍 Slot ${index + 1} conversion:`, {
              percent: `${s.width.toFixed(2)}% × ${s.height.toFixed(2)}%`,
              pixels: `${slotWidth}px × ${slotHeight}px`,
              aspectRatio: aspectRatio.toFixed(3),
              orientation: aspectRatio > 1 ? 'landscape ✅' : 'portrait ❌',
            });

            return {
              x: slotX,
              y: slotY,
              width: slotWidth,
              height: slotHeight,
              aspectRatio,
            };
          });
        } else {
          // Fallback: Default slots based on photo count
          console.warn(`⚠️ No photo_slots found, using default layout for ${photos.length} photos`);
          const sidePadding = Math.floor(frameWidth * 0.08);
          const verticalPadding = Math.floor(frameHeight * 0.06);
          const gap = Math.floor(frameHeight * 0.03);
          
          const photoWidth = frameWidth - (sidePadding * 2);
          const availableHeight = frameHeight - (verticalPadding * 2) - (gap * (photos.length - 1));
          const photoHeight = Math.floor(availableHeight / photos.length);

          slots = [];
          for (let i = 0; i < photos.length; i++) {
            slots.push({ 
              x: sidePadding, 
              y: verticalPadding + i * (photoHeight + gap), 
              width: photoWidth, 
              height: photoHeight,
              aspectRatio: photoWidth / photoHeight,
            });
          }
        }

        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load and draw photo - COVER MODE (FIXED)
        const loadAndDrawPhoto = (
          src: string, 
          slot: typeof slots[0],
          index: number
        ): Promise<void> => {
          return new Promise((resolvePhoto, rejectPhoto) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              console.log(`📸 Photo ${index} loaded:`, img.width, '×', img.height, `(ratio: ${(img.width / img.height).toFixed(3)})`);
              
              const photoAspectRatio = img.width / img.height;
              const slotAspectRatio = slot.aspectRatio;

              console.log(`  Slot aspect ratio: ${slotAspectRatio.toFixed(3)}`);
              console.log(`  Photo aspect ratio: ${photoAspectRatio.toFixed(3)}`);

              // Save context
              ctx.save();
              
              // Create clipping region for slot (rounded corners)
              const cornerRadius = Math.min(slot.width, slot.height) * 0.05;
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
              
              // ✅ COVER MODE: Fill slot completely while maintaining aspect ratio
              let drawWidth, drawHeight, drawX, drawY;

              // Calculate scale factors for both dimensions
              const scaleX = slot.width / img.width;
              const scaleY = slot.height / img.height;
              
              // Use the LARGER scale to ensure full coverage
              // Add 3% safety margin to guarantee no white space
              const scale = Math.max(scaleX, scaleY) * 1.03;
              
              // Calculate final dimensions (rounded up)
              drawWidth = Math.ceil(img.width * scale);
              drawHeight = Math.ceil(img.height * scale);
              
              // Center the image in the slot
              drawX = slot.x + Math.floor((slot.width - drawWidth) / 2);
              drawY = slot.y + Math.floor((slot.height - drawHeight) / 2);
              
              console.log(`  📐 Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
              console.log(`  📐 Final scale (with 3% margin): ${scale.toFixed(3)}`);
              console.log(`  ${scaleY > scaleX ? '📏 FIT HEIGHT (crop width)' : '📏 FIT WIDTH (crop height)'}`);
              console.log(`  📍 Slot: (${slot.x}, ${slot.y}), ${slot.width}×${slot.height}px`);
              console.log(`  🖼️  Draw: (${drawX}, ${drawY}), ${drawWidth}×${drawHeight}px`);
              console.log(`  🎯 Offset: X=${(slot.width - drawWidth) / 2}, Y=${(slot.height - drawHeight) / 2}`);
              console.log(`  ✅ Coverage: ${drawWidth >= slot.width && drawHeight >= slot.height ? 'Full' : 'Partial'}`);
              
              // Draw image (will be cropped by clip region)
              ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
              
              console.log(`  Draw position: (${drawX.toFixed(0)}, ${drawY.toFixed(0)})`);
              console.log(`  Draw size: ${drawWidth.toFixed(0)}px × ${drawHeight.toFixed(0)}px`);
              console.log(`  Slot size: ${slot.width}px × ${slot.height}px`);
              console.log(`  Coverage: ${drawWidth >= slot.width && drawHeight >= slot.height ? '✅ Full' : '❌ Partial'}`);
              
              // Restore context
              ctx.restore();

              // Resolve promise
              resolvePhoto();
            };

            img.onerror = () => rejectPhoto(new Error(`Failed to load photo ${index}`));
            img.src = src;
          });
        };

        // Draw all photos sequentially
        try {
          for (let i = 0; i < photos.length; i++) {
            await loadAndDrawPhoto(photos[i], slots[i], i + 1);
          }

          // Draw frame overlay on top
          ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

          console.log('✅ Composite created successfully');

          // Convert to base64
          const result = canvas.toDataURL('image/jpeg', 0.95);
          resolve(result);
        } catch (error) {
          console.error('❌ Error drawing photos:', error);
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
 * Generate GIF from multiple photos (WITHOUT FRAME)
 */
export async function generateGIF(photos: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    import('gifshot').then((gifshot) => {
      gifshot.createGIF(
        {
          images: photos,
          gifWidth: 400,
          gifHeight: 533,
          interval: 0.5,
          numFrames: photos.length,
          frameDuration: 5,
          sampleInterval: 15,
          numWorkers: 2,
        },
        (obj) => {
          if (!obj.error) {
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
 * Convert base64 to Blob
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
 * Download blob
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