// app/capture/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { LoadingOverlay } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// ✅ IMPORT BARU
import CameraSettings from '@/components/camera/CameraSettings';

// ✅ PASTIKAN BAGIAN INI ADA (Jangan sampai kelewat copy)
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default function CapturePage() {
  const router = useRouter();
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([]); 
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentCapturedPhoto, setCurrentCapturedPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // STATE BARU
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // --- LOGIKA LOAD FRAME (TIDAK BERUBAH) ---
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

      const hasSlots = frame.photo_slots && frame.photo_slots.length > 0;
      const requiredPhotoCount = 
        frame.frame_config?.photo_count || 
        (hasSlots ? frame.photo_slots!.length : 3);

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

  // HANDLER BARU
  const handleDeviceChange = (deviceId: string) => {
    setCurrentDeviceId(deviceId);
  };

  // --- TAMPILAN LOADING ---
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

  // --- TAMPILAN PROCESSING ---
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

  // --- TAMPILAN UTAMA ---
  return (
    <div 
      className="h-screen w-screen relative overflow-hidden transition-colors duration-500"
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        color: 'var(--foreground)' 
      }}
    >
      
      {/* Background Ambience */}
      <div 
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20 z-0" 
        style={{ backgroundColor: 'var(--primary-color)' }}
      />
      <div 
        className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20 z-0"
        style={{ backgroundColor: 'var(--secondary-color)' }}
      />

      {/* ✅ 1. DRAWER SETTING (Z-INDEX 101 - PASTI PALING ATAS) */}
      <div className="relative z-[101]">
        <CameraSettings 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentDeviceId={currentDeviceId}
          onDeviceChange={handleDeviceChange}
        />
      </div>

      {/* ✅ 2. TOMBOL GEAR (Z-INDEX 100 - DI ATAS PREVIEW) */}
      {/* Saya hapus kondisi !currentCapturedPhoto agar tombol SELALU muncul dulu untuk ngetes */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 z-[100] p-3 rounded-full backdrop-blur-md transition-all border shadow-lg hover:scale-110 cursor-pointer"
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.5)', // Gelapkan dikit biar kontras
          color: '#ffffff', // Putih pasti
          borderColor: 'rgba(255,255,255,0.3)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
        title="Camera Settings"
      >
        <SettingsIcon />
      </button>

      {/* Komponen Camera Preview */}
      <div className="relative z-10 h-full w-full">
        {/* @ts-ignore */}
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
          selectedDeviceId={currentDeviceId} 
        />
      </div>
    </div>
  );
}