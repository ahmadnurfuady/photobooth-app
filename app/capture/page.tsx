// app/capture/page. tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { PhotoReview } from '@/components/camera/PhotoReview';
import { LoadingOverlay } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

type CaptureState = 'camera' | 'review' | 'processing';

export default function CapturePage() {
  const router = useRouter();
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [state, setState] = useState<CaptureState>('camera');
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentCapturedPhoto, setCurrentCapturedPhoto] = useState<string | null>(null);

  const TOTAL_PHOTOS = 3;

  useEffect(() => {
    // Get selected frame from sessionStorage
    const frameData = sessionStorage.getItem('selectedFrame');
    if (!frameData) {
      toast.error('No frame selected.  Please select a frame first.');
      router.push('/camera');
      return;
    }

    try {
      const frame = JSON.parse(frameData) as Frame;
      setSelectedFrame(frame);
    } catch (error) {
      console.error('Error parsing frame data:', error);
      toast.error('Invalid frame data');
      router.push('/camera');
    }
  }, [router]);

  const handleCapture = (imageSrc: string) => {
    setCurrentCapturedPhoto(imageSrc);
    setState('review');
  };

  const handleRetake = () => {
    setCurrentCapturedPhoto(null);
    setState('camera');
  };

  const handleNext = () => {
    if (!currentCapturedPhoto) return;

    // Save photo
    const newPhotos = [...photos, currentCapturedPhoto];
    setPhotos(newPhotos);

    // Check if this was the last photo
    if (currentPhotoIndex + 1 >= TOTAL_PHOTOS) {
      // All photos captured, process them
      processPhotos(newPhotos);
    } else {
      // Move to next photo
      setCurrentPhotoIndex(currentPhotoIndex + 1);
      setCurrentCapturedPhoto(null);
      setState('camera');
    }
  };

  const processPhotos = async (capturedPhotos: string[]) => {
    setState('processing');

    try {
      // Store photos and frame in sessionStorage for processing page
      sessionStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
      sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));

      // Navigate to processing/result page
      router.push('/result');
    } catch (error) {
      console.error('Error processing photos:', error);
      toast.error('Failed to process photos');
      setState('camera');
    }
  };

  if (! selectedFrame) {
    return <LoadingOverlay message="Loading..." />;
  }

  if (state === 'processing') {
    return <LoadingOverlay message="Processing your photos...  🎨" />;
  }

  if (state === 'review' && currentCapturedPhoto) {
    return (
      <PhotoReview
        imageSrc={currentCapturedPhoto}
        photoNumber={currentPhotoIndex + 1}
        totalPhotos={TOTAL_PHOTOS}
        onRetake={handleRetake}
        onNext={handleNext}
      />
    );
  }

  return (
    <div className="h-screen w-screen">
      <CameraPreview
        onCapture={handleCapture}
        photoNumber={currentPhotoIndex + 1}
        totalPhotos={TOTAL_PHOTOS}
      />
    </div>
  );
}