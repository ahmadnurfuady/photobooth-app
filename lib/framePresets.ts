// lib/framePresets.ts

import { PhotoSlot, FrameLayout } from '@/types';

export interface FramePreset {
  photoCount: 1 | 2 | 3 | 4;
  layout: FrameLayout;
  aspectRatio: number;
  name: string;
  description: string;
  defaultSlotSize: {
    width: number; // percentage of frame width
    height: number; // percentage of frame height
  };
}

/**
 * FIXED SLOT SIZES (KALIBRASI KHUSUS CM)
 * * Perhitungan ini memastikan foto tetap rasio 4:3 (Landscape) 
 * saat dicetak di ukuran kertas fisik yang berbeda-beda.
 * * Width diset ke 84% agar ada margin kiri-kanan yang pas di kertas 5cm.
 */
export const FIXED_SLOT_SIZES = {
  // 1 Foto (13x9 cm) 
  // Width 84% dari 13cm = ~10.9cm
  // Height (agar 4:3) = ~8.2cm -> 91% dari tinggi 9cm
  1: { width: 84, height: 91 },

  // 2 Foto (5x10 cm)
  // Width 84% dari 5cm = 4.2cm
  // Height (agar 4:3) = 3.15cm -> 31.5% dari tinggi 10cm
  2: { width: 84, height: 31.5 },

  // 3 Foto (5x15 cm)
  // Width 84% dari 5cm = 4.2cm
  // Height (agar 4:3) = 3.15cm -> 21% dari tinggi 15cm
  3: { width: 84, height: 21 },

  // 4 Foto (5x18.5 cm)
  // Width 84% dari 5cm = 4.2cm
  // Height (agar 4:3) = 3.15cm -> 17% dari tinggi 18.5cm
  // (Angka 17% ini pas agar 4 foto berjejer vertikal tidak kepanjangan)
  4: { width: 84, height: 17 },
};

/**
 * Frame presets definition
 */
export const FRAME_PRESETS: Record<number, FramePreset> = {
  1: {
    photoCount: 1,
    layout: 'single',
    aspectRatio: 13 / 9, // 1.44
    name: '1 Photo (13x9 cm)',
    description: 'Landscape card size',
    defaultSlotSize: FIXED_SLOT_SIZES[1],
  },
  2: {
    photoCount: 2,
    layout: 'vertical',
    aspectRatio: 5 / 10, // 0.5
    name: '2 Photos (5x10 cm)',
    description: 'Short vertical strip',
    defaultSlotSize: FIXED_SLOT_SIZES[2],
  },
  3: {
    photoCount: 3,
    layout: 'strip',
    aspectRatio: 5 / 15, // 0.33
    name: '3 Photos (5x15 cm)',
    description: 'Standard photobooth strip',
    defaultSlotSize: FIXED_SLOT_SIZES[3],
  },
  4: {
    photoCount: 4,
    // PENTING: Layout diubah ke 'strip' (vertikal) karena kertas 5x18.5cm bentuknya memanjang.
    // Grid 2x2 tidak akan muat di lebar 5cm.
    layout: 'strip', 
    aspectRatio: 5 / 18.5, // 0.27
    name: '4 Photos (5x18.5 cm)',
    description: 'Long vertical strip',
    defaultSlotSize: FIXED_SLOT_SIZES[4],
  },
};

/**
 * Generate default photo slots based on preset
 * Returns slot positions in percentages (0-100)
 */
export function generateDefaultSlots(preset: FramePreset): PhotoSlot[] {
  const { photoCount, layout, defaultSlotSize } = preset;
  const slots: PhotoSlot[] = [];

  // Safe Zone Height: 
  // Gunakan 95% agar border foto terbawah tidak terlalu mepet ujung kertas.
  // Jika teks Anda besar, turunkan angka ini (misal ke 90).
  const safeZoneHeight = 95;

  switch (layout) {
    case 'single':
      // Centered single photo
      slots.push({
        id: 1,
        x: (100 - defaultSlotSize.width) / 2,
        y: (safeZoneHeight - defaultSlotSize.height) / 2,
        width: defaultSlotSize.width,
        height: defaultSlotSize.height,
      });
      break;

    case 'vertical':
      // Two photos stacked vertically
      const verticalGap = 5;
      const totalHVertical = (defaultSlotSize.height * 2) + verticalGap;
      const startYVertical = (safeZoneHeight - totalHVertical) / 2;
      
      for (let i = 0; i < 2; i++) {
        slots.push({
          id: i + 1,
          x: (100 - defaultSlotSize.width) / 2,
          y: startYVertical + i * (defaultSlotSize.height + verticalGap),
          width: defaultSlotSize.width,
          height: defaultSlotSize.height,
        });
      }
      break;

    case 'strip':
      // Logic ini menangani 3 FOTO dan 4 FOTO sekaligus
      const stripGap = 3;
      
      // Hitung total tinggi tumpukan foto
      const totalHStrip = (defaultSlotSize.height * photoCount) + (stripGap * (photoCount - 1));
      
      // Hitung posisi awal Y agar tumpukan berada di tengah Safe Zone
      const startYStrip = (safeZoneHeight - totalHStrip) / 2;

      // Loop dinamis sesuai jumlah foto (3 atau 4)
      for (let i = 0; i < photoCount; i++) {
        slots.push({
          id: i + 1,
          x: (100 - defaultSlotSize.width) / 2,
          y: startYStrip + i * (defaultSlotSize.height + stripGap),
          width: defaultSlotSize.width,
          height: defaultSlotSize.height,
        });
      }
      break;

    case 'grid':
      // Fallback logic untuk Grid 2x2 (Jika suatu saat dipakai untuk kertas lebar)
      // Tidak digunakan untuk preset 5x18.5cm saat ini.
      const gridGap = 4;
      const slotWidth = (100 - gridGap * 3) / 2;
      const slotHeight = slotWidth; // Square aspect ratio default for grid
      
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          slots.push({
            id: row * 2 + col + 1,
            x: 10 + col * (slotWidth + gridGap),
            y: 10 + row * (slotHeight + gridGap),
            width: slotWidth,
            height: slotHeight,
          });
        }
      }
      break;
  }

  return slots;
}

/**
 * Validate and fix slot aspect ratio
 * Updated logic: Menggunakan dimensi fisik (CM) untuk perhitungan yang akurat
 */
export function normalizeSlotAspectRatio(
  slot: PhotoSlot,
  targetAspectRatio: number,
  frameWidthCm: number = 5,   // Default fallback width (strip)
  frameHeightCm: number = 15  // Default fallback height
): PhotoSlot {
  const tolerance = 0.05;

  // Hitung rasio visual saat ini berdasarkan CM
  // (Width% * CmWidth) / (Height% * CmHeight)
  const currentVisualRatio = (slot.width * frameWidthCm) / (slot.height * frameHeightCm);

  // Jika sudah pas (toleransi 0.05), kembalikan aslinya
  if (Math.abs(currentVisualRatio - targetAspectRatio) < tolerance) {
    return slot;
  }

  // Jika tidak pas, hitung Height baru (%)
  // NewHeight% = (Width% * FrameWidthCm) / (TargetRatio * FrameHeightCm)
  const newHeightPercent = (slot.width * frameWidthCm) / (targetAspectRatio * frameHeightCm);

  return {
    ...slot,
    height: newHeightPercent,
  };
}

/**
 * Get preset by photo count
 */
export function getPreset(photoCount: number): FramePreset | null {
  return FRAME_PRESETS[photoCount] || null;
}

/**
 * Get all available presets
 */
export function getAllPresets(): FramePreset[] {
  return Object.values(FRAME_PRESETS);
}