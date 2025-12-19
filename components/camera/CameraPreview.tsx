// components/camera/CameraPreview.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/Button';

export interface CameraPreviewProps {
  onCapture: (imageSrc: string) => void;
  photoNumber: number;
  totalPhotos: number;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  onCapture,
  photoNumber,
  totalPhotos,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [mirrored, setMirrored] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const BOUNDING_BOX = {
    width: 600,  // px
    height: 800, // Portrait 3:4 ratio
  };

  const startCountdown = useCallback(() => {
    if (isCapturing) return;
    
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
  }, [isCapturing]);

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef. current.getScreenshot({
        width: BOUNDING_BOX.width,
        height: BOUNDING_BOX. height,
      });

      if (imageSrc) {
        onCapture(imageSrc);
      }
    }
    setIsCapturing(false);
  }, [onCapture]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {/* Webcam */}
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: 'user',
          width: 1920,
          height: 1080,
        }}
        mirrored={mirrored}
        className="w-full h-full object-cover"
      />

      {/* Bounding Box Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Bounding Box */}
        <div
          className="relative border-4 border-white/80 rounded-2xl shadow-2xl"
          style={{
            width:  `${BOUNDING_BOX. width}px`,
            height: `${BOUNDING_BOX.height}px`,
          }}
        >
          {/* Corner decorations */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

          {/* Guide text */}
          <div className="absolute -top-12 left-0 right-0 text-center">
            <p className="text-white text-lg font-semibold drop-shadow-lg">
              Position yourself inside the frame
            </p>
          </div>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Top Info Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent z-10">
        <div className="flex items-center justify-between text-white">
          <div className="text-2xl font-bold">
            Photo {photoNumber} / {totalPhotos}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMirrored(!mirrored)}
            className="text-white hover:bg-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span className="ml-2">{mirrored ? 'Mirrored' : 'Normal'}</span>
          </Button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/70 to-transparent z-10">
        <div className="flex items-center justify-center">
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
        </div>
        <p className="text-white text-center mt-4 text-lg">
          Click to capture with 3 second countdown
        </p>
      </div>
    </div>
  );
};