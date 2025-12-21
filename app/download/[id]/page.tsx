// app/download/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { PhotoSession } from '@/types';
import toast from 'react-hot-toast';
// Import library untuk fitur ZIP
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function DownloadPage() {
  const params = useParams();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<PhotoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dots, setDots] = useState('');
  // State untuk loading tombol download ZIP
  const [zipping, setZipping] = useState(false);

  // Efek animasi titik-titik (...)
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // LOGIKA WAITING ROOM (POLLING)
  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchSession = async () => {
      try {
        // Pastikan nama tabel sesuai dengan di Supabase Anda ('photo_sessions' atau 'sessions')
        const { data, error } = await supabase
          .from('photo_sessions') 
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (error) {
          console.error("❌ Supabase Error:", JSON.stringify(error, null, 2));
          return; 
        }

        if (data) {
          if (isMounted) {
            // Casting data 'photos' dari JSONB ke array any agar bisa di-map
            setSession({ ...data, photos: data.photos as any[] } as PhotoSession);
            setLoading(false);
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchSession();
    intervalId = setInterval(fetchSession, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [sessionId]);

  // Fungsi Download Single File
  const handleDownload = async (url: string, filename: string) => {
    try {
      toast.loading("Preparing download...", { id: 'dl' });
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.dismiss('dl');
      toast.success("Download started!");
    } catch (err) {
      console.error('Download failed:', err);
      toast.error("Download failed. Try opening link in new tab.");
    }
  };

  // ✅ FITUR BARU: Download Semua Foto dalam ZIP
  const handleDownloadAllZip = async () => {
    if (!session?.photos || !Array.isArray(session.photos) || session.photos.length === 0) {
      toast.error("No individual photos found.");
      return;
    }

    try {
      setZipping(true);
      toast.loading("Creating ZIP file...", { id: 'zip' });
      const zip = new JSZip();
      const photoFolder = zip.folder("photos");

      // Fetch semua foto secara paralel
      const promises = session.photos.map(async (photo: any, index: number) => {
        if (!photo.url) return;
        const response = await fetch(photo.url);
        const blob = await response.blob();
        // Nama file di dalam ZIP: photo_1.jpg, photo_2.jpg, dst.
        photoFolder?.file(`photo_${index + 1}.jpg`, blob);
      });

      await Promise.all(promises);

      // Generate dan trigger download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `photobooth-originals-${sessionId.slice(0, 8)}.zip`);
      
      toast.dismiss('zip');
      toast.success("ZIP downloaded successfully!");
    } catch (error) {
      console.error("ZIP Error:", error);
      toast.error("Failed to create ZIP file.");
    } finally {
      setZipping(false);
    }
  };


  // --- TAMPILAN LOADING (WAITING ROOM) ---
  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl z-10">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          <h1 className="text-xl font-bold mb-2">Incoming Photos{dots}</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Please stay on this page, it will refresh automatically soon.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs py-2 px-4 rounded-full inline-block animate-pulse">
            Syncing with Photobooth...
          </div>
        </div>
      </div>
    );
  }

  // --- TAMPILAN ERROR ---
  if (error) {
    return (
      <div className="h-[100dvh] bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h1 className="text-red-500 text-xl font-bold mb-2">Oops!</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // --- TAMPILAN HASIL (LAYOUT SATU LAYAR COMPACT) ---
  return (
    // Gunakan h-[100dvh] untuk tinggi layar penuh di mobile (dynamic viewport height)
    // Gunakan flex flex-col untuk menata layout secara vertikal
    <div className="h-[100dvh] w-full bg-slate-950 relative font-sans text-slate-100 p-4 flex flex-col overflow-hidden">
      
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-green-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md mx-auto z-10 flex-1 flex flex-col w-full h-full">
        
        {/* HEADER (Flex-none: Ukuran tetap) */}
        <div className="text-center mb-2 flex-none pt-2">
          <div className="inline-block px-3 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold uppercase tracking-wider mb-2">
            Ready to Save
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-1">Here are your memories!</h1>
          <p className="text-slate-400 text-xs">Tap buttons below to download.</p>
        </div>

        {/* MAIN CARD (Flex-1: Mengisi sisa ruang agar pas satu layar) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 backdrop-blur-md shadow-2xl mb-3 flex-1 flex flex-col min-h-0">
          
          {/* IMAGE CONTAINER (Flex-1: Gambar menyesuaikan ruang yang ada) */}
          {session?.composite_url && (
            <div className="relative w-full flex-1 rounded-xl overflow-hidden bg-black/20 shadow-inner mb-3">
               <Image 
                 src={session.composite_url} 
                 alt="Photo Strip" 
                 fill 
                 // KUNCI LAYOUT: object-contain agar gambar tidak terpotong dan pas di wadahnya
                 className="object-contain p-1" 
                 unoptimized 
               />
            </div>
          )}
          
          {/* BUTTONS AREA (Flex-none: Ukuran tetap di bawah gambar) */}
          <div className="flex-none space-y-2">
             <Button 
               onClick={() => session?.composite_url && handleDownload(session.composite_url, `photobooth-strip-${sessionId.slice(0,6)}.jpg`)}
               className="w-full bg-blue-600 hover:bg-blue-700 py-5 text-sm font-bold shadow-lg shadow-blue-900/20"
             >
               Download Photo Strip
             </Button>

             <div className="grid grid-cols-2 gap-2">
                {session?.gif_url && (
                <Button 
                    variant="secondary"
                    onClick={() => session?.gif_url && handleDownload(session.gif_url, `photobooth-gif-${sessionId.slice(0,6)}.gif`)}
                    className="w-full bg-slate-800 hover:bg-slate-700 py-3 text-xs border border-slate-700"
                >
                    Download GIF
                </Button>
                )}
                {/* ✅ TOMBOL BARU: Download ZIP */}
                {session?.photos && (
                <Button 
                    variant="secondary"
                    onClick={handleDownloadAllZip}
                    disabled={zipping}
                    className="w-full bg-slate-800 hover:bg-slate-700 py-3 text-xs border border-slate-700 truncate"
                >
                    {zipping ? 'Zipping...' : 'Download All (ZIP)'}
                </Button>
                )}
             </div>
          </div>
        </div>

        {/* FOOTER (Flex-none: Ukuran tetap di paling bawah) */}
        <p className="text-center text-[10px] text-slate-600 flex-none pb-2">
           ID: {sessionId.slice(-8)} • Expires in 24h
        </p>

      </div>
    </div>
  );
}