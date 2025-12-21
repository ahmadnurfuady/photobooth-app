// lib/imageProcessing.ts
import type { PhotoSlot } from '@/types';
import { FIXED_SLOT_SIZES } from './framePresets';

/**
 * Helper: Load Image Promisified
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

/**
 * Apply frame overlay to photo using Canvas API
 */
export async function applyFrameToPhoto(
  photoSrc: string,
  frameSrc: string
): Promise<string> {
  const [photoImg, frameImg] = await Promise.all([
    loadImage(photoSrc),
    loadImage(frameSrc),
  ]);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Set canvas size to photo size
  canvas.width = photoImg.width;
  canvas.height = photoImg.height;

  // Draw photo
  ctx.drawImage(photoImg, 0, 0);

  // Draw frame on top (Stretch frame to fit photo)
  ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Create composite image with photos in frame (Center Crop / Object Fit: Cover)
 * Fixes "Stretched" issue by calculating correct crop coordinates.
 */
export async function createPhotoStripWithFrame(
  photos: string[],
  frameSrc: string,
  photoSlots?: PhotoSlot[] | null,
  photoCount?: number
): Promise<string> {
  if (photos.length === 0) throw new Error('At least 1 photo required');

  // 1. Load Frame Image
  const frameImg = await loadImage(frameSrc);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // 2. Set Canvas to Frame Size
  canvas.width = frameImg.width;
  canvas.height = frameImg.height;

  const frameWidth = canvas.width;
  const frameHeight = canvas.height;

  // 3. Determine Slot Configuration
  // Kita hitung ulang dimensi slot dalam pixel agar akurat
  const actualPhotoCount = photoCount || photos.length;
  const slotSizeConfig = FIXED_SLOT_SIZES[actualPhotoCount as keyof typeof FIXED_SLOT_SIZES] || FIXED_SLOT_SIZES[3];
  
  // Hitung ukuran slot dalam pixel berdasarkan config preset
  const slotPixelWidth = Math.round((slotSizeConfig.width / 100) * frameWidth);
  const slotPixelHeight = Math.round((slotSizeConfig.height / 100) * frameHeight);

  // Fallback layout jika photoSlots dari DB kosong/error
  let slots = photoSlots;
  
  if (!slots || slots.length < photos.length) {
    // Generate posisi default (Vertical Strip)
    const gap = Math.round(frameHeight * 0.03); // 3% gap
    // Hitung total tinggi area foto
    const totalContentHeight = (slotPixelHeight * actualPhotoCount) + (gap * (actualPhotoCount - 1));
    const startY = (frameHeight - totalContentHeight) / 2;
    const startX = (frameWidth - slotPixelWidth) / 2;

    slots = Array.from({ length: actualPhotoCount }).map((_, i) => ({
      id: i + 1,
      x: (startX / frameWidth) * 100, // Convert back to % for compatibility
      y: ((startY + i * (slotPixelHeight + gap)) / frameHeight) * 100,
      width: slotSizeConfig.width,
      height: slotSizeConfig.height
    }));
  }

  // 4. Fill Background White
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 5. Draw Photos (With Center Crop Logic)
  for (let i = 0; i < photos.length; i++) {
    const photoSrc = photos[i];
    // Gunakan slot dari array, pastikan index aman
    const slotData = slots[i] || slots[0]; 

    // Konversi posisi % ke Pixel
    const destX = Math.round((slotData.x / 100) * frameWidth);
    const destY = Math.round((slotData.y / 100) * frameHeight);
    
    // Gunakan ukuran yang sudah kita hitung (FIXED) agar konsisten
    const destW = slotPixelWidth;
    const destH = slotPixelHeight;

    try {
      const img = await loadImage(photoSrc);

      // --- LOGIKA ANTI-GEPENG (Center Crop / Object Fit: Cover) ---
      
      // Rasio foto asli & Rasio slot tujuan
      const imgRatio = img.width / img.height;
      const slotRatio = destW / destH;

      let sourceX = 0;
      let sourceY = 0;
      let sourceW = img.width;
      let sourceH = img.height;

      if (slotRatio > imgRatio) {
        // Slot lebih lebar dari foto (Landscape slot, Portrait photo)
        // Crop Atas & Bawah
        sourceW = img.width;
        sourceH = img.width / slotRatio;
        sourceX = 0;
        sourceY = (img.height - sourceH) / 2; // Center Vertically
      } else {
        // Slot lebih tinggi dari foto (Portrait slot, Landscape photo)
        // ATAU Slot 4:3 tapi Foto sedikit beda
        // Crop Kiri & Kanan
        sourceH = img.height;
        sourceW = img.height * slotRatio;
        sourceY = 0;
        sourceX = (img.width - sourceW) / 2; // Center Horizontally
      }

      // Draw dengan 9 Parameter (Source Crop -> Destination)
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceW, sourceH, // Area yang diambil dari foto asli
        destX, destY, destW, destH          // Area di kanvas frame
      );

    } catch (err) {
      console.error(`Failed to draw photo ${i}`, err);
    }
  }

  // 6. Draw Frame Overlay (Transparent PNG) on Top
  ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Generate GIF (Helper)
 */
export async function generateGIF(photos: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    import('gifshot').then((gifshot) => {
      gifshot.createGIF(
        {
          images: photos,
          gifWidth: 400,
          gifHeight: 533, // 3:4 aspect ratio
          interval: 0.5,
          numFrames: photos.length,
        },
        (obj) => {
          if (!obj.error) resolve(obj.image);
          else reject(new Error(obj.errorMsg));
        }
      );
    }).catch(reject);
  });
}

/**
 * Utils
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
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}

export function downloadBase64Image(base64: string, filename: string) {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}