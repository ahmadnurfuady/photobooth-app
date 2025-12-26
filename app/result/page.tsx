//app/result/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Frame, PhotoSession } from '@/types';
import { Button } from '@/components/ui/Button';
import { QRCodeCanvas } from 'qrcode.react'; // Pastikan install: npm install qrcode.react
import toast from 'react-hot-toast';
import Image from 'next/image';

// ✅ IMPORT CUSTOM LOGGER (Sistem Monitoring Baru)
import { logger } from '@/lib/Logger'; 

// ✅ IMPORT SENTRY (Tetap dipertahankan)
import { captureSystemError } from '@/src/utils/errorHandler'; 

// 🔥 TAMBAHAN BARU: Import Supabase Client
import { supabase } from '@/lib/supabase';

import {
  createPhotoStripWithFrame,
  generateGIF,
  downloadBase64Image,
} from '@/lib/imageProcessing';

// Helper Generate UUID
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

  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current === true) {
        return; 
    }
    processingRef.current = true;

    const newId = generateSessionId();
    setSessionId(newId);
    
    // ✅ LOGGER: Track Session Start
    logger.info('SESSION_INIT', 'User arrived at Result Page', { sessionId: newId });
    
    // Generate URL download lokal (untuk QR Code sementara)
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
        // ✅ LOGGER: Warning
        logger.warn('SESSION_DATA_MISSING', 'User refreshed or accessed directly', { sessionId: currentSessionId });
        
        // Sentry Log
        captureSystemError({
             error: new Error("Session Storage Empty"),
             category: "UI",
             message: "User mengakses result page tanpa data foto",
             severity: "warning"
        });

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
      // ✅ LOGGER: Error
      logger.error('DATA_LOAD_ERROR', error, { sessionId: currentSessionId });

      captureSystemError({
          error: error,
          category: "UI",
          message: "Gagal memparsing data dari Session Storage",
          severity: "error"
      });
      setStatus('error');
      setProgressMessage('Failed to load data.');
    }
  };

  const processAllPhotos = async (frame: Frame, photos: string[], currentSessionId: string) => {
    try {
      // --- STEP 1: COMPOSITE PHOTO ---
      let finalComposite: string | null = null;
      try {
        // ✅ MONITOR: Track Performance (Generate Composite)
        finalComposite = await logger.monitorOperation(
            'GENERATE_COMPOSITE',
            async () => {
                return await createPhotoStripWithFrame(
                    photos,
                    frame.cloudinary_url,
                    frame.photo_slots || undefined,
                    frame.frame_config?.photo_count || photos.length
                );
            },
            { photoCount: photos.length, frameId: frame.id }
        );
      } catch (libError) {
        // ✅ LOGGER: Fallback
        logger.warn('COMPOSITE_FALLBACK', 'Using canvas fallback', { error: String(libError) });

        captureSystemError({
            error: libError,
            category: "UI",
            message: "Library composite gagal, menggunakan fallback canvas",
            severity: "warning"
        });
        finalComposite = await generateCompositeFallback(photos, frame);
      }
      
      if (!finalComposite) throw new Error("Failed to generate photo strip");
      setCompositePhoto(finalComposite);

      // --- STEP 2: GIF ANIMATION ---
      setProgressMessage('Creating animation... ✨');
      let finalGif: string | null = null;
      try {
        // ✅ MONITOR: Track Performance (GIF)
        finalGif = await logger.monitorOperation(
            'GENERATE_GIF',
            async () => await generateGIF(photos),
            { photoCount: photos.length }
        );
      } catch (gifError) {
        logger.warn('GIF_FAILED', 'Skipping GIF generation', { error: String(gifError) });

        captureSystemError({
            error: gifError,
            category: "UI",
            message: "Gagal generate GIF",
            severity: "info"
        });
        finalGif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      }
      setGifUrl(finalGif);

      // --- STEP 3: UPLOAD TO SERVER ---
      try {
        if (!navigator.onLine) throw new Error("Browser Offline");

        setStatus('uploading');
        setProgressMessage('Syncing to cloud... ☁️');
        
        // 🔑 PERBAIKAN PENTING: Ambil Event ID dari LocalStorage
        // Ini memastikan foto terhubung ke event yang sedang aktif
        const activeEventId = localStorage.getItem('active_event_id');

        const payload = {
            id: currentSessionId,
            event_id: activeEventId, // ✅ Tambahkan Event ID ke payload
            frame_id: frame.id,
            photos: photos,
            composite_photo: finalComposite, 
            gif: finalGif || "",
        };

        // ✅ MONITOR: Track Upload Performance & Success
        const responseData = await logger.monitorOperation(
            'UPLOAD_SESSION_API',
            async () => {
                // Perhatikan: Endpoint diganti ke /api/upload-session jika ingin sesuai diskusi sebelumnya,
                // tapi jika backend Anda pakai /api/sessions, biarkan begini.
                const response = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errJson = await response.json();
                    throw new Error(errJson.error || `Server Upload Failed: ${response.status}`);
                }
                return await response.json();
            },
            { sessionId: currentSessionId, eventId: activeEventId }
        );

        setSession(responseData.data);
        
        // 🔥 FITUR LIVE FEED: SIMPAN LINK FOTO KE TABEL PHOTOS
        // Kode ini ditambahkan agar foto langsung muncul di layar TV / Live Feed
        if (activeEventId && responseData.data?.composite_url) {
             const { error: liveError } = await supabase
                .from('photos')
                .insert({
                    event_id: activeEventId,
                    cloudinary_url: responseData.data.composite_url
                });
             
             if (liveError) {
                console.error("Gagal update Live Feed:", liveError);
                // Tidak perlu throw error karena ini fitur sekunder
             } else {
                console.log("✅ Foto berhasil masuk Live Feed!");
             }
        }

        // Update URL download jika server mengembalikan URL publik (Cloudinary)
        if (responseData.data?.composite_url) {
            // setDownloadUrl(responseData.data.composite_url); // Opsional: Direct link ke gambar
        }

        setStatus('complete');
        setProgressMessage('Ready!');
        toast.success('Upload complete!');

        // ✅ LOGGER: Success
        logger.info('SESSION_COMPLETED', 'Session finished successfully', { sessionId: currentSessionId });

      } catch (uploadError: any) {
        
        // --- LOGIKA ERROR & OFFLINE ---
        const isNetworkError = !navigator.onLine || uploadError.message.includes("Offline") || uploadError.message.includes("fetch");
        
        // Sentry & Logger Logic
        if (uploadError.message.includes('column') || uploadError.message.includes('PGRST')) {
            // ✅ LOGGER: Fatal DB Error
            logger.critical('DATABASE_SCHEMA_MISMATCH', uploadError, { sessionId: currentSessionId });

            captureSystemError({
               error: uploadError,
               category: "DATABASE",
               message: "Mismatch Schema Database saat Upload Sesi",
               severity: "fatal"
           });
           
           setStatus('error');
           setProgressMessage('Database Error: Column mismatch');
           toast.error("Database error. Please check table schema.");
           return;
        }

        if (!isNetworkError) {
            // ✅ LOGGER: Server Error
            logger.error('UPLOAD_SERVER_ERROR', uploadError, { sessionId: currentSessionId });

            captureSystemError({
               error: uploadError,
               category: "NETWORK",
               message: "Gagal upload sesi ke API (Internet Available)",
               severity: "error"
           });
        } else {
            // ✅ LOGGER: Offline Info
            logger.info('NETWORK_OFFLINE', 'Switching to offline storage mode', { sessionId: currentSessionId });

            captureSystemError({
               error: new Error("Switched to Offline Mode"),
               category: "NETWORK",
               message: "Koneksi mati, data disimpan ke LocalStorage",
               severity: "info"
           });
        }

        console.warn("Upload failed, attempting to save to queue...");
        
        const activeEventId = localStorage.getItem('active_event_id');

        const payloadToSave = {
            id: currentSessionId,
            event_id: activeEventId, // ✅ Simpan Event ID juga saat offline
            frame_id: frame.id,
            photos: photos, 
            composite_photo: finalComposite,
            gif: finalGif || "",
        };

        try {
            const currentQueue = JSON.parse(localStorage.getItem('pending_uploads') || '[]');
            
            // Batasi antrian offline agar localStorage tidak meledak (opsional, diset 2)
            if (currentQueue.length >= 2) currentQueue.shift();

            currentQueue.push(payloadToSave);
            localStorage.setItem('pending_uploads', JSON.stringify(currentQueue));
            
            setStatus('offline_saved'); 
            setProgressMessage('Saved Locally (Waiting for Internet)');
            toast('Saved offline. Will sync later.', { icon: '💾' });

            // ✅ LOGGER: Saved Offline
            logger.info('OFFLINE_SAVE_SUCCESS', 'Session saved to localStorage', { queueLength: currentQueue.length + 1 });

        } catch (storageError) {
            // ✅ LOGGER: Critical Storage Full
            logger.critical('LOCAL_STORAGE_FULL', storageError, { sessionId: currentSessionId });

            captureSystemError({
               error: storageError,
               category: "UI",
               message: "LocalStorage Penuh - Gagal simpan offline backup",
               severity: "warning"
           });
           
            console.error("LocalStorage Full!", storageError);
            setStatus('offline_saved');
            setProgressMessage('Memory Full - Please Download Manually');
            toast.error("Browser storage is full. Please download your photo now.");
        }
      }
      
      // Bersihkan Session Storage agar tidak double process jika refresh
      sessionStorage.removeItem('selectedFrame');
      sessionStorage.removeItem('capturedPhotos');

    } catch (criticalError: any) {
      // ✅ LOGGER: Fatal Crash
      logger.critical('RESULT_PAGE_CRASH', criticalError, { sessionId: currentSessionId });

      captureSystemError({
          error: criticalError,
          category: "UNKNOWN",
          message: "Critical Error di Result Page (Process All Photos)",
          severity: "fatal"
      });
      
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
      // ✅ LOGGER: User Action
      logger.info('USER_DOWNLOAD_PHOTO', 'User downloaded composite', { sessionId });
      toast.success('Photo strip downloaded!');
    }
  };

  const handleDownloadGif = () => {
    if (gifUrl && gifUrl.startsWith('data:image')) {
      downloadBase64Image(gifUrl, `photobooth-anim-${Date.now()}.gif`);
      // ✅ LOGGER: User Action
      logger.info('USER_DOWNLOAD_GIF', 'User downloaded GIF', { sessionId });
      toast.success('GIF downloaded!');
    } else {
      toast.error('GIF not available');
    }
  };

  const handleNewSession = () => {
    // ✅ LOGGER: User Action
    logger.info('USER_NEW_SESSION', 'User started new session', { previousSessionId: sessionId });
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
          
          {/* KOLOM KIRI: HASIL PREVIEW */}
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

          {/* KOLOM KANAN: STATUS & QR */}
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