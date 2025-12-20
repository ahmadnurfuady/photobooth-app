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
 * Frame presets with locked aspect ratios
 * Each preset defines photo count, layout, and aspect ratio
 */
export const FRAME_PRESETS: Record<number, FramePreset> = {
  1: {
    photoCount: 1,
    layout: 'single',
    aspectRatio: 4 / 3, // 1.333 - Landscape
    name: '1 Photo (Landscape)',
    description: 'Single landscape photo',
    defaultSlotSize: {
      width: 60,
      height: 45, // 60 / (4/3) = 45 to maintain 4:3 ratio
    },
  },
  2: {
    photoCount: 2,
    layout: 'vertical',
    aspectRatio: 4 / 3, // 1.333 - Landscape
    name: '2 Photos (Landscape)',
    description: 'Two photos stacked vertically',
    defaultSlotSize: {
      width: 80,
      height: 60, // 80 / (4/3) = 60 to maintain 4:3 ratio
    },
  },
  3: {
    photoCount: 3,
    layout: 'strip',
    aspectRatio: 4 / 3, // 1.333 - Landscape (4:3)
    name: '3 Photos (Classic Strip)',
    description: 'Classic photo strip layout',
    defaultSlotSize: {
      width: 80,
      height: 60, // 80 / (4/3) = 60 to maintain 4:3 ratio
    },
  },
  4: {
    photoCount: 4,
    layout: 'grid',
    aspectRatio: 4 / 3, // 1.333 - Landscape (4:3)
    name: '4 Photos (Landscape Grid)',
    description: '2×2 grid of landscape photos',
    defaultSlotSize: {
      width: 40,
      height: 30, // 40 / (4/3) = 30 to maintain 4:3 ratio
    },
  },
};

/**
 * Generate default photo slots based on preset
 * Returns slot positions in percentages (0-100)
 */
export function generateDefaultSlots(preset: FramePreset): PhotoSlot[] {
  const { photoCount, layout, defaultSlotSize } = preset;
  const slots: PhotoSlot[] = [];

  switch (layout) {
    case 'single':
      // Centered single photo
      slots.push({
        id: 1,
        x: (100 - defaultSlotSize.width) / 2,
        y: (100 - defaultSlotSize.height) / 2,
        width: defaultSlotSize.width,
        height: defaultSlotSize.height,
      });
      break;

    case 'vertical':
      // Two photos stacked vertically
      const verticalGap = 4;
      const verticalPadding = (100 - (defaultSlotSize.height * 2 + verticalGap)) / 2;
      slots.push(
        {
          id: 1,
          x: (100 - defaultSlotSize.width) / 2,
          y: verticalPadding,
          width: defaultSlotSize.width,
          height: defaultSlotSize.height,
        },
        {
          id: 2,
          x: (100 - defaultSlotSize.width) / 2,
          y: verticalPadding + defaultSlotSize.height + verticalGap,
          width: defaultSlotSize.width,
          height: defaultSlotSize.height,
        }
      );
      break;

    case 'strip':
      // Three photos in vertical strip
      const stripGap = 3;
      const stripPadding = (100 - (defaultSlotSize.height * 3 + stripGap * 2)) / 2;
      for (let i = 0; i < 3; i++) {
        slots.push({
          id: i + 1,
          x: (100 - defaultSlotSize.width) / 2,
          y: stripPadding + i * (defaultSlotSize.height + stripGap),
          width: defaultSlotSize.width,
          height: defaultSlotSize.height,
        });
      }
      break;

    case 'grid':
      // 2×2 grid
      const gridGap = 4;
      const slotWidth = (100 - gridGap) / 2 - 10; // 10% margin on sides
      const slotHeight = slotWidth; // Square slots
      const gridPaddingX = 10;
      const gridPaddingY = (100 - (slotHeight * 2 + gridGap)) / 2;

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          slots.push({
            id: row * 2 + col + 1,
            x: gridPaddingX + col * (slotWidth + gridGap),
            y: gridPaddingY + row * (slotHeight + gridGap),
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
 * Validate and fix slot aspect ratio to match preset
 * Adjusts height to maintain aspect ratio if mismatch detected
 */
export function normalizeSlotAspectRatio(
  slot: PhotoSlot,
  targetAspectRatio: number
): PhotoSlot {
  const currentAspectRatio = slot.width / slot.height;
  const tolerance = 0.01;

  // If aspect ratio is correct, return as-is
  if (Math.abs(currentAspectRatio - targetAspectRatio) < tolerance) {
    return slot;
  }

  // Fix height based on width and target aspect ratio
  return {
    ...slot,
    height: slot.width / targetAspectRatio,
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
