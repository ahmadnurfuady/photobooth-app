// app/result/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame, PhotoSession } from '@/types';
import { Button } from '@/components/ui/Button';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import Image from 'next/image';

// Import library pemrosesan gambar Anda
// (Fungsi ini akan dijalankan, jika gagal akan masuk ke fallback)
import {
  createPhotoStripWithFrame,
  generateGIF,
  downloadBase64Image,
} from '@/lib/imageProcessing';

// Helper: Generate ID unik di client (untuk QR Code instan)
// app/result/page.tsx

// ... imports tetap sama ...

// ✅ PERBAIKAN: Generator UUID v4 Asli (Native Browser)
// Ini menghasilkan format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
// yang diterima oleh kolom UUID di Supabase.
const generateSessionId = () => {
  // Cara 1: Gunakan API modern browser (paling cepat & aman)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Cara 2: Fallback manual untuk browser lama (UUID v4 compatible)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};


export default function ResultPage() {
  const router = useRouter();
  
  // --- STATE UI ---
  // Status proses: 'initializing' -> 'processing' -> 'uploading' -> 'complete' | 'error'
  const [status, setStatus] = useState<'initializing' | 'processing' | 'uploading' | 'complete' | 'error'>('initializing');
  const [progressMessage, setProgressMessage] = useState('Initializing...');

  // --- STATE DATA ---
  const [sessionId, setSessionId] = useState<string>(''); // ID sesi (dibuat di awal)
  const [downloadUrl, setDownloadUrl] = useState<string>(''); // URL download (dibuat di awal)
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  // Hasil Generate (Awalnya null, akan terisi setelah proses selesai)
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [session, setSession] = useState<PhotoSession | null>(null);

  // 1. INIT ON MOUNT: Generate ID & Tampilkan Halaman LANGSUNG
  useEffect(() => {
    // A. Generate ID Unik detik ini juga
    const newId = generateSessionId();
    setSessionId(newId);
    
    // B. Buat URL Download (Deterministic URL)
    // URL ini bisa dibuka user meskipun data belum masuk database (Logic "Waiting Room")
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    setDownloadUrl(`${appUrl}/download/${newId}`);

    // C. Load Data & Mulai Background Process
    loadAndStartBackgroundProcess(newId);
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
      
      // Update status: UI tampil, sekarang mulai proses berat di background
      setStatus('processing');
      setProgressMessage('Designing your photo strip... 🎨');
      
      // --- MULAI PARALLEL PROCESSING ---
      await processAllPhotos(frame, photos, currentSessionId);

    } catch (error) {
      console.error('Error loading data:', error);
      setStatus('error');
      setProgressMessage('Failed to load data.');
    }
  };

  const processAllPhotos = async (frame: Frame, photos: string[], currentSessionId: string) => {
    try {
      // --- STEP 1: COMPOSITE PHOTO (Local Processing) ---
      // User sudah bisa lihat QR Code, tapi Preview gambar masih loading
      let finalComposite: string | null = null;
      try {
        // Coba pakai library utama Anda
        finalComposite = await createPhotoStripWithFrame(
          photos,
          frame.cloudinary_url,
          frame.photo_slots || undefined,
          frame.frame_config?.photo_count || photos.length
        );
      } catch (libError) {
        console.warn("Library composite failed, using fallback...", libError);
        // Fallback: Generate manual pakai Canvas (agar tidak crash)
        finalComposite = await generateCompositeFallback(photos, frame);
      }
      
      if (!finalComposite) throw new Error("Failed to generate photo strip");
      setCompositePhoto(finalComposite); // Preview Strip Muncul!

      // --- STEP 2: GIF ANIMATION (Local Processing) ---
      setProgressMessage('Creating animation... ✨');
      let finalGif: string | null = null;
      try {
        // Coba pakai library generateGIF utama
        finalGif = await generateGIF(photos);
      } catch (gifError) {
        console.warn("GIF generation failed, using static fallback...", gifError);
        // Fallback dummy GIF (1x1 pixel transparan) agar backend tidak reject
        finalGif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      }
      setGifUrl(finalGif);

      // --- STEP 3: UPLOAD TO SERVER (Background Upload) ---
      setStatus('uploading');
      setProgressMessage('Syncing to cloud... ☁️');
      
      const payload = {
        id: currentSessionId, // ✅ KIRIM ID YANG SUDAH KITA GENERATE (PENTING!)
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

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Server Error (${response.status})`);
      }

      setSession(responseData.data);

      // --- STEP 4: FINISH ---
      setStatus('complete'); // Indikator di bawah QR berubah jadi hijau
      setProgressMessage('Ready!');
      toast.success('Upload complete! Your photos are safe.');
      
      // Bersihkan Storage agar sesi baru bersih
      sessionStorage.removeItem('selectedFrame');
      sessionStorage.removeItem('capturedPhotos');

    } catch (error: any) {
      console.error('Processing Error:', error);
      toast.error(`Upload failed: ${error.message}`);
      // Tetap biarkan user download manual lewat tombol jika upload gagal
      setStatus('error');
      setProgressMessage('Upload failed (Saved Locally)');
    }
  };

  // --- FALLBACK FUNCTION: Manual Canvas Composite ---
  // Digunakan HANYA JIKA createPhotoStripWithFrame dari library gagal/error
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

      const frameImg = new window.Image();
      frameImg.crossOrigin = "anonymous";
      frameImg.src = frame.cloudinary_url;

      frameImg.onload = async () => {
        // Helper load image async
        const loadImg = (src: string) => new Promise<HTMLImageElement>((r) => { 
            const i = new window.Image(); i.onload = () => r(i); i.src = src; 
        });

        // Loop foto (maksimal 4) dan gambar di canvas
        for (let i = 0; i < photos.length; i++) {
            if (i >= 4) break;
            const pImg = await loadImg(photos[i]);
            // Posisi hardcoded sederhana (tengah vertikal)
            ctx.drawImage(pImg, 50, 50 + (i * 320), 500, 300);
        }

        // Draw Frame Overlay di paling atas
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

  // --- RENDER UI (LANGSUNG TAMPIL TANPA LOADING SCREEN) ---
  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-y-auto font-sans text-slate-100 p-4 md:p-8">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Session ID: {sessionId ? sessionId.slice(-6) : '...'}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Scan Now, Download Fast! 🚀
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: PREVIEWS (Span 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* MAIN: Photo Strip */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📸</span> Your Result
                </h3>
                {compositePhoto && (
                  <Button variant="primary" size="sm" onClick={handleDownloadComposite} className="bg-blue-600 hover:bg-blue-700 border-none">
                    Download File
                  </Button>
                )}
              </div>
              
              <div className="w-full bg-slate-950/50 rounded-xl overflow-hidden border border-slate-800/50 p-4 flex justify-center min-h-[300px]">
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
                  // SKELETON LOADING UNTUK PREVIEW
                  <div className="flex flex-col items-center justify-center space-y-4 text-slate-500 py-20">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-sm">Generating your beautiful layout...</p>
                  </div>
                )}
              </div>
            </div>

            {/* SUB: GIF & Singles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GIF Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm">✨ Animation</h3>
                  {gifUrl && <button onClick={handleDownloadGif} className="text-xs text-blue-400 hover:text-blue-300">Save GIF</button>}
                </div>
                {gifUrl ? (
                   <div className="relative w-full aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800 animate-in fade-in">
                      <Image src={gifUrl} alt="GIF" fill className="object-cover" unoptimized />
                   </div>
                ) : (
                   <div className="w-full aspect-square bg-slate-950 rounded-lg flex items-center justify-center text-xs text-slate-600 animate-pulse">
                     Creating GIF...
                   </div>
                )}
              </div>

              {/* Originals */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                <h3 className="font-bold text-white text-sm mb-3">🎞️ Original Shots</h3>
                <div className="grid grid-cols-2 gap-2">
                  {capturedPhotos.length > 0 ? capturedPhotos.slice(0, 4).map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-slate-950 border border-slate-800">
                      <Image src={src} alt={`Shot ${idx}`} fill className="object-cover" unoptimized />
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500">Loading photos...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: QR & ACTIONS (Span 5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* QR Code Card - MUNCUL INSTAN */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center relative overflow-hidden">
              
              {/* Efek Pinggir kalau complete */}
              {status === 'complete' && (
                <div className="absolute inset-0 border-[3px] border-green-500/50 rounded-3xl animate-pulse pointer-events-none"></div>
              )}

              <h3 className="text-xl font-bold text-white mb-2">Scan to Download</h3>
              <p className="text-slate-400 text-sm mb-6">Open camera on your phone</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mb-6">
                {downloadUrl ? (
                   <QRCodeCanvas value={downloadUrl} size={200} level="H" />
                ) : (
                   <div className="w-[200px] h-[200px] bg-gray-200 animate-pulse rounded" />
                )}
              </div>
              
              {/* STATUS INDIKATOR DI BAWAH QR CODE (DINAMIS) */}
              <div className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-3 transition-all duration-500 
                ${status === 'complete' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : status === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}
              >
                {/* Ikon Status */}
                {status === 'complete' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : status === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                )}

                {/* Teks Status */}
                <span className="font-semibold text-sm">
                  {status === 'initializing' && 'Preparing session ID...'}
                  {status === 'processing' && 'Processing photos...'}
                  {status === 'uploading' && 'Syncing to cloud...'}
                  {status === 'complete' && 'Upload Complete! Ready.'}
                  {status === 'error' && 'Upload failed (Saved Locally)'}
                </span>
              </div>
              
              {/* Pesan Tambahan */}
              {status !== 'complete' && status !== 'error' && (
                <p className="text-xs text-slate-500 mt-3 animate-pulse">
                  You can scan now. The photos will appear on your phone automatically once processed.
                </p>
              )}

            </div>

            {/* Tombol Navigasi */}
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