// app/download/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { LoadingOverlay } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// Init Supabase (Client Side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DownloadPage() {
  const params = useParams();
  const id = params?.id as string;

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  // Ambil URL browser saat ini untuk fitur copy link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        const { data, error: sbError } = await supabase
          .from('photo_sessions') // Nama tabel sesuai struktur yang Anda berikan
          .select('*')
          .eq('id', id)
          .single();

        if (sbError) throw sbError;
        
        setSessionData(data);
        setError(''); // Clear error jika data ditemukan
      } catch (err: any) {
        console.error("Error fetching session:", err);
        // Tetap set error jika data memang belum ada di database
        setError("Photo not yet uploaded."); 
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // Mekanisme Auto-Polling: Cek database setiap 10 detik jika data belum ada
    const interval = setInterval(() => {
      if (!sessionData) {
        fetchSession();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [id, sessionData]);

  // Fungsi Helper Download
  const handleDownload = async (url: string, filename: string) => {
    try {
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
    } catch (e) {
      alert('Download failed. Try long-pressing the image to save.');
    }
  };

  // --- FITUR BARU: DOWNLOAD SEMUA FOTO INDIVIDUAL SEKALIGUS ---
  const downloadIndividualPhotos = async () => {
    if (!sessionData?.photos || !Array.isArray(sessionData.photos)) {
      toast.error("Photos not available");
      return;
    }
    
    toast.success('Downloading individual photos...');
    
    sessionData.photos.forEach((photo: any, index: number) => {
      // Menggunakan timeout agar browser tidak memblokir multiple download
      setTimeout(() => {
        handleDownload(photo.url, `photo-original-${index + 1}.jpg`);
      }, index * 1000);
    });
  };

  // Fungsi Copy Link
  const handleCopyLink = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      toast.success('Link copied! Open it later when online.');
    }
  };

  if (loading && !error) return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--foreground)' }}
    >
      <LoadingOverlay message="Looking for your photos..." />
    </div>
  );

  // --- TAMPILAN JIKA ERROR / BELUM UPLOAD (OFFLINE SCENARIO) ---
  if (error || !sessionData) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--foreground)' }}
      >
        {/* Background Effect Samar */}
        <div className="absolute top-[-20%] left-0 w-full h-full pointer-events-none opacity-20">
            <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] rounded-full blur-[80px]" style={{ backgroundColor: 'var(--secondary-color)' }} />
        </div>

        <div className="w-20 h-20 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20 animate-pulse">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        
        <h1 className="text-3xl font-extrabold mb-3">Photos Syncing...</h1>
        
        <p className="opacity-70 max-w-sm mb-8 leading-relaxed">
          The booth is currently <strong>Offline</strong> or syncing. Your photos are safe but haven't reached the cloud yet. This page will update automatically.
        </p>

        {/* AREA COPY LINK PENTING */}
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left shadow-xl backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-wider opacity-50 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                Save this link
            </p>
            <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                <code className="text-xs flex-1 truncate opacity-80 select-all font-mono italic">
                    {currentUrl || "Loading link..."}
                </code>
                <button 
                    onClick={handleCopyLink}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    title="Copy Link"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
            </div>
            <p className="text-[10px] mt-3 opacity-50 italic text-center">
                ℹ️ Copy this link now. Once the photobooth goes online, this page will show your photos.
            </p>
        </div>

        <Button 
            onClick={() => window.location.reload()} 
            className="w-full max-w-sm py-3 border bg-transparent hover:bg-white/5 transition-all font-bold"
            style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)' }}
        >
            Try Refreshing Manually
        </Button>
      </div>
    );
  }

  // --- TAMPILAN UTAMA (JIKA FOTO ADA) ---
  return (
    <div 
        className="h-screen w-full relative font-sans p-4 flex flex-col items-center justify-center overflow-hidden"
        style={{ 
            backgroundColor: 'var(--bg-color)', 
            color: 'var(--foreground)' 
        }}
    >
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div 
            className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--primary-color)', opacity: 0.15 }}
         />
         <div 
            className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--secondary-color)', opacity: 0.15 }}
         />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center justify-center h-full space-y-4">
        
        {/* Header - Ukuran disesuaikan agar tidak scroll */}
        <div className="text-center mb-2">
            <h1 
                className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent"
                style={{ 
                    backgroundImage: 'linear-gradient(to right, var(--foreground), rgba(255,255,255, 0.7))',
                    color: 'var(--foreground)'
                }}
            >
            Your Memories 📸
            </h1>
            <p className="text-xs opacity-60">Thanks for visiting!</p>
        </div>

        {/* Main Photo Card - Dibatasi tinggi visualnya (max-h) agar pas di layar */}
        <div 
            className="w-full bg-white/5 p-3 rounded-3xl border shadow-2xl backdrop-blur-md overflow-hidden"
            style={{ borderColor: 'rgba(128,128,128, 0.2)' }}
        >
            {sessionData.composite_url ? (
            <div className="relative w-full max-h-[50vh] aspect-[2/3] rounded-xl overflow-hidden shadow-lg bg-black/20">
                <Image 
                src={sessionData.composite_url} 
                alt="Photo Strip" 
                fill 
                className="object-contain"
                unoptimized
                priority
                />
            </div>
            ) : (
            <div className="h-64 flex items-center justify-center opacity-50">
                Photo processing...
            </div>
            )}
        </div>

        {/* Action Buttons - Ditambahkan Hover & Download Individual */}
        <div className="w-full space-y-2">
            {sessionData.composite_url && (
            <Button 
                onClick={() => handleDownload(sessionData.composite_url, `photobooth-${id}.jpg`)}
                className="w-full py-3 text-white shadow-lg font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:brightness-110 active:scale-95"
                style={{ 
                    backgroundColor: 'var(--primary-color)',
                    boxShadow: '0 4px 15px -5px var(--primary-color)'
                }}
            >
                Download Photo Strip
            </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
                {sessionData.gif_url && (
                <Button 
                    onClick={() => handleDownload(sessionData.gif_url, `photobooth-${id}.gif`)}
                    className="w-full py-3 text-white shadow-lg font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:brightness-110 active:scale-95 text-xs"
                    style={{ 
                        background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
                        opacity: 0.9
                    }}
                >
                    Download GIF
                </Button>
                )}

                <Button 
                    onClick={downloadIndividualPhotos}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 text-xs shadow-md"
                    style={{ color: 'var(--foreground)' }}
                >
                    Download All
                </Button>
            </div>
        </div>

        <p className="text-[10px] opacity-40 mt-2 text-center">
            Press and hold image to save manually if download fails.
        </p>

      </div>
    </div>
  );
}