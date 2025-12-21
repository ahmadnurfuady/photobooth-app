// components/camera/CameraPreview.tsx
'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/Button';
import { Frame, PhotoSlot } from '@/types';

export interface CameraPreviewProps {
  onCapture: (imageSrc: string) => void;
  onRetake: () => void;
  onNext: () => void;
  onFinish: () => void;
  photoNumber: number;
  totalPhotos: number;
  frame: Frame;
  capturedPhotos: (string | null)[];
  currentCapturedPhoto: string | null;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  onCapture,
  onRetake,
  onNext,
  onFinish,
  photoNumber,
  totalPhotos,
  frame,
  capturedPhotos,
  currentCapturedPhoto,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const [mirrored, setMirrored] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [frameDimensions, setFrameDimensions] = useState<{ width: number; height: number } | null>(null);

  // Camera container dimensions
  const CAMERA_CONTAINER = {
    width: 640,
    height: 480,
  };

  // Target bounding box size (adjust to make bigger/smaller)
  const TARGET_BOX_SIZE = 450;

  // Fixed slot sizes based on photo count (% of frame) - 4:3 aspect ratio
  const SLOT_SIZE_BY_COUNT: Record<number, { widthPercent: number; heightPercent: number }> = {
    1: { widthPercent: 70, heightPercent: 52.5 },  // 4:3 ratio
    2: { widthPercent: 65, heightPercent: 48.75 },
    3: { widthPercent: 60, heightPercent: 45 },
    4: { widthPercent: 55, heightPercent: 41.25 },
  };

  // Load frame dimensions from image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setFrameDimensions({ width: img.width, height: img.height });
      console.log('🖼️ Frame dimensions loaded:', img.width, '×', img.height);
    };
    img.src = frame.cloudinary_url;
  }, [frame.cloudinary_url]);

  // Get current photo slot (based on photoNumber)
  const currentSlot = useMemo((): PhotoSlot | null => {
    // If photo_slots exist, use them
    if (frame.photo_slots && frame.photo_slots.length > 0) {
      return frame.photo_slots[photoNumber - 1] || null;
    }
    
    // Generate default slots based on frame_config if available
    if (frame.frame_config) {
      const { photo_count } = frame.frame_config;
      const slotSizeConfig = SLOT_SIZE_BY_COUNT[photo_count] || SLOT_SIZE_BY_COUNT[3];
      const slotWidth = slotSizeConfig.widthPercent;
      const slotHeight = slotSizeConfig.heightPercent;
      const gap = 5;
      const defaultSlots: PhotoSlot[] = [];
      
      for (let i = 0; i < photo_count; i++) {
        defaultSlots.push({
          id: i + 1,
          x: (100 - slotWidth) / 2,
          y: 10 + i * (slotHeight + gap),
          width: slotWidth,
          height: slotHeight,
        });
      }
      return defaultSlots[photoNumber - 1] || null;
    }
    
    // Ultimate fallback - assume 3 photos with 4:3 aspect ratio
    const defaultSlots: PhotoSlot[] = [
      { id: 1, x: 20, y: 10, width: 60, height: 45 },  // 4:3 aspect ratio
      { id: 2, x: 20, y: 40, width: 60, height: 45 },
      { id: 3, x: 20, y: 70, width: 60, height: 45 },
    ];
    return defaultSlots[photoNumber - 1] || null;
  }, [frame.photo_slots, frame.frame_config, photoNumber, SLOT_SIZE_BY_COUNT]);

  // Calculate centered bounding box with CORRECT aspect ratio from admin slot
  const boundingBox = useMemo(() => {
    if (!currentSlot || !frameDimensions) {
      return { 
        width: 400, 
        height: 300,  // 400/300 = 4/3
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        aspectRatio: 4/3,
      };
    }

    // ✅ FORCE 4:3 LANDSCAPE FOR ALL PHOTOS
    const FORCE_ASPECT_RATIO = 4 / 3;
    const slotAspectRatio = FORCE_ASPECT_RATIO;

    // Calculate box dimensions maintaining CORRECT aspect ratio
    let boxWidth: number;
    let boxHeight: number;

    if (slotAspectRatio > 1) {
      // Landscape (wider than tall)
      boxWidth = TARGET_BOX_SIZE;
      boxHeight = TARGET_BOX_SIZE / slotAspectRatio;
    } else {
      // Portrait (taller than wide)
      boxHeight = TARGET_BOX_SIZE;
      boxWidth = TARGET_BOX_SIZE * slotAspectRatio;
    }

    return {
      width: boxWidth,
      height: boxHeight,
      aspectRatio: slotAspectRatio,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }, [currentSlot, frameDimensions]);

  const startCountdown = useCallback(() => {
    if (isCapturing || currentCapturedPhoto) return;
    
    setIsCapturing(true);
    let count = 3;
    setCountdown(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        setCountdown(null);
        clearInterval(interval);
        capturePhoto();
      }
    }, 1000);
  }, [isCapturing, currentCapturedPhoto]);

  const capturePhoto = useCallback(() => {
    if (! webcamRef.current || !  cameraContainerRef.current || ! currentSlot) return;

    try {
      // Get full webcam screenshot
      const fullImage = webcamRef.current.getScreenshot();
      
      if (!fullImage) return;

      // Container dimensions
      const containerWidth = CAMERA_CONTAINER. width;
      const containerHeight = CAMERA_CONTAINER.height;

      // Green box is centered
      const boxCenterX = containerWidth / 2;
      const boxCenterY = containerHeight / 2;
      
      // Calculate crop area (area inside green box)
      const cropX = boxCenterX - (boundingBox.width / 2);
      const cropY = boxCenterY - (boundingBox.height / 2);
      const cropWidth = boundingBox.width;
      const cropHeight = boundingBox.height;

      // Create canvas with EXACT aspect ratio from admin slot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // ✅ CRITICAL FIX:   Use slot aspect ratio to set canvas dimensions
      // This ensures captured image has SAME aspect ratio as slot
      // ✅ CRITICAL FIX: Calculate aspect ratio from pixels, not percentages
      // We need to know frame dimensions to calculate correct aspect ratio
      const FRAME_WIDTH = frameDimensions?.width || 1088;  // Fallback to typical frame size
      const FRAME_HEIGHT = frameDimensions?.height || 3264;
      
      const slotPixelWidth = (currentSlot.width / 100) * FRAME_WIDTH;
      const slotPixelHeight = (currentSlot.height / 100) * FRAME_HEIGHT;
      const slotAspectRatio = slotPixelWidth / slotPixelHeight;
      
      // Set canvas width based on quality, height based on aspect ratio
      const CAPTURE_WIDTH = 1000;  // Good quality
      const CAPTURE_HEIGHT = Math.round(CAPTURE_WIDTH / slotAspectRatio);
      
      canvas.width = CAPTURE_WIDTH;
      canvas.height = CAPTURE_HEIGHT;

      console.log('📸 Capture Info: ');
      console.log('  Slot:  ', currentSlot.width, '% ×', currentSlot.height, '%');
      console.log('  Frame dimensions:', FRAME_WIDTH, '×', FRAME_HEIGHT);
      console.log('  Slot pixels:', slotPixelWidth.toFixed(0), '×', slotPixelHeight.toFixed(0));
      console.log('  Slot Aspect Ratio:', slotAspectRatio.toFixed(3));
      console.log('  Green Box:', cropWidth.toFixed(0), '×', cropHeight.toFixed(0), 'px');
      console.log('  Canvas:', canvas.width, '×', canvas.height);
      console.log('  Canvas Aspect Ratio:', (canvas.width / canvas.height).toFixed(3));
      console.log('  Match:', Math.abs(slotAspectRatio - (canvas.width / canvas.height)) < 0.01 ? 'YES' : 'NO - MISMATCH!');

      // Load full webcam image
      const img = new Image();
      img.onload = () => {
        // Calculate scale from webcam resolution to container
        const scaleX = img.width / containerWidth;
        const scaleY = img.height / containerHeight;

        // Draw the area inside green box to canvas
        // Scale it to fit canvas while maintaining aspect ratio
        ctx.drawImage(
          img,
          cropX * scaleX,       // Source X (green box left edge)
          cropY * scaleY,       // Source Y (green box top edge)
          cropWidth * scaleX,   // Source Width (green box width)
          cropHeight * scaleY,  // Source Height (green box height)
          0,                    // Destination X
          0,                    // Destination Y
          canvas.width,         // Destination Width (stretch to canvas)
          canvas.height         // Destination Height (stretch to canvas)
        );

        // Convert to base64
        const croppedImage = canvas.toDataURL('image/jpeg', 0.92);
        
        console.log('Photo captured successfully');
        console.log('  Final aspect ratio:', (canvas.width / canvas.height).toFixed(3));
        console.log('  Expected:', slotAspectRatio.toFixed(3));
        console.log('  Difference:', Math.abs(slotAspectRatio - (canvas.width / canvas.height)).toFixed(4));
        
        onCapture(croppedImage);
      };

      img.src = fullImage;
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, currentSlot, boundingBox]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 flex gap-6 p-6">
      {/* LEFT: Camera Preview */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 mb-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold">Photo {photoNumber} / {totalPhotos}</h2>
              <p className="text-sm text-gray-300 mt-0.5">Frame: {frame.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMirrored(!mirrored)}
              className="text-white hover:bg-white/20"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              {mirrored ? 'Mirrored' : 'Normal'}
            </Button>
          </div>
        </div>

        {/* Camera Container */}
        <div className="flex flex-col items-center">
          <div 
            ref={cameraContainerRef}
            className="relative bg-black rounded-2xl overflow-hidden" 
            style={{ 
              width: `${CAMERA_CONTAINER.width}px`, 
              height: `${CAMERA_CONTAINER.height}px` 
            }}
          >
            {/* Webcam */}
            <div className="absolute inset-0">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: 'user',
                  width: 1280,
                  height: 720,
                }}
                mirrored={mirrored}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>

            {/* Green Bounding Box with Correct Aspect Ratio */}
            {currentSlot && !currentCapturedPhoto && (
              <>
                {/* Dark overlay outside box */}
                <div className="absolute inset-0 pointer-events-none z-[9]">
                  <div 
                    className="absolute inset-0 bg-black/60" 
                    style={{
                      clipPath: `polygon(
                        0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                        calc(50% - ${boundingBox.width / 2}px) calc(50% - ${boundingBox.height / 2}px),
                        calc(50% - ${boundingBox.width / 2}px) calc(50% + ${boundingBox.height / 2}px),
                        calc(50% + ${boundingBox.width / 2}px) calc(50% + ${boundingBox.height / 2}px),
                        calc(50% + ${boundingBox.width / 2}px) calc(50% - ${boundingBox.height / 2}px),
                        calc(50% - ${boundingBox.width / 2}px) calc(50% - ${boundingBox.height / 2}px)
                      )`
                    }}
                  />
                </div>

                {/* Green box border */}
                <div 
                  className="absolute border-4 border-green-400 pointer-events-none z-10 transition-all duration-300"
                  style={{
                    width: `${boundingBox.width}px`,
                    height: `${boundingBox.height}px`,
                    left: boundingBox.left,
                    top: boundingBox.top,
                    transform: boundingBox.transform,
                  }}
                >
                  {/* Corner markers */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                  
                  {/* Debug label */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-green-400 text-black px-4 py-2 rounded-lg text-xs font-bold shadow-lg whitespace-nowrap">
                    📸 Photo {photoNumber} | Ratio: {boundingBox.aspectRatio?.toFixed(3)} | {boundingBox.width.toFixed(0)}×{boundingBox.height.toFixed(0)}px
                  </div>

                  {/* Grid lines for alignment */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Vertical center line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-green-400/30" />
                    {/* Horizontal center line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-400/30" />
                  </div>
                </div>
              </>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
                <div className="text-white text-9xl font-bold animate-pulse">
                  {countdown}
                </div>
              </div>
            )}

            {/* Captured indicator */}
            {currentCapturedPhoto && (
              <div className="absolute top-4 left-0 right-0 text-center z-20">
                <span className="bg-green-500 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Photo Captured!
                </span>
              </div>
            )}
          </div>

          {/* Capture Button */}
          {!currentCapturedPhoto && (
            <div className="mt-6">
              <Button
                size="lg"
                onClick={startCountdown}
                disabled={isCapturing}
                className="rounded-full w-20 h-20 p-0 bg-white hover:bg-gray-200 text-gray-900 shadow-2xl"
              >
                {isCapturing ? (
                  <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
                ) : (
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" />
                  </svg>
                )}
              </Button>
              <p className="text-white text-center mt-2 text-sm font-medium">
                Position yourself in the green box
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Frame Preview */}
      <div className="w-80 flex flex-col justify-center">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-2xl p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Preview</h3>
            <p className="text-sm text-gray-600">Your photos with frame</p>
          </div>

          {/* Frame with Dynamic Photo Slots */}
          <div className="relative bg-white rounded-xl shadow-lg p-4">
            <div className="relative" style={{ aspectRatio: '2/3' }}>
              
              {/* LAYER 1: Photos */}
              <div className="absolute inset-0">
                {frame.photo_slots?.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="absolute"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      width: `${slot.width}%`,
                      height: `${slot.height}%`,
                    }}
                  >
                    {capturedPhotos[index] ? (
                      <img 
                        src={capturedPhotos[index]!} 
                        alt={`Photo ${index + 1}`} 
                        className="w-full h-full object-cover rounded-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-sm flex items-center justify-center border-2 border-dashed border-gray-300">
                        <div className="text-center text-gray-400">
                          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-[10px] font-medium">{index + 1}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* LAYER 2: Frame */}
              <img
                src={frame.cloudinary_url}
                alt={frame.name}
                className="relative w-full h-full object-contain pointer-events-none z-10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {currentCapturedPhoto && (
            <div className="mt-4 space-y-3">
              <Button
                variant="secondary"
                size="md"
                onClick={onRetake}
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retake
              </Button>
              
              {photoNumber < totalPhotos ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onNext}
                  className="w-full"
                >
                  Next Photo
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onFinish}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finish
                </Button>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: totalPhotos }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  capturedPhotos[index]
                    ? 'w-12 bg-green-500'
                    : index === photoNumber - 1
                    ? 'w-12 bg-blue-500'
                    : 'w-8 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};