// components/camera/CameraPreview.tsx
'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/Button';
import { Frame, PhotoSlot } from '@/types';
import { FIXED_SLOT_SIZES } from '@/lib/framePresets';

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

  // 1. KONFIGURASI KAMERA
  const CAMERA_CONTAINER = {
    width: 640,
    height: 480,
  };

  // Target ukuran box di layar (bisa diperbesar/diperkecil)
  const TARGET_BOX_SIZE = 450;

  // 2. LOAD DIMENSI FRAME
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setFrameDimensions({ width: img.width, height: img.height });
      console.log('🖼️ Frame dimensions loaded:', img.width, '×', img.height);
    };
    img.src = frame.cloudinary_url;
  }, [frame.cloudinary_url]);

  // ✅ PERBAIKAN: Hitung Jumlah Foto Real (Agar tombol Next/Finish akurat)
  const actualTotalPhotos = useMemo(() => {
    if (frame.frame_config?.photo_count) {
      return frame.frame_config.photo_count;
    }
    if (frame.photo_slots && frame.photo_slots.length > 0) {
      return frame.photo_slots.length;
    }
    return totalPhotos || 3;
  }, [frame, totalPhotos]);

  // ✅ PERBAIKAN: Hitung Aspect Ratio Frame (Agar preview kanan tidak gepeng)
  const frameAspectRatio = useMemo(() => {
    if (frame.frame_config?.aspect_ratio) {
      return frame.frame_config.aspect_ratio;
    }
    if (frameDimensions && frameDimensions.height > 0) {
      return frameDimensions.width / frameDimensions.height;
    }
    return 2 / 3; // Default fallback
  }, [frame, frameDimensions]);

  // 3. LOGIKA SLOT FOTO (Menentukan posisi slot saat ini)
  const currentSlot = useMemo((): PhotoSlot | null => {
    // Priority 1: Use photo_slots from DB
    if (frame.photo_slots && frame.photo_slots.length > 0) {
      return frame.photo_slots[photoNumber - 1] || null;
    }
    
    // Priority 2: Generate based on config
    if (frame.frame_config) {
      const { photo_count } = frame.frame_config;
      const slotSizeConfig = FIXED_SLOT_SIZES[photo_count as keyof typeof FIXED_SLOT_SIZES] || FIXED_SLOT_SIZES[3];
      const slotWidth = slotSizeConfig.width;
      const slotHeight = slotSizeConfig.height;
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
    
    // Priority 3: Ultimate fallback
    const defaultSlots: PhotoSlot[] = [
      { id: 1, x: 20, y: 10, width: 60, height: 45 },
      { id: 2, x: 20, y: 40, width: 60, height: 45 },
      { id: 3, x: 20, y: 70, width: 60, height: 45 },
    ];
    return defaultSlots[photoNumber - 1] || null;
  }, [frame.photo_slots, frame.frame_config, photoNumber]);

  // 4. LOGIKA BOUNDING BOX (KOTAK HIJAU)
  const boundingBox = useMemo(() => {
    if (!currentSlot || !frameDimensions) {
      return { 
        width: 400, 
        height: 300, 
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        aspectRatio: 4/3,
      };
    }

    // ✅ FORCE 4:3 LANDSCAPE UNTUK SEMUA FOTO
    const FORCE_ASPECT_RATIO = 4 / 3;
    const slotAspectRatio = FORCE_ASPECT_RATIO;

    let boxWidth: number;
    let boxHeight: number;

    if (slotAspectRatio > 1) {
      boxWidth = TARGET_BOX_SIZE;
      boxHeight = TARGET_BOX_SIZE / slotAspectRatio;
    } else {
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

  // 5. TIMER COUNTDOWN
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

  // ✅ 6. FUNGSI CAPTURE PHOTO (PERBAIKAN UTAMA: ANTI GEPENG)
  const capturePhoto = useCallback(() => {
    if (!webcamRef.current || !cameraContainerRef.current || !currentSlot) return;

    try {
      const fullImage = webcamRef.current.getScreenshot();
      if (!fullImage) return;

      const containerWidth = CAMERA_CONTAINER.width;
      const containerHeight = CAMERA_CONTAINER.height;
      
      // Hitung area crop (Green Box)
      const boxCenterX = containerWidth / 2;
      const boxCenterY = containerHeight / 2;
      const cropX = boxCenterX - (boundingBox.width / 2);
      const cropY = boxCenterY - (boundingBox.height / 2);
      const cropWidth = boundingBox.width;
      const cropHeight = boundingBox.height;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Gunakan rasio visual box agar hasil foto sama persis dengan yang dilihat user
      const captureAspectRatio = boundingBox.width / boundingBox.height;
      
      // Resolusi Output Tinggi
      const CAPTURE_WIDTH = 1200; 
      const CAPTURE_HEIGHT = Math.round(CAPTURE_WIDTH / captureAspectRatio);
      
      canvas.width = CAPTURE_WIDTH;
      canvas.height = CAPTURE_HEIGHT;

      console.log('📸 Capture Debug:');
      console.log(' - Visual Box:', boundingBox.width.toFixed(0), 'x', boundingBox.height.toFixed(0));
      console.log(' - Output Canvas:', CAPTURE_WIDTH, 'x', CAPTURE_HEIGHT);

      const img = new Image();
      img.onload = () => {
        const scaleX = img.width / containerWidth;
        const scaleY = img.height / containerHeight;

        // Draw Image: Crop dari Webcam -> Paste ke Canvas Full
        // Karena rasionya sama, gambar TIDAK akan ketarik.
        ctx.drawImage(
          img,
          cropX * scaleX,      // Source X
          cropY * scaleY,      // Source Y
          cropWidth * scaleX,  // Source Width
          cropHeight * scaleY, // Source Height
          0,                   // Dest X
          0,                   // Dest Y
          canvas.width,        // Dest Width
          canvas.height        // Dest Height
        );

        const croppedImage = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(croppedImage);
      };

      img.src = fullImage;
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, currentSlot, boundingBox]);

  // 7. RENDER UI
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 flex gap-6 p-6">
      {/* --- BAGIAN KIRI: CAMERA PREVIEW --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Header Camera */}
        <div className="absolute top-0 left-0 right-0 z-10 mb-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold">
                Photo {photoNumber} / {actualTotalPhotos}
              </h2>
              <p className="text-sm text-gray-300 mt-0.5">Frame: {frame.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMirrored(!mirrored)}
              className="text-white hover:bg-white/20"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {mirrored ? 'Mirrored' : 'Normal'}
            </Button>
          </div>
        </div>

        {/* Container Webcam */}
        <div className="flex flex-col items-center">
          <div 
            ref={cameraContainerRef}
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700" 
            style={{ 
              width: `${CAMERA_CONTAINER.width}px`, 
              height: `${CAMERA_CONTAINER.height}px` 
            }}
          >
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

            {/* Green Bounding Box Overlay */}
            {currentSlot && !currentCapturedPhoto && (
              <>
                {/* Dark overlay with hole */}
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

                {/* Green Border */}
                <div 
                  className="absolute border-4 border-green-400 pointer-events-none z-10 transition-all duration-300 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
                  style={{
                    width: `${boundingBox.width}px`,
                    height: `${boundingBox.height}px`,
                    left: boundingBox.left,
                    top: boundingBox.top,
                    transform: boundingBox.transform,
                  }}
                >
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                  
                  {/* Label Debug (Optional) */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500/80 text-white px-3 py-1 rounded text-xs whitespace-nowrap">
                    4:3 Photo
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

            {/* Captured Indicator */}
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

          {/* Tombol Shutter */}
          {!currentCapturedPhoto && (
            <div className="mt-6">
              <Button
                size="lg"
                onClick={startCountdown}
                disabled={isCapturing}
                className="rounded-full w-20 h-20 p-0 bg-white hover:bg-gray-200 text-gray-900 shadow-2xl transition-transform hover:scale-105 active:scale-95"
              >
                {isCapturing ? (
                  <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full border-4 border-gray-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-500 rounded-full" />
                  </div>
                )}
              </Button>
              <p className="text-white text-center mt-2 text-sm font-medium opacity-80">
                Position yourself in the green box
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- BAGIAN KANAN: FRAME PREVIEW --- */}
      <div className="w-96 flex flex-col justify-center">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-2xl p-6 h-[85vh] flex flex-col">
          <div className="text-center mb-4 flex-shrink-0">
            <h3 className="text-xl font-bold text-gray-900">Preview</h3>
            <p className="text-sm text-gray-600">Your photos with frame</p>
          </div>

          {/* Container Frame Dinamis */}
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-gray-200/50 rounded-xl p-2">
            <div 
              className="relative bg-white shadow-xl transition-all duration-300"
              style={{
                aspectRatio: `${frameAspectRatio}`,
                height: frameAspectRatio < 1 ? '100%' : 'auto',
                width: frameAspectRatio > 1 ? '100%' : 'auto',
                maxHeight: '100%',
                maxWidth: '100%'
              }}
            >
              {/* Layer Foto */}
              <div className="absolute inset-0 overflow-hidden">
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
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                        <span className="text-xs text-gray-400 font-medium">{index + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Layer Frame Image */}
              <img
                src={frame.cloudinary_url}
                alt={frame.name}
                className="relative w-full h-full object-cover pointer-events-none z-10"
              />
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="mt-4 flex-shrink-0">
            {currentCapturedPhoto && (
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onRetake}
                  className="w-full"
                >
                  Retake
                </Button>
                
                {/* Logic Tombol Next / Finish */}
                {photoNumber < actualTotalPhotos ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onNext}
                    className="w-full"
                  >
                    Next Photo
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onFinish}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Finish
                  </Button>
                )}
              </div>
            )}

            {/* Progress Dots */}
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: actualTotalPhotos }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    capturedPhotos[index]
                      ? 'w-8 bg-green-500'
                      : index === photoNumber - 1
                      ? 'w-8 bg-blue-500'
                      : 'w-4 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};