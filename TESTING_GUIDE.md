# Testing Guide: Fixed 4:3 Aspect Ratio Implementation

## How to Test the Changes

### Prerequisites
- Deploy the application to an environment with internet access (for Next.js build)
- Have admin credentials ready
- Have a test frame image ready (PNG/JPG)

## Test 1: Admin Frame Editor - Fixed Size Slots

### Steps:
1. Navigate to `/admin/login`
2. Log in with admin credentials
3. Go to the Frames management page
4. Click "Upload New Frame" or similar button
5. Enter a frame name (e.g., "Test Frame 4:3")
6. Select photo count (try 1, 2, 3, or 4 photos)
7. Upload a frame image
8. Click "Next: Position Slots"

### Expected Results:
✅ **Fixed Sizing:**
- Green slot boxes appear with fixed sizes
- Label shows "Photo 1 | Ratio: 1.33 (FIXED)"
- **NO resize handle** visible on slots (no small square in bottom-right corner)

✅ **Dragging Only:**
- You can drag slots to reposition them
- You **CANNOT** resize the slots
- Cursor changes to "move" cursor when hovering over slots

✅ **Instructions:**
- Instructions text says: "Slot sizes are FIXED at 4:3 aspect ratio - only position can be adjusted"

✅ **Different Photo Counts:**
- 1 photo: Larger slots (70% × 52.5%)
- 2 photos: Medium-large slots (65% × 48.75%)
- 3 photos: Medium slots (60% × 45%)
- 4 photos: Smaller slots (55% × 41.25%)

### Screenshots to Take:
- Screenshot of 3-photo layout showing fixed slots
- Screenshot showing NO resize handle
- Screenshot of slot info panel showing "Ratio: 1.33 (FIXED)"

## Test 2: Camera Preview - 4:3 Bounding Box

### Steps:
1. Go to the main app (non-admin side)
2. Select the frame you created
3. Start the photo session
4. Look at the green bounding box in the camera preview

### Expected Results:
✅ **Bounding Box:**
- Green box is landscape orientation (wider than tall)
- Aspect ratio label shows ~1.333 (4:3)
- Box dimensions shown in label: e.g., "450px × 337px"

✅ **Multiple Photos:**
- Each photo in the sequence should have the same 4:3 bounding box
- Position may differ based on admin slot configuration
- Size should be consistent

### Screenshots to Take:
- Camera view with green 4:3 bounding box visible
- Label showing aspect ratio

## Test 3: Final Composite - Photos in Frame

### Steps:
1. Complete all photos in the session (e.g., 3 photos)
2. View the final composite result
3. Check the photos within the frame

### Expected Results:
✅ **Photo Aspect Ratios:**
- All photos appear as 4:3 landscape rectangles
- No distortion or stretching
- Photos fill their slots correctly

✅ **Frame Overlay:**
- Frame overlays correctly on top
- Photos visible through frame cutouts
- No gaps or overflow

### Screenshots to Take:
- Final composite image with all photos in frame
- Close-up of individual photo slots showing 4:3 ratio

## Test 4: Admin Authentication

### Steps:
1. Log out of admin (if logged in)
2. Try to access `/admin/dashboard` directly
3. Try to access `/admin/frames` directly

### Expected Results:
✅ **Protected Routes:**
- Automatically redirected to `/admin/login`
- Cannot access admin pages without authentication

✅ **Login:**
- Login page appears with email/password fields
- After successful login, redirected to admin dashboard

✅ **Logout:**
- "Sign Out" button works
- After logout, redirected to login page

## Console Verification

### Admin Editor Console Output:
When saving a frame, look for console logs like:
```
💾 Saving frame data (positions only):
  Slot 1: { position: "20.0%, 15.0%", fixedSize: "60.0% × 45.0%", aspectRatio: "1.333", ... }
  Slot 2: { position: "20.0%, 45.0%", fixedSize: "60.0% × 45.0%", aspectRatio: "1.333", ... }
  ...
```

### Camera Preview Console Output:
Look for:
```
📸 Camera canvas (4:3): { dimensions: "1000 × 750", ratio: "1.333", expected: "1.333" }
```

### Composite Generation Console Output:
Look for:
```
📍 Slot 1 (from photo_count=3): { 
  position: "20.0%, 15.0%", 
  dimensions: "653px × 490px", 
  aspectRatio: "1.333", 
  expected: "1.333", 
  match: "✅" 
}
```

## Known Issues

### Build Error (Expected)
⚠️ The Next.js build will fail in environments without internet access due to Google Fonts being blocked. This is expected and does not affect the functionality in production environments with internet access.

Error message:
```
Failed to fetch `Inter` from Google Fonts.
```

**Solution:** Deploy to an environment with internet access (e.g., Vercel, Netlify, AWS, etc.)

## Success Criteria

All of the following must be true for the implementation to be considered successful:

- [ ] Admin editor shows fixed-size slots (no resize handles)
- [ ] Admin can only drag slots (not resize)
- [ ] Slot labels show "Ratio: 1.33 (FIXED)"
- [ ] Camera bounding box is 4:3 landscape (aspect ratio ~1.333)
- [ ] Final composite photos are 4:3 landscape (no distortion)
- [ ] Different photo counts use appropriately sized slots
- [ ] Admin routes require authentication
- [ ] Login/logout functionality works
- [ ] Console logs show correct aspect ratios (1.333)

## Troubleshooting

### If slots still show resize handles:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check that changes are deployed

### If aspect ratios are wrong:
- Check console for slot dimension calculations
- Verify `FIXED_SLOT_SIZES` is being imported correctly
- Check that old frame data isn't cached

### If admin routes aren't protected:
- Check that you're on the correct environment
- Verify Firebase auth is configured
- Check browser console for auth errors

## Reporting Results

Please report:
1. Screenshots of each test scenario
2. Any console errors or warnings
3. Whether success criteria are met
4. Any unexpected behavior
5. Browser and device used for testing
