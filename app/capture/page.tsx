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

  // --- LOGIKA LOAD FRAME & INIT SLOT (TIDAK BERUBAH) ---
  useEffect(() => {
    const frameData = sessionStorage.getItem('selectedFrame');
    if (!frameData) {
      toast.error('No frame selected. Please select a frame first.');
      router.push('/camera'); // Ini mengarah ke halaman pilih frame kamu
      return;
    }

    try {
      const frame = JSON.parse(frameData) as Frame;
      setSelectedFrame(frame);

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

  // --- HANDLERS (TIDAK BERUBAH) ---
  const handleCapture = (imageSrc: string) => {
    setCurrentCapturedPhoto(imageSrc);
    const newPhotos = [...photos];
    newPhotos[currentPhotoIndex] = imageSrc;
    setPhotos(newPhotos);
  };

  const handleRetake = () => {
    setCurrentCapturedPhoto(null);
    const newPhotos = [...photos];
    newPhotos[currentPhotoIndex] = null;
    setPhotos(newPhotos);
  };

  const handleNext = () => {
    if (!currentCapturedPhoto) return;
    setCurrentPhotoIndex(currentPhotoIndex + 1);
    setCurrentCapturedPhoto(null);
  };

  const handleFinish = async () => {
    if (!currentCapturedPhoto || !selectedFrame) return;

    setProcessing(true);

    try {
      const hasSlots = selectedFrame.photo_slots && selectedFrame.photo_slots.length > 0;
      const requiredPhotoCount = 
        selectedFrame.frame_config?.photo_count || 
        (hasSlots ? selectedFrame.photo_slots!.length : 3);

      const capturedPhotos = photos.filter(p => p !== null) as string[];
      
      if (capturedPhotos.length !== requiredPhotoCount) {
        toast.error(`Please capture all ${requiredPhotoCount} photos`);
        setProcessing(false);
        return;
      }

      sessionStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
      sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));

      router.push('/result');
    } catch (error) {
      console.error('Error processing photos:', error);
      toast.error('Failed to process photos');
      setProcessing(false);
    }
  };

  // --- TAMPILAN LOADING (DISESUAIKAN TEMA) ---
  if (!selectedFrame) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--foreground)' }}
      >
        <LoadingOverlay message="Loading..." />
      </div>
    );
  }

  // --- TAMPILAN PROCESSING (DISESUAIKAN TEMA) ---
  if (processing) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--foreground)' }}
      >
        <LoadingOverlay message="Processing your photos... 🎨" />
      </div>
    );
  }

  const actualTotalPhotos = photos.length > 0 ? photos.length : 3;

  // --- TAMPILAN UTAMA (CUSTOM THEME APPLIED) ---
  return (
    // Wrapper Utama: Menggunakan var CSS agar background mengikuti Admin
    <div 
      className="h-screen w-screen relative overflow-hidden transition-colors duration-500"
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        color: 'var(--foreground)' 
      }}
    >
      
      {/* Background Ambience (Blobs) - Agar konsisten dengan halaman sebelumnya */}
      <div 
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20 z-0" 
        style={{ backgroundColor: 'var(--primary-color)' }}
      />
      <div 
        className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20 z-0"
        style={{ backgroundColor: 'var(--secondary-color)' }}
      />

      {/* Komponen Camera Preview (Logic tetap, tapi dibungkus tema) */}
      <div className="relative z-10 h-full w-full">
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
    </div>
  );
}