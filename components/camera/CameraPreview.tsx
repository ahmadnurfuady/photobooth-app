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
  
  // State dimensi container untuk kalkulasi capture
  const [containerDims, setContainerDims] = useState({ width: 640, height: 480 });

  // 1. RESPONSIVE LISTENER
  useEffect(() => {
    const updateDimensions = () => {
      if (cameraContainerRef.current) {
        setContainerDims({
          width: cameraContainerRef.current.offsetWidth,
          height: cameraContainerRef.current.offsetHeight
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 2. LOAD FRAME
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setFrameDimensions({ width: img.width, height: img.height });
    };
    img.src = frame.cloudinary_url;
  }, [frame.cloudinary_url]);

  const actualTotalPhotos = useMemo(() => {
    if (frame.frame_config?.photo_count) return frame.frame_config.photo_count;
    if (frame.photo_slots && frame.photo_slots.length > 0) return frame.photo_slots.length;
    return totalPhotos || 3;
  }, [frame, totalPhotos]);

  const frameAspectRatio = useMemo(() => {
    if (frame.frame_config?.aspect_ratio) return frame.frame_config.aspect_ratio;
    if (frameDimensions && frameDimensions.height > 0) return frameDimensions.width / frameDimensions.height;
    return 2 / 3;
  }, [frame, frameDimensions]);

  // 3. LOGIKA POSISI SLOT
  const currentSlot = useMemo((): PhotoSlot | null => {
    if (frame.photo_slots && frame.photo_slots.length > 0) {
      return frame.photo_slots[photoNumber - 1] || null;
    }
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
    return null;
  }, [frame, photoNumber]);

  // 4. LOGIKA BOUNDING BOX (KOTAK HIJAU)
  const boundingBox = useMemo(() => {
    if (!currentSlot || !frameDimensions) {
      return { width: 300, height: 225, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', aspectRatio: 4/3 };
    }
    const FORCE_ASPECT_RATIO = 4 / 3;
    const slotAspectRatio = FORCE_ASPECT_RATIO;
    
    // Ukuran dinamis (75% dari container)
    const targetBoxSize = containerDims.width * 0.75; 

    let boxWidth, boxHeight;
    if (slotAspectRatio > 1) {
      boxWidth = targetBoxSize;
      boxHeight = targetBoxSize / slotAspectRatio;
    } else {
      boxHeight = targetBoxSize;
      boxWidth = targetBoxSize * slotAspectRatio;
    }

    return {
      width: boxWidth,
      height: boxHeight,
      aspectRatio: slotAspectRatio,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }, [currentSlot, frameDimensions, containerDims.width]);

  // 5. COUNTDOWN
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

  // 6. FUNGSI CAPTURE (SMART OFFSET FIX)
  const capturePhoto = useCallback(() => {
    if (!webcamRef.current || !cameraContainerRef.current || !currentSlot) return;

    try {
      const fullImage = webcamRef.current.getScreenshot();
      if (!fullImage) return;

      const contW = containerDims.width;
      const contH = containerDims.height;
      const boxW = boundingBox.width;
      const boxH = boundingBox.height;
      const boxLeft = (contW - boxW) / 2;
      const boxTop = (contH - boxH) / 2;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const captureRatio = boxW / boxH;
      canvas.width = 1200; 
      canvas.height = Math.round(canvas.width / captureRatio);

      const img = new Image();
      img.onload = () => {
        const imgW = img.width;
        const imgH = img.height;
        const imgRatio = imgW / imgH;
        const contRatio = contW / contH;

        let renderW, renderH, offsetX, offsetY;

        if (contRatio > imgRatio) {
          renderW = contW;
          renderH = contW / imgRatio;
          offsetX = 0;
          offsetY = (renderH - contH) / 2;
        } else {
          renderH = contH;
          renderW = contH * imgRatio;
          offsetX = (renderW - contW) / 2;
          offsetY = 0;
        }

        const scale = imgW / renderW;
        const sourceX = (offsetX + boxLeft) * scale;
        const sourceY = (offsetY + boxTop) * scale;
        const sourceW = boxW * scale;
        const sourceH = boxH * scale;

        ctx.drawImage(
          img,
          sourceX, sourceY, sourceW, sourceH,
          0, 0, canvas.width, canvas.height
        );
        onCapture(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = fullImage;
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, currentSlot, boundingBox, containerDims]);

  // 7. RENDER UI (PREMIUM THEME MATCHING LANDING PAGE)
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-hidden relative font-sans text-slate-100">
      
      {/* --- BACKGROUND GLOW EFFECTS (Konsisten dengan Landing Page) --- */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* --- BAGIAN KIRI: CAMERA PREVIEW --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 z-10">
        
        {/* HEADER */}
        <div className="w-full max-w-2xl flex items-center justify-between text-slate-100 mb-2 shrink-0">
          <div>
            <h2 className="text-lg lg:text-xl font-bold tracking-tight">
              Photo {photoNumber} / {actualTotalPhotos}
            </h2>
            <p className="text-xs text-slate-400">Frame: {frame.name}</p>
          </div>

          <button
            onClick={() => setMirrored(!mirrored)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 transition-all text-xs lg:text-sm font-medium backdrop-blur-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {mirrored ? 'Mirrored' : 'Normal'}
          </button>
        </div>

        {/* CONTAINER WEBCAM RESPONSIVE */}
        <div 
          ref={cameraContainerRef}
          className="relative w-full max-w-2xl aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10 border-[3px] border-slate-800/50"
        >
          <div className="absolute inset-0">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
              mirrored={mirrored}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Green Bounding Box Overlay */}
          {currentSlot && !currentCapturedPhoto && (
            <>
              {/* Overlay Gelap */}
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

              {/* Garis Hijau Neon */}
              <div 
                className="absolute border-4 border-green-500 pointer-events-none z-10 shadow-[0_0_30px_rgba(34,197,94,0.6)]"
                style={{
                  width: `${boundingBox.width}px`,
                  height: `${boundingBox.height}px`,
                  left: boundingBox.left,
                  top: boundingBox.top,
                  transform: boundingBox.transform,
                }}
              >
                {/* Hiasan Sudut */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400" />
              </div>
            </>
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
              <div className="text-white text-8xl lg:text-9xl font-extrabold animate-pulse drop-shadow-lg">{countdown}</div>
            </div>
          )}

          {/* Captured Notification */}
          {currentCapturedPhoto && (
            <div className="absolute top-4 left-0 right-0 text-center z-20">
              <span className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-green-500/30 inline-flex items-center gap-2">
                Photo Captured!
              </span>
            </div>
          )}
        </div>

        {/* CONTROL AREA */}
        <div className="w-full flex flex-col items-center justify-center min-h-[100px] mt-2 shrink-0">
          {!currentCapturedPhoto && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Button
                size="lg"
                onClick={startCountdown}
                disabled={isCapturing}
                className="rounded-full w-16 h-16 lg:w-20 lg:h-20 p-0 bg-white hover:bg-slate-200 text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)] transition-transform hover:scale-105 active:scale-95"
              >
                {isCapturing ? (
                  <div className="animate-spin w-8 h-8 lg:w-10 lg:h-10 border-4 border-slate-300 border-t-blue-600 rounded-full" />
                ) : (
                  <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-[4px] border-slate-300 flex items-center justify-center group-hover:border-slate-400">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-500 rounded-full shadow-inner" />
                  </div>
                )}
              </Button>
              <p className="text-slate-200 text-center text-xs lg:text-sm font-medium bg-slate-900/50 px-4 py-1.5 rounded-full backdrop-blur-md border border-slate-800">
                Position yourself inside the box
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- BAGIAN KANAN: FRAME PREVIEW (GLASSMORPHISM CARD) --- */}
      <div className="hidden lg:flex w-80 lg:w-96 flex-col justify-center shrink-0 z-10">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-2xl p-6 h-[85vh] flex flex-col border border-slate-800/60">
          <div className="text-center mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-white tracking-tight">Live Preview</h3>
            <p className="text-xs text-slate-400">Your photos fit into the frame</p>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-950/50 rounded-2xl p-4 border border-slate-800 inner-shadow">
            <div 
              className="relative bg-white shadow-lg transition-all duration-300"
              style={{
                aspectRatio: `${frameAspectRatio}`,
                height: frameAspectRatio < 1 ? '100%' : 'auto',
                width: frameAspectRatio > 1 ? '100%' : 'auto',
                maxHeight: '100%',
                maxWidth: '100%'
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
                {frame.photo_slots?.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="absolute transition-all duration-500"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      width: `${slot.width}%`,
                      height: `${slot.height}%`,
                    }}
                  >
                    {capturedPhotos[index] && (
                      <img 
                        src={capturedPhotos[index]!} 
                        alt={`Photo ${index + 1}`} 
                        className="w-full h-full object-cover animate-in zoom-in duration-300"
                      />
                    )}
                  </div>
                ))}
              </div>
              <img src={frame.cloudinary_url} alt={frame.name} className="relative w-full h-full object-cover pointer-events-none z-10" />
            </div>
          </div>

          <div className="mt-6 flex-shrink-0">
            {currentCapturedPhoto && (
              <div className="space-y-3 animate-in slide-in-from-bottom-2">
                <Button variant="secondary" onClick={onRetake} className="w-full border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white shadow-sm">
                  Retake Photo
                </Button>
                {photoNumber < actualTotalPhotos ? (
                  <Button variant="primary" onClick={onNext} className="w-full shadow-lg shadow-blue-900/20 bg-blue-600 hover:bg-blue-700 text-white">
                    Next Photo
                  </Button>
                ) : (
                  <Button variant="primary" onClick={onFinish} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/20">
                    Finish Session
                  </Button>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: actualTotalPhotos }).map((_, index) => (
                <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${capturedPhotos[index] ? 'w-8 bg-green-500' : index === photoNumber - 1 ? 'w-8 bg-blue-500' : 'w-1.5 bg-slate-700'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};