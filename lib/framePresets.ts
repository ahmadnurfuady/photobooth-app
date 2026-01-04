// lib/framePresets.ts

import { PhotoSlot, FrameLayout } from '@/types';

export interface FramePreset {
  photoCount: 1 | 2 | 3 | 4;
  slotCount?: number; // Total slots (for double_strip, this is 8 while photoCount is 4)
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

  // 5 = Double Strip 4 Foto (4R: 10.2x15.2 cm) - PORTRAIT
  // Layout: 2 kolom x 4 baris = 8 slot (4 foto di-copy)
  // Setiap kolom lebar ~45% (dengan gap di tengah)
  // Setiap slot tinggi ~20% (4 baris dengan gap)
  // Rasio foto 4:3 landscape
  5: { width: 45, height: 18 },

  // 6 = Double Strip 4 Foto Landscape (4R: 15.2x10.2 cm) - LANDSCAPE ARRANGEMENT
  // Layout: 4 kolom x 2 baris = 8 slot (slot landscape)
  // Frame: 15.2cm x 10.2cm (ratio 1.49 landscape)
  // Slot landscape dengan rasio visual mendekati double_strip portrait
  // Width: 24% → 24% * 15.2cm = 3.65cm
  // Height: 20% → 20% * 10.2cm = 2.04cm → Rasio 3.65/2.04 ≈ 1.79 (landscape)
  6: { width: 24, height: 24 },
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
  // NEW: Double Strip untuk kertas 4R (Portrait: 2 kolom x 4 baris)
  5: {
    photoCount: 4,
    slotCount: 8, // 8 slot (foto 1-4 di-copy ke 5-8)
    layout: 'double_strip',
    aspectRatio: 10.2 / 15.2, // 0.67 (4R paper)
    name: '4 Photos Double Strip (4R: 10.2x15.2 cm)',
    description: '2 strips side-by-side, photos duplicated',
    defaultSlotSize: FIXED_SLOT_SIZES[5],
  },
  // NEW: Double Strip Landscape untuk kertas 4R (Landscape orientation)
  // Frame: 15.2cm x 10.2cm (aspectRatio 1.49)
  // Slot di-rotate 90° (landscape) → 4 kolom x 2 baris
  6: {
    photoCount: 4,
    slotCount: 8, // 8 slot (foto 1-4 di-copy)
    layout: 'double_strip_landscape',
    aspectRatio: 15.2 / 10.2, // 1.49 (4R paper landscape)
    name: '4 Photos Double Strip Landscape (4R: 15.2x10.2 cm)',
    description: '4 columns x 2 rows, rotated slots',
    defaultSlotSize: FIXED_SLOT_SIZES[6], // Slot landscape (22% x 40%)
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

    case 'double_strip':
      // Double Strip: 2 kolom x 4 baris = 8 slot
      // Foto 1-4 akan di-copy ke slot 5-8 saat render
      const dsGapX = 4; // Gap horizontal antar kolom (%)
      const dsGapY = 2; // Gap vertical antar baris (%)
      const dsSlotW = defaultSlotSize.width; // ~45%
      const dsSlotH = defaultSlotSize.height; // ~18%

      // Total width kedua kolom + gap
      const totalWidth = (dsSlotW * 2) + dsGapX;
      const startX = (100 - totalWidth) / 2;

      // Total height 4 baris + gaps
      const totalDsHeight = (dsSlotH * 4) + (dsGapY * 3);
      const startDsY = (safeZoneHeight - totalDsHeight) / 2;

      // Generate 8 slots (2 kolom x 4 baris)
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          const slotId = row * 2 + col + 1; // 1-8
          slots.push({
            id: slotId,
            x: startX + col * (dsSlotW + dsGapX),
            y: startDsY + row * (dsSlotH + dsGapY),
            width: dsSlotW,
            height: dsSlotH,
          });
        }
      }
      break;

    case 'double_strip_landscape':
      // Double Strip Landscape: 4 kolom x 2 baris = 8 slot
      // Slot di-rotate 90° (landscape orientation)
      const dslGapX = 2; // Gap horizontal antar kolom (%)
      const dslGapY = 4; // Gap vertical antar baris (%)
      const dslSlotW = defaultSlotSize.width; // 22%
      const dslSlotH = defaultSlotSize.height; // 40%

      // Total width 4 kolom + gaps
      const totalDslWidth = (dslSlotW * 4) + (dslGapX * 3);
      const startDslX = (100 - totalDslWidth) / 2;

      // Total height 2 baris + gap
      const totalDslHeight = (dslSlotH * 2) + dslGapY;
      const startDslY = (safeZoneHeight - totalDslHeight) / 2;

      // Generate 8 slots (4 kolom x 2 baris)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          const slotId = row * 4 + col + 1; // 1-8
          slots.push({
            id: slotId,
            x: startDslX + col * (dslSlotW + dslGapX),
            y: startDslY + row * (dslSlotH + dslGapY),
            width: dslSlotW,
            height: dslSlotH,
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