// app/capture/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { LoadingOverlay } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function CapturePage() {
  const router = useRouter();
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([]); 
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentCapturedPhoto, setCurrentCapturedPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Load Frame & Initialize Slots
  useEffect(() => {
    const frameData = sessionStorage.getItem('selectedFrame');
    if (!frameData) {
      toast.error('No frame selected. Please select a frame first.');
      router.push('/camera');
      return;
    }

    try {
      const frame = JSON.parse(frameData) as Frame;
      setSelectedFrame(frame);

      // ✅ PERBAIKAN LOGIKA (Typescript Safe)
      // Cek apakah photo_slots ada DAN panjangnya > 0
      const hasSlots = frame.photo_slots && frame.photo_slots.length > 0;
      
      const requiredPhotoCount = 
        frame.frame_config?.photo_count || 
        (hasSlots ? frame.photo_slots!.length : 3);

      // Reset array photos sesuai jumlah yang dibutuhkan
      setPhotos(new Array(requiredPhotoCount).fill(null));

    } catch (error) {
      console.error('Error parsing frame data:', error);
      toast.error('Invalid frame data');
      router.push('/camera');
    }
  }, [router]);

  const handleCapture = (imageSrc: string) => {
    setCurrentCapturedPhoto(imageSrc);
    
    // Update photos array
    const newPhotos = [...photos];
    newPhotos[currentPhotoIndex] = imageSrc;
    setPhotos(newPhotos);
  };

  const handleRetake = () => {
    // Clear current photo
    setCurrentCapturedPhoto(null);
    const newPhotos = [...photos];
    newPhotos[currentPhotoIndex] = null;
    setPhotos(newPhotos);
  };

  const handleNext = () => {
    if (!currentCapturedPhoto) return;

    // Move to next photo
    setCurrentPhotoIndex(currentPhotoIndex + 1);
    setCurrentCapturedPhoto(null);
  };

  const handleFinish = async () => {
    if (!currentCapturedPhoto || !selectedFrame) return;

    setProcessing(true);

    try {
      // ✅ PERBAIKAN LOGIKA (Typescript Safe)
      // Sama seperti di atas, kita pastikan pengecekan null safety
      const hasSlots = selectedFrame.photo_slots && selectedFrame.photo_slots.length > 0;

      const requiredPhotoCount = 
        selectedFrame.frame_config?.photo_count || 
        (hasSlots ? selectedFrame.photo_slots!.length : 3);

      // Filter foto yang sudah diambil (tidak null)
      const capturedPhotos = photos.filter(p => p !== null) as string[];
      
      // Validasi jumlah foto
      if (capturedPhotos.length !== requiredPhotoCount) {
        toast.error(`Please capture all ${requiredPhotoCount} photos`);
        setProcessing(false);
        return;
      }

      // Store photos and frame in sessionStorage
      sessionStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
      sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));

      // Navigate to processing/result page
      router.push('/result');
    } catch (error) {
      console.error('Error processing photos:', error);
      toast.error('Failed to process photos');
      setProcessing(false);
    }
  };

  if (!selectedFrame) {
    return <LoadingOverlay message="Loading..." />;
  }

  if (processing) {
    return <LoadingOverlay message="Processing your photos... 🎨" />;
  }

  const actualTotalPhotos = photos.length > 0 ? photos.length : 3;

  return (
    <div className="h-screen w-screen">
      <CameraPreview
        onCapture={handleCapture}
        onRetake={handleRetake}
        onNext={handleNext}
        onFinish={handleFinish}
        photoNumber={currentPhotoIndex + 1}
        totalPhotos={actualTotalPhotos}
        frame={selectedFrame}
        capturedPhotos={photos}
        currentCapturedPhoto={currentCapturedPhoto}
      />
    </div>
  );
}