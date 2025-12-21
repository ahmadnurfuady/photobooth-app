// app/result/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame, PhotoSession } from '@/types';
import { Button } from '@/components/ui/Button';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import Image from 'next/image';

// Import fungsi dari library kamu (jika ada)
// Kita bungkus dalam try-catch nanti, kalau error kita pakai fallback manual di file ini
import {
  createPhotoStripWithFrame,
  generateGIF,
  downloadBase64Image,
} from '@/lib/imageProcessing';

export default function ResultPage() {
  const router = useRouter();
  
  // State UI
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Initializing...');

  // State Data
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [session, setSession] = useState<PhotoSession | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAndProcessPhotos();
  }, []);

  const loadAndProcessPhotos = async () => {
    try {
      const frameData = sessionStorage.getItem('selectedFrame');
      const photosData = sessionStorage.getItem('capturedPhotos');

      if (!frameData || !photosData) {
        toast.error('No session data found. Redirecting...');
        router.push('/camera');
        return;
      }

      const frame = JSON.parse(frameData) as Frame;
      const photos = JSON.parse(photosData) as string[];

      setSelectedFrame(frame);
      setCapturedPhotos(photos);

      // Mulai Proses Utama
      await processAllPhotos(frame, photos);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load session');
      router.push('/camera');
    }
  };

  const processAllPhotos = async (frame: Frame, photos: string[]) => {
    try {
      // --- STEP 1: COMPOSITE PHOTO (STRIP) ---
      setProgress(20);
      setProgressMessage('Designing your photo strip... 🎨');
      
      let finalComposite: string | null = null;

      try {
        // Coba pakai library kamu dulu
        finalComposite = await createPhotoStripWithFrame(
          photos,
          frame.cloudinary_url,
          frame.photo_slots || undefined,
          frame.frame_config?.photo_count || photos.length
        );
      } catch (libError) {
        console.warn("Library composite failed, using fallback canvas...", libError);
        // Fallback: Generate manual pakai Canvas jika fungsi di atas error
        finalComposite = await generateCompositeFallback(photos, frame);
      }

      if (!finalComposite) throw new Error("Failed to generate photo strip");
      setCompositePhoto(finalComposite);

      // --- STEP 2: GIF ANIMATION ---
      setProgress(50);
      setProgressMessage('Animating your moments... ✨');
      
      let finalGif: string | null = null;

      try {
        // Coba pakai library generateGIF kamu
        finalGif = await generateGIF(photos);
      } catch (gifError) {
        console.warn("GIF generation failed, using static fallback...", gifError);
        // Fallback: Gunakan dummy base64 GIF transparan agar backend tidak menolak request
        // (Atau bisa duplikat foto pertama dengan header GIF jika mau)
        finalGif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      }

      setGifUrl(finalGif);

      // --- STEP 3: UPLOAD TO SERVER ---
      setProgress(80);
      setProgressMessage('Saving memory to cloud... ☁️');

      const payload = {
        frame_id: frame.id,
        photos: photos,            // Array Foto Original
        composite_photo: finalComposite, // Strip Foto yang sudah jadi
        gif: finalGif || "",      // GIF Animation
      };

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server Error (${response.status})`);
      }

      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data) {
        throw new Error('Invalid response structure from server');
      }

      setSession(responseData.data);

      // --- STEP 4: FINALIZE ---
      setProgress(100);
      setProgressMessage('Ready! 🎉');
      
      // Generate Download Link (Client Side URL)
      const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setDownloadUrl(`${appUrl}/download/${responseData.data.id}`);

      // Clear Session Storage agar bersih
      sessionStorage.removeItem('selectedFrame');
      sessionStorage.removeItem('capturedPhotos');

      setTimeout(() => {
        setProcessing(false);
        toast.success('Session saved successfully!');
      }, 800);

    } catch (error: any) {
      console.error('Processing Error:', error);
      toast.error(error.message || 'Failed to process photos');
      setProcessing(false); // Stop loading even on error so user can see what happened
    }
  };

  // --- FALLBACK FUNCTION: Manual Canvas Composite ---
  // (Digunakan jika createPhotoStripWithFrame dari library gagal/error)
  const generateCompositeFallback = async (photos: string[], frame: Frame): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('No canvas context'); return; }

      const WIDTH = 600;
      const HEIGHT = 1200; // Ukuran strip standar
      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      // Background Putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const frameImg = new window.Image(); // Pakai window.Image explicit
      frameImg.crossOrigin = "anonymous";
      frameImg.src = frame.cloudinary_url;

      frameImg.onload = async () => {
        // Simple logic: Stack photos vertically
        const photoHeight = 300; 
        const margin = 20;
        
        // Helper load image
        const loadImg = (src: string) => new Promise<HTMLImageElement>((r) => { 
            const i = new window.Image(); i.onload = () => r(i); i.src = src; 
        });

        for (let i = 0; i < photos.length; i++) {
            if (i >= 4) break; // Limit 4 photos
            const pImg = await loadImg(photos[i]);
            // Draw di tengah
            ctx.drawImage(pImg, 50, 50 + (i * (photoHeight + margin)), 500, photoHeight);
        }

        // Draw Frame di paling atas
        ctx.drawImage(frameImg, 0, 0, WIDTH, HEIGHT);
        resolve(canvas.toDataURL('image/jpeg', 0.90));
      };
      
      frameImg.onerror = (e) => reject(e);
    });
  };

  const handleDownloadComposite = () => {
    if (compositePhoto) {
      downloadBase64Image(compositePhoto, `photobooth-strip-${Date.now()}.jpg`);
      toast.success('Photo strip downloaded!');
    }
  };

  const handleDownloadGif = () => {
    if (gifUrl && gifUrl.startsWith('data:image')) {
      downloadBase64Image(gifUrl, `photobooth-anim-${Date.now()}.gif`);
      toast.success('GIF downloaded!');
    } else {
      toast.error('GIF not available');
    }
  };

  const handleNewSession = () => {
    router.push('/camera');
  };

  // --- RENDER LOADING SCREEN (DARK MODE) ---
  if (processing) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Background Blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="bg-slate-900/50 border border-slate-800 backdrop-blur-md rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl z-10">
          {/* SVG Progress Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64" cy="64" r="56"
                stroke="#1e293b" strokeWidth="8" fill="none"
              />
              <circle
                cx="64" cy="64" r="56"
                stroke="#3b82f6" strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{progress}%</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2 animate-pulse">Processing...</h2>
          <p className="text-slate-400 text-sm">{progressMessage}</p>
        </div>
      </div>
    );
  }

  // --- RENDER RESULT PAGE (PREMIUM DARK UI) ---
  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-y-auto font-sans text-slate-100 p-4 md:p-8">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold uppercase tracking-wider mb-4 animate-in fade-in slide-in-from-top-4">
            Session Complete
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Your Photos Are Ready! 🎉
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Scan the QR code to download instantly or save the photo strip below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: PREVIEWS (Span 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* MAIN: Photo Strip */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📸</span> The Result
                </h3>
                <Button variant="primary" size="sm" onClick={handleDownloadComposite} className="bg-blue-600 hover:bg-blue-700 border-none">
                  Download Strip
                </Button>
              </div>
              
              {compositePhoto ? (
                <div className="w-full bg-slate-950/50 rounded-xl overflow-hidden border border-slate-800/50 p-4 flex justify-center">
                  <div className="relative w-full max-w-sm aspect-[3/5] shadow-2xl">
                    <Image
                      src={compositePhoto}
                      alt="Photo Strip"
                      fill
                      className="object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                  Preview not available
                </div>
              )}
            </div>

            {/* SUB: GIF & Singles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GIF Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm flex gap-2"><span>✨</span> Animation</h3>
                  <button onClick={handleDownloadGif} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Save GIF</button>
                </div>
                {gifUrl ? (
                   <div className="relative w-full aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                      <Image src={gifUrl} alt="GIF" fill className="object-cover" unoptimized />
                   </div>
                ) : (
                   <div className="w-full aspect-square bg-slate-950 rounded-lg flex items-center justify-center text-xs text-slate-600">No GIF</div>
                )}
              </div>

              {/* Singles Grid */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                 <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm flex gap-2"><span>🎞️</span> Originals</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {capturedPhotos.slice(0, 4).map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-slate-950 border border-slate-800">
                      <Image src={src} alt={`Shot ${idx}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: ACTIONS (Span 5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* QR Code Card */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center">
              <h3 className="text-xl font-bold text-white mb-2">Scan to Download</h3>
              <p className="text-slate-400 text-sm mb-6">Get these photos directly on your smartphone.</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mb-4">
                {downloadUrl ? (
                   <QRCodeCanvas value={downloadUrl} size={180} level="H" />
                ) : (
                   <div className="w-[180px] h-[180px] bg-gray-200 animate-pulse rounded" />
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-950/50 py-2 px-4 rounded-full inline-flex border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Link expires in 24 hours
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Session Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Frame Style</span>
                  <span className="text-white font-medium">{selectedFrame?.name || 'Standard'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Photos Taken</span>
                  <span className="text-white font-medium">{session?.photo_count || capturedPhotos.length} Shots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date</span>
                  <span className="text-white font-medium">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => router.push('/')}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Back Home
              </Button>
              <Button 
                onClick={handleNewSession}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/20"
              >
                New Session
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}