# Photo Slot Aspect Ratio Fix

## Problem Summary

Photo slots were being rendered as **portrait** (tall/narrow) in the final composite, despite captured photos being **landscape**. This occurred because slot percentages stored in the database didn't account for actual frame dimensions when converted to pixels.

## Root Cause

When admin users positioned photo slots in `FrameUploadModal.tsx`:
1. Slots were drawn on a preview canvas with aspect ratio 2:3 (portrait)
2. Slot dimensions were stored as percentages (e.g., 40% width × 27% height)
3. These percentages looked correct on the preview canvas
4. BUT when applied to actual frame dimensions (1088×3264 pixels), they produced the wrong aspect ratio

**Example:**
- Slot percentages: 39.166% × 26.111% (looks landscape on canvas)
- Frame dimensions: 1088 × 3264 pixels (portrait)
- Slot pixels: 426px × 852px → aspect ratio 0.5 (portrait!) ❌
- Expected: 426px × 284px → aspect ratio 1.5 (landscape) ✅

## Solution Implemented

### 1. FrameUploadModal.tsx
- **Load actual frame dimensions** when image is selected
- **Recalculate slot height percentages** to maintain aspect ratio in pixels
- Formula: `height% = (width% × frame_width / aspect_ratio) / frame_height × 100`
- **Add validation logging** before saving to verify aspect ratios

### 2. CameraPreview.tsx
- **Fix bounding box calculation** to use pixels, not percentages
- **Fix capture logic** to calculate correct canvas dimensions
- Previously calculated aspect ratio as `width% / height%` ❌
- Now calculates as `(width% × frame_width) / (height% × frame_height)` ✅

### 3. imageProcessing.ts
- **Enhanced logging** to show slot orientation (landscape/portrait)
- Conversion logic was already correct, just added better diagnostics

### 4. Database Migration
- **SQL script** to fix existing frames: `supabase-fix-slot-aspect-ratios.sql`
- Recalculates height percentages for all active frames
- Maintains width and position, only fixes height to achieve correct aspect ratio

## Testing

### For New Frames
1. Upload a new frame through admin panel
2. Check browser console for validation logs:
   ```
   🔍 Validating slot aspect ratios before save:
     Slot 1: {..., actualRatio: "1.500", expectedRatio: "1.500", match: "✅"}
   ```
3. Capture photos and check console logs:
   ```
   📐 Bounding Box Calculation:
     Aspect ratio: 1.500 (landscape ✅)
   ```
4. Verify final composite shows landscape photos ✅

### For Existing Frames
1. Run migration: `supabase-fix-slot-aspect-ratios.sql`
2. Verify with the included SQL query to check aspect ratios
3. Test photo capture with existing frames
4. Confirm photos render as landscape in final composite

## Files Changed

- `components/admin/FrameUploadModal.tsx` - Load frame dimensions, fix percentage calculations
- `components/camera/CameraPreview.tsx` - Fix aspect ratio calculations
- `lib/imageProcessing.ts` - Enhanced logging
- `supabase-fix-slot-aspect-ratios.sql` - Database migration for existing frames

## Expected Console Output (After Fix)

```
🖼️ Frame image dimensions: 1088 × 3264
📍 Slot 1 conversion:
  percent: "40.00% × 8.89%"
  pixels: "435px × 290px"
  aspectRatio: "1.500"
  orientation: landscape ✅

📸 Photo 1 loaded: 1000 × 667 (ratio: 1.499)
  Slot aspect ratio: 1.500 ✅ LANDSCAPE
  Photo aspect ratio: 1.499 ✅ LANDSCAPE
```

## Key Learning

When working with percentages in web layouts:
- Percentages are **relative to their container dimensions**
- If container aspect ratio ≠ 1:1, percentage aspect ratio ≠ pixel aspect ratio
- Always convert percentages to pixels **before** calculating aspect ratios
- Store percentages that produce correct pixel dimensions, not correct percentage ratios
