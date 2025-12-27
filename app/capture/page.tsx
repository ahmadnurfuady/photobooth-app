// app/capture/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { LoadingOverlay } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// ✅ IMPORT BARU: Komponen Settings
import CameraSettings from '@/components/camera/CameraSettings';

// ✅ ICON SETTINGS (Hardcoded SVG agar mandiri)
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

// ✅ ICON CAMERA OFF (Untuk Error State)
const CameraOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-3.5-3.5m-2-2l-2-2m-2-2l-3.5-3.5"></path><path d="M15 8.3c2.4.6 4.3 2.5 4.9 4.9"></path><path d="M7 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.7"></path><circle cx="12" cy="13" r="3"></circle></svg>
);

export default function CapturePage() {
  const router = useRouter();
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([]); 
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentCapturedPhoto, setCurrentCapturedPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // STATE BARU: Kontrol Settings & Device ID
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  
  // ✅ STATE BARU: UX Kamera (Permission Error)
  const [cameraPermissionError, setCameraPermissionError] = useState(false);

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

  // ✅ LOGIKA CEK IZIN KAMERA (Auto Check saat Mount)
  useEffect(() => {
      const checkCameraAccess = async () => {
          try {
              // Coba minta stream sebentar hanya untuk cek izin
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              // Jika berhasil, matikan lagi streamnya (karena nanti CameraPreview yang akan handle)
              stream.getTracks().forEach(track => track.stop());
              setCameraPermissionError(false);
          } catch (err: any) {
              console.error("Camera Access Check Failed:", err);
              // Deteksi error permission
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                  setCameraPermissionError(true);
              }
              // Jika error lain (misal device not found), biarkan CameraPreview yang handle
          }
      };
      
      checkCameraAccess();
  }, []);

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

  // HANDLER BARU: Menerima perubahan device dari komponen Settings
  const handleDeviceChange = (deviceId: string) => {
    setCurrentDeviceId(deviceId);
  };

  // --- TAMPILAN ERROR PERMISSION (BLOKIR) ---
  // Ini akan menggantikan seluruh tampilan jika izin kamera ditolak
  if (cameraPermissionError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center font-sans z-[9999]">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <CameraOffIcon /> 
            </div>
            <h2 className="text-3xl font-black mb-3 tracking-tight">Akses Kamera Ditolak 😔</h2>
            <p className="text-gray-300 mb-8 leading-relaxed max-w-md text-lg">
                Kami butuh izin kamera untuk mengambil fotomu. 
                Jangan khawatir, ini aman kok!
            </p>
            
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 p-6 rounded-2xl text-left text-sm space-y-4 w-full max-w-sm shadow-2xl">
                <p className="font-bold text-gray-400 uppercase text-xs tracking-widest border-b border-gray-700 pb-2 mb-2">CARA MEMPERBAIKI:</p>
                <div className="flex gap-4 items-start">
                    <span className="bg-gray-700 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 shadow-sm">1</span>
                    <p className="text-gray-300">Klik ikon <span className="font-bold text-white">Gembok 🔒</span> di samping alamat website (atas layar).</p>
                </div>
                <div className="flex gap-4 items-start">
                    <span className="bg-gray-700 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 shadow-sm">2</span>
                    <p className="text-gray-300">Klik tombol <span className="font-bold text-white">"Reset Permission"</span> atau aktifkan Camera.</p>
                </div>
                <div className="flex gap-4 items-start">
                    <span className="bg-gray-700 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 shadow-sm">3</span>
                    <p className="text-gray-300">Refresh halaman ini.</p>
                </div>
            </div>

            <button 
                onClick={() => window.location.reload()}
                className="mt-10 px-10 py-4 bg-white text-black font-black text-lg rounded-full hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
                Coba Lagi (Refresh)
            </button>
        </div>
      );
  }

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
      {/* Tombol hanya muncul jika belum sedang mengambil/preview foto (opsional, bisa dihapus logic hidden-nya) */}
      {!currentCapturedPhoto && (
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
      )}

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
          selectedDeviceId={currentDeviceId} // ✅ Kirim device ID yang dipilih ke Preview
        />
      </div>
    </div>
  );
}