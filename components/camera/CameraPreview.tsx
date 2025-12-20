// components/camera/CameraPreview.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/Button';
import { Frame } from '@/types';

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

export const CameraPreview: React. FC<CameraPreviewProps> = ({
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
  const [mirrored, setMirrored] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const BOUNDING_BOX = {
    width: 500,
    height: 400,
  };

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
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot({
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
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 flex gap-6 p-6">
      {/* LEFT:  Camera Preview (70%) */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 mb-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold">Photo {photoNumber} / {totalPhotos}</h2>
              <p className="text-sm text-gray-300 mt-0.5">Frame:  {frame.name}</p>
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

        {/* Camera Container - FIXED SIZE */}
        <div className="flex flex-col items-center">
          {/* Camera with Bounding Box - FIXED:  Use relative positioning inside fixed box */}
          <div 
            className="relative bg-black rounded-2xl overflow-hidden" 
            style={{ width: `${BOUNDING_BOX. width}px`, height: `${BOUNDING_BOX.height}px` }}
          >
            {/* Webcam - FIXED: Position absolute with object-cover BUT inside fixed container */}
            <div className="absolute inset-0 flex items-center justify-center">
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

            {/* Bounding Box Border */}
            <div className="absolute inset-0 border-4 border-white/80 rounded-2xl pointer-events-none z-10">
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>

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
              <p className="text-white text-center mt-2 text-sm">
                Click to capture
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Frame Preview with Photo Slots (Compact) */}
      <div className="w-60 flex flex-col justify-center">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-3">
            <h3 className="text-lg font-bold text-gray-900">Preview</h3>
            <p className="text-xs text-gray-600">Your photos with frame</p>
          </div>

          {/* Frame with 3 Photo Slots - Compact */}
          
            <div className="relative">
              {/* Frame Image */}
                        {/* Frame with 3 Photo Slots - Compact */}
              <div className="relative bg-white rounded-xl shadow-lg p-7">
                <div className="relative">
                  
                  {/* LAYER 1 (Behind): Photo Slots */}
                  <div className="absolute inset-0 p-[8%] flex flex-col gap-[3%]">
                    {/* Slot 1 - Top */}
                    <div className="flex-1 bg-gray-200 rounded overflow-hidden border-2 border-gray-300">
                      {capturedPhotos[0] ?  (
                        <img src={capturedPhotos[0]} alt="Photo 1" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-[10px]">Photo 1</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Slot 2 - Middle */}
                    <div className="flex-1 bg-gray-200 rounded overflow-hidden border-2 border-gray-300">
                      {capturedPhotos[1] ? (
                        <img src={capturedPhotos[1]} alt="Photo 2" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l. 812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-[10px]">Photo 2</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Slot 3 - Bottom */}
                    <div className="flex-1 bg-gray-200 rounded overflow-hidden border-2 border-gray-300">
                      {capturedPhotos[2] ? (
                        <img src={capturedPhotos[2]} alt="Photo 3" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <svg className="w-6 h-6 mx-auto mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h. 93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-[10px]">Photo 3</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LAYER 2 (On Top): Frame Image */}
                  <img
                    src={frame.cloudinary_url}
                    alt={frame.name}
                    className="relative w-full h-auto pointer-events-none z-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Show only after photo is captured */}
          {currentCapturedPhoto && (
            <div className="mt-4 space-y-2">
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
              
              {photoNumber < totalPhotos ?  (
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
          <div className="mt-3 flex justify-center gap-1. 5">
            {Array.from({ length: totalPhotos }).map((_, index) => (
              <div
                key={index}
                className={`h-1. 5 rounded-full transition-all ${
                  capturedPhotos[index]
                    ? 'w-10 bg-green-500'
                    : index === photoNumber - 1
                    ?  'w-10 bg-blue-500'
                    :  'w-6 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    
  );
};