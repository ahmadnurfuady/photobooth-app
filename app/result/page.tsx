// app/result/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react'; // 1. Import useRef
import { useRouter } from 'next/navigation';
import { Frame, PhotoSession } from '@/types';
import { Button } from '@/components/ui/Button';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  createPhotoStripWithFrame,
  generateGIF,
  downloadBase64Image,
} from '@/lib/imageProcessing';

// Helper: Generate ID unik
const generateSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function ResultPage() {
  const router = useRouter();
  
  // State UI
  const [status, setStatus] = useState<'initializing' | 'processing' | 'uploading' | 'complete' | 'error' | 'offline_saved'>('initializing');
  const [progressMessage, setProgressMessage] = useState('Initializing...');

  // State Data
  const [sessionId, setSessionId] = useState<string>(''); 
  const [downloadUrl, setDownloadUrl] = useState<string>(''); 
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [session, setSession] = useState<PhotoSession | null>(null);

  // 2. REF LOCK: Variabel ini tidak akan mereset ulang saat render ulang
  const processingRef = useRef(false);

  // 1. INIT
  useEffect(() => {
    // 3. CEK KUNCI: Jika sudah pernah jalan, hentikan seketika!
    if (processingRef.current === true) {
        return; 
    }
    // Kunci pintu agar proses kedua tidak bisa masuk
    processingRef.current = true;

    const newId = generateSessionId();
    setSessionId(newId);
    
    // Gunakan origin agar HP bisa akses lewat IP Lokal yang sama
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    setDownloadUrl(`${appUrl}/download/${newId}`);

    loadAndStartBackgroundProcess(newId);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAndStartBackgroundProcess = async (currentSessionId: string) => {
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
      
      setStatus('processing');
      setProgressMessage('Designing your photo strip... 🎨');
      
      await processAllPhotos(frame, photos, currentSessionId);

    } catch (error) {
      console.error('Error loading data:', error);
      setStatus('error');
      setProgressMessage('Failed to load data.');
    }
  };

  const processAllPhotos = async (frame: Frame, photos: string[], currentSessionId: string) => {
    try {
      // --- STEP 1: COMPOSITE PHOTO ---
      let finalComposite: string | null = null;
      try {
        finalComposite = await createPhotoStripWithFrame(
          photos,
          frame.cloudinary_url,
          frame.photo_slots || undefined,
          frame.frame_config?.photo_count || photos.length
        );
      } catch (libError) {
        console.warn("Library composite failed, using fallback...", libError);
        finalComposite = await generateCompositeFallback(photos, frame);
      }
      
      if (!finalComposite) throw new Error("Failed to generate photo strip");
      setCompositePhoto(finalComposite);

      // --- STEP 2: GIF ANIMATION ---
      setProgressMessage('Creating animation... ✨');
      let finalGif: string | null = null;
      try {
        finalGif = await generateGIF(photos);
      } catch (gifError) {
        finalGif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      }
      setGifUrl(finalGif);

      // --- STEP 3: UPLOAD TO SERVER ---
      try {
        if (!navigator.onLine) throw new Error("Browser Offline");

        setStatus('uploading');
        setProgressMessage('Syncing to cloud... ☁️');
        
        const payload = {
            id: currentSessionId,
            frame_id: frame.id,
            photos: photos,
            composite_photo: finalComposite, // Dikirim ke API, nanti API yang mapping ke composite_url
            gif: finalGif || "",
        };

        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Server Upload Failed");
        }

        setSession(responseData.data);
        
        setStatus('complete');
        setProgressMessage('Ready!');
        toast.success('Upload complete!');

      } catch (uploadError: any) {
        console.warn("Upload failed, attempting to save to queue...");
        
        if (navigator.onLine && (uploadError.message.includes('column') || uploadError.message.includes('PGRST'))) {
          setStatus('error');
          setProgressMessage('Database Error: Column mismatch');
          toast.error("Database error. Please check table schema.");
          return;
        }

        const payloadToSave = {
            id: currentSessionId,
            frame_id: frame.id,
            photos: photos, 
            composite_photo: finalComposite,
            gif: finalGif || "",
        };

        try {
            const currentQueue = JSON.parse(localStorage.getItem('pending_uploads') || '[]');
            
            // Proteksi: Jika antrian sudah ada 2, hapus yang paling lama agar tidak meledak
            if (currentQueue.length >= 2) currentQueue.shift();

            currentQueue.push(payloadToSave);
            localStorage.setItem('pending_uploads', JSON.stringify(currentQueue));
            
            setStatus('offline_saved'); 
            setProgressMessage('Saved Locally (Waiting for Internet)');
            toast('Saved offline. Will sync later.', { icon: '💾' });
        } catch (storageError) {
            console.error("LocalStorage Full!", storageError);
            setStatus('offline_saved');
            setProgressMessage('Memory Full - Please Download Manually');
            toast.error("Browser storage is full. Please download your photo now.");
        }
      }
      
      sessionStorage.removeItem('selectedFrame');
      sessionStorage.removeItem('capturedPhotos');

    } catch (criticalError: any) {
      console.error('Critical Processing Error:', criticalError);
      toast.error(`Error: ${criticalError.message}`);
      setStatus('error');
    }
  };

  const generateCompositeFallback = async (photos: string[], frame: Frame): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('No canvas context'); return; }

      const frameImg = new window.Image();
      frameImg.crossOrigin = "anonymous";
      frameImg.src = frame.cloudinary_url;

      frameImg.onload = async () => {
        const WIDTH = frameImg.width;
        const HEIGHT = frameImg.height;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const loadImg = (src: string) => new Promise<HTMLImageElement>((r) => { 
            const i = new window.Image(); i.onload = () => r(i); i.src = src; 
        });

        if (frame.photo_slots && frame.photo_slots.length > 0) {
            for (let i = 0; i < frame.photo_slots.length; i++) {
                if (!photos[i]) break; 
                const slot = frame.photo_slots[i];
                const pImg = await loadImg(photos[i]);

                const x = (slot.x / 100) * WIDTH;
                const y = (slot.y / 100) * HEIGHT;
                const w = (slot.width / 100) * WIDTH;
                const h = (slot.height / 100) * HEIGHT;

                ctx.drawImage(pImg, x, y, w, h);
            }
        } else {
            const defaultW = WIDTH * 0.8;
            const defaultH = defaultW * 0.75; 
            const startX = (WIDTH - defaultW) / 2;
            let startY = 100;
            for (let i = 0; i < photos.length; i++) {
                const pImg = await loadImg(photos[i]);
                ctx.drawImage(pImg, startX, startY, defaultW, defaultH);
                startY += defaultH + 20;
            }
        }

        ctx.drawImage(frameImg, 0, 0, WIDTH, HEIGHT);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
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

  return (
    <div 
      className="min-h-screen w-full relative overflow-y-auto font-sans p-4 md:p-8"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--foreground)' }}
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div 
            className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ backgroundColor: 'var(--primary-color)', opacity: 0.1 }}
         />
         <div 
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ backgroundColor: 'var(--secondary-color)', opacity: 0.1 }}
         />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="text-center mb-8">
          <div 
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border"
            style={{ 
                backgroundColor: 'rgba(128,128,128, 0.1)', 
                borderColor: 'var(--primary-color)',
                color: 'var(--primary-color)'
            }}
          >
            Session ID: {sessionId ? sessionId.slice(-6) : '...'}
          </div>
          
          <h1 
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent"
            style={{ 
                backgroundImage: 'linear-gradient(to right, var(--foreground), rgba(var(--foreground-rgb), 0.5))',
                color: 'var(--foreground)'
            }}
          >
            {status === 'offline_saved' ? 'Saved Locally (Offline)' : 'Your Memories Ready! 🚀'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            <div 
                className="rounded-3xl p-6 backdrop-blur-md shadow-2xl border"
                style={{ 
                    backgroundColor: 'rgba(128,128,128, 0.05)', 
                    borderColor: 'rgba(128,128,128, 0.1)' 
                }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📸</span> Result
                </h3>
                {compositePhoto && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleDownloadComposite} 
                    className="border-none text-white shadow-lg"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Download
                  </Button>
                )}
              </div>
              
              <div 
                className="w-full rounded-xl overflow-hidden border p-4 flex justify-center min-h-[300px]"
                style={{ 
                    backgroundColor: 'rgba(0,0,0, 0.2)', 
                    borderColor: 'rgba(128,128,128, 0.1)' 
                }}
              >
                {compositePhoto ? (
                  <div className="relative w-full max-w-sm aspect-[3/5] shadow-2xl animate-in zoom-in duration-500">
                    <Image
                      src={compositePhoto}
                      alt="Photo Strip"
                      fill
                      className="object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4 py-20 opacity-50">
                    <div 
                        className="w-12 h-12 border-4 rounded-full animate-spin"
                        style={{ borderColor: 'var(--foreground)', borderTopColor: 'var(--primary-color)' }}
                    />
                    <p className="text-sm">Designing layout...</p>
                  </div>
                )}
              </div>
            </div>

            <div 
                className="border rounded-2xl p-5 backdrop-blur-md"
                style={{ 
                    backgroundColor: 'rgba(128,128,128, 0.05)', 
                    borderColor: 'rgba(128,128,128, 0.1)' 
                }}
            >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">✨ Animation</h3>
                  {gifUrl && <button onClick={handleDownloadGif} className="text-xs hover:opacity-80" style={{ color: 'var(--primary-color)' }}>Save GIF</button>}
                </div>
                {gifUrl ? (
                   <div className="relative w-full aspect-video bg-black/20 rounded-lg overflow-hidden border border-white/10 animate-in fade-in">
                      <Image src={gifUrl} alt="GIF" fill className="object-contain" unoptimized />
                   </div>
                ) : (
                   <div className="w-full aspect-video bg-black/20 rounded-lg flex items-center justify-center text-xs opacity-50 animate-pulse">Creating...</div>
                )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div 
                className="rounded-3xl p-8 border shadow-2xl text-center relative overflow-hidden"
                style={{ 
                    background: 'linear-gradient(to bottom, rgba(128,128,128,0.1), rgba(128,128,128,0.05))',
                    borderColor: 'rgba(128,128,128, 0.1)' 
                }}
            >
              <h3 className="text-xl font-bold mb-2">Scan to Download</h3>
              
              {status === 'offline_saved' && (
                <div className="mb-4 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg animate-in fade-in zoom-in">
                   <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-tight">
                      ⚠️ Offline Mode: Simpan Link ini!
                   </p>
                   <p className="text-[9px] opacity-70">
                      Foto akan muncul otomatis setelah booth online kembali.
                   </p>
                </div>
              )}

              <div className={`bg-white p-4 rounded-2xl inline-block shadow-lg mb-6 transition-all duration-700 ${status === 'offline_saved' ? 'grayscale-[0.5] opacity-90' : ''}`}>
                {downloadUrl ? (
                   <QRCodeCanvas value={downloadUrl} size={200} level="H" />
                ) : (
                   <div className="w-[200px] h-[200px] bg-gray-200 animate-pulse rounded" />
                )}
              </div>

              <div 
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-3 transition-all duration-500 ${
                    status === 'complete' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                    status === 'offline_saved' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                    status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-500'
                }`}
              >
                <span className="font-semibold text-sm">
                  {status === 'complete' ? (session ? 'Ready! (Uploaded)' : 'Ready (Saved Locally)') : 
                   status === 'offline_saved' ? 'Waiting for Internet Sync...' :
                   status === 'error' ? 'Critical Error' : progressMessage}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => router.push('/')}
                className="w-full py-4 border opacity-80 hover:opacity-100"
                style={{ 
                    backgroundColor: 'rgba(128,128,128, 0.1)', 
                    borderColor: 'rgba(128,128,128, 0.2)',
                    color: 'var(--foreground)'
                }}
              >
                Back Home
              </Button>
              <Button 
                onClick={handleNewSession}
                className="w-full py-4 text-white shadow-lg"
                style={{ 
                    background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
                    boxShadow: '0 10px 20px -5px var(--primary-color)'
                }}
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