// lib/imageProcessing.ts
import type { PhotoSlot, FrameConfig } from '@/types';
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
 * 
 * NEW: Supports double_strip layout where 4 photos are duplicated to 8 slots
 */
export async function createPhotoStripWithFrame(
  photos: string[],
  frameSrc: string,
  photoSlots?: PhotoSlot[] | null,
  photoCount?: number,
  frameConfig?: FrameConfig | null  // NEW: Add frameConfig parameter
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

  // 3. Determine if this is a double_strip or double_strip_landscape layout
  const isDoubleStrip = frameConfig?.layout === 'double_strip';
  const isDoubleStripLandscape = frameConfig?.layout === 'double_strip_landscape';
  const isAnyDoubleStrip = isDoubleStrip || isDoubleStripLandscape;

  // For double_strip: use key 5 for slot sizes
  // For double_strip_landscape: use key 6 for slot sizes
  // Otherwise use photo count
  const slotSizeKey = isDoubleStrip ? 5 : (isDoubleStripLandscape ? 6 : (photoCount || photos.length));
  const slotSizeConfig = FIXED_SLOT_SIZES[slotSizeKey as keyof typeof FIXED_SLOT_SIZES] || FIXED_SLOT_SIZES[3];

  // Hitung ukuran slot dalam pixel berdasarkan config preset
  const slotPixelWidth = Math.round((slotSizeConfig.width / 100) * frameWidth);
  const slotPixelHeight = Math.round((slotSizeConfig.height / 100) * frameHeight);

  // 4. Determine Slot Configuration
  let slots = photoSlots;

  // For double_strip or double_strip_landscape, we expect 8 slots from the frame config
  const expectedSlotCount = isAnyDoubleStrip ? 8 : (photoCount || photos.length);

  if (!slots || slots.length < expectedSlotCount) {
    // Generate fallback slots if not provided
    if (isDoubleStrip) {
      // Generate 8 slots for double_strip (2 columns x 4 rows)
      const gapX = Math.round(frameWidth * 0.04);
      const gapY = Math.round(frameHeight * 0.02);
      const totalWidth = (slotPixelWidth * 2) + gapX;
      const startX = (frameWidth - totalWidth) / 2;
      const totalHeight = (slotPixelHeight * 4) + (gapY * 3);
      const startY = (frameHeight * 0.88 - totalHeight) / 2; // 88% safe zone

      slots = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          slots.push({
            id: row * 2 + col + 1,
            x: ((startX + col * (slotPixelWidth + gapX)) / frameWidth) * 100,
            y: ((startY + row * (slotPixelHeight + gapY)) / frameHeight) * 100,
            width: slotSizeConfig.width,
            height: slotSizeConfig.height,
          });
        }
      }
    } else if (isDoubleStripLandscape) {
      // Generate 8 slots for double_strip_landscape (4 columns x 2 rows)
      const gapX = Math.round(frameWidth * 0.02);
      const gapY = Math.round(frameHeight * 0.04);
      const totalWidth = (slotPixelWidth * 4) + (gapX * 3);
      const startX = (frameWidth - totalWidth) / 2;
      const totalHeight = (slotPixelHeight * 2) + gapY;
      const startY = (frameHeight * 0.88 - totalHeight) / 2; // 88% safe zone

      slots = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          slots.push({
            id: row * 4 + col + 1,
            x: ((startX + col * (slotPixelWidth + gapX)) / frameWidth) * 100,
            y: ((startY + row * (slotPixelHeight + gapY)) / frameHeight) * 100,
            width: slotSizeConfig.width,
            height: slotSizeConfig.height,
          });
        }
      }
    } else {
      // Original fallback logic for regular layouts
      const actualPhotoCount = photoCount || photos.length;
      const gap = Math.round(frameHeight * 0.03);
      const totalContentHeight = (slotPixelHeight * actualPhotoCount) + (gap * (actualPhotoCount - 1));
      const startY = (frameHeight - totalContentHeight) / 2;
      const startX = (frameWidth - slotPixelWidth) / 2;

      slots = Array.from({ length: actualPhotoCount }).map((_, i) => ({
        id: i + 1,
        x: (startX / frameWidth) * 100,
        y: ((startY + i * (slotPixelHeight + gap)) / frameHeight) * 100,
        width: slotSizeConfig.width,
        height: slotSizeConfig.height
      }));
    }
  }

  // 5. Fill Background White
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 6. Prepare photos array for drawing
  // For double_strip: duplicate photos 1-4 to positions 5-8 (vertical arrangement)
  // For double_strip_landscape: duplicate photos 1-4 to positions 5-8 (horizontal arrangement)
  let photosToRender: string[];

  if (isDoubleStrip && photos.length === 4) {
    // Duplicate: [photo1, photo2, photo3, photo4] -> [p1, p1, p2, p2, p3, p3, p4, p4]
    // Layout: Row-major with slot IDs 1-8 (2 columns x 4 rows)
    // Slot 1 = photo 1 (left column, row 1)
    // Slot 2 = photo 1 (right column, row 1) - COPY
    // Slot 3 = photo 2 (left column, row 2)
    // Slot 4 = photo 2 (right column, row 2) - COPY
    // etc.
    photosToRender = [
      photos[0], photos[0],  // Row 1: photo 1 left & right
      photos[1], photos[1],  // Row 2: photo 2 left & right
      photos[2], photos[2],  // Row 3: photo 3 left & right
      photos[3], photos[3],  // Row 4: photo 4 left & right
    ];
  } else if (isDoubleStripLandscape && photos.length === 4) {
    // Duplicate: [photo1, photo2, photo3, photo4] -> [p1, p2, p3, p4, p1, p2, p3, p4]
    // Layout: Row-major with slot IDs 1-8 (4 columns x 2 rows)
    // Row 1: Slot 1-4 = photos 1-4
    // Row 2: Slot 5-8 = photos 1-4 (COPY)
    photosToRender = [
      photos[0], photos[1], photos[2], photos[3],  // Row 1: photos 1-4
      photos[0], photos[1], photos[2], photos[3],  // Row 2: photos 1-4 (duplicated)
    ];
  } else {
    photosToRender = photos;
  }

  // 7. Draw Photos (With Center Crop Logic)
  for (let i = 0; i < photosToRender.length && i < slots.length; i++) {
    const photoSrc = photosToRender[i];
    const slotData = slots[i];

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

  // 8. Draw Frame Overlay (Transparent PNG) on Top
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