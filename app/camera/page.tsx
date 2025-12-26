// app/camera/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; 
import { supabase } from '@/lib/supabase'; 
import { Frame } from '@/types';
import toast from 'react-hot-toast';

// --- ICON COMPONENTS (Tetap Sama) ---
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export default function FrameSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(true);

  // --- LOGIKA FETCH FRAME (OFFLINE SUPPORT + FILTER EVENT) ---
  // LOGIKA INI TIDAK SAYA UBAH SAMA SEKALI
  useEffect(() => {
    const fetchFrames = async () => {
      // 0. AMBIL ID EVENT AKTIF
      const urlEventId = searchParams.get('eventId');
      const storageEventId = localStorage.getItem('active_event_id') || sessionStorage.getItem('active_event_id');
      
      const currentEventId = urlEventId || storageEventId;

      console.log("Fetching frames for Event ID:", currentEventId || "GLOBAL MODE");

      if (urlEventId) {
        localStorage.setItem('active_event_id', urlEventId);
      }
      
      const cacheKey = currentEventId ? `cached_frames_${currentEventId}` : 'cached_frames_global';

      // 1. CEK CACHE LOKAL DULU
      const cachedFrames = localStorage.getItem(cacheKey);
      if (cachedFrames) {
        try {
          const parsed = JSON.parse(cachedFrames);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFrames(parsed);
            setLoading(false);
          }
        } catch (err) {
          console.error("Error parsing cache:", err);
        }
      }

      // 2. FETCH KE SERVER (Supabase Direct Query)
      if (navigator.onLine) {
        try {
          let query = supabase
            .from('frames')
            .select('*')
            .eq('is_active', true);

          if (currentEventId) {
            query = query.or(`event_id.is.null,event_id.eq.${currentEventId}`);
          } else {
            query = query.is('event_id', null);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) throw error;
          
          if (data && data.length > 0) {
            setFrames(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
            
            data.forEach((f) => {
                if (f.cloudinary_url) {
                    const img = new window.Image();
                    img.src = f.cloudinary_url;
                }
            });
          } else if (!cachedFrames) {
             setFrames([]);
          }

        } catch (error) {
          console.error('Error fetching frames:', error);
          if (!cachedFrames) toast.error('Gagal memuat frame. Periksa koneksi.');
        } finally {
          setLoading(false);
        }
      } else {
        if (!cachedFrames) {
            toast.error("Offline Mode: Tidak ada frame tersimpan untuk event ini.");
            setLoading(false);
        }
      }
    };

    fetchFrames();
  }, [searchParams]);

  const handleStart = () => {
    if (!selectedFrame) {
      toast.error('Silakan pilih bingkai terlebih dahulu');
      return;
    }
    sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));
    router.push('/capture'); 
  };

  return (
    // 1. CONTAINER UTAMA
    <div 
      className="min-h-screen w-full relative flex flex-col font-sans overflow-hidden transition-colors duration-500"
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        color: 'var(--foreground)' 
      }}
    >
      
      {/* 2. BACKGROUND EFFECTS */}
      <div 
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20" 
        style={{ backgroundColor: 'var(--primary-color)' }}
      />
      <div 
        className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{ backgroundColor: 'var(--secondary-color)' }}
      />

      {/* --- HEADER --- */}
      <header className="w-full pt-10 pb-6 px-6 text-center z-10">
        <div 
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 backdrop-blur-sm border"
          style={{ 
            backgroundColor: 'rgba(128,128,128, 0.1)', 
            borderColor: 'rgba(128,128,128, 0.2)',
            color: 'inherit',
            opacity: 0.8
          }}
        >
          Langkah 1 dari 3
        </div>
        
        <h1 
          className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent"
          style={{ 
            backgroundImage: 'linear-gradient(to right, var(--foreground), rgba(var(--foreground-rgb), 0.5))',
            color: 'var(--foreground)' // Fallback
          }}
        >
          Pilih Gaya Bingkai
        </h1>
        
        <p className="text-xs md:text-sm max-w-lg mx-auto opacity-60">
          Pilih desain bingkai yang sesuai dengan gaya acaramu.
        </p>
      </header>

      {/* --- CONTENT SLIDER (HORIZONTAL) --- */}
      {/* Kita ubah overflow-y-auto menjadi overflow-x-auto dan atur flex */}
      <main className="flex-1 w-full flex flex-col justify-center pb-24 z-10">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50 gap-3">
            <LoaderIcon />
            <p>Memuat bingkai...</p>
          </div>
        ) : (
          !frames || frames?.length === 0 ? (
            <div 
              className="mx-auto text-center py-20 rounded-2xl border border-dashed max-w-md"
              style={{ 
                backgroundColor: 'rgba(128,128,128, 0.05)', 
                borderColor: 'rgba(128,128,128, 0.2)' 
              }}
            >
              <p className="mb-2 opacity-60">Tidak ada bingkai tersedia.</p>
              <p className="text-xs opacity-40">Hubungi admin untuk menambahkan bingkai ke event ini.</p>
            </div>
          ) : (
            // ✅ CONTAINER UTAMA SLIDER
            // Menggunakan flex-row, overflow-x-auto (scroll samping), snap-x
            <div 
                className="w-full flex flex-row overflow-x-auto gap-6 px-8 md:px-12 py-8 snap-x snap-mandatory items-center"
                style={{
                    scrollbarWidth: 'none', // Hide scrollbar Firefox
                    msOverflowStyle: 'none' // Hide scrollbar IE
                }}
            >
              {/* Hide Scrollbar Chrome */}
              <style jsx global>{`
                div::-webkit-scrollbar { display: none; }
              `}</style>

              {frames.map((frame) => {
                const isSelected = selectedFrame?.id === frame.id;
                
                return (
                  <div
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame)}
                    // ✅ CARD ITEM
                    // Tambahkan: flex-shrink-0 (agar tidak gepeng), snap-center (agar berhenti di tengah), w-[ukuran tetap]
                    className={`group relative cursor-pointer rounded-2xl transition-all duration-300 ease-out overflow-hidden flex-shrink-0 snap-center w-[180px] md:w-[220px]
                      ${isSelected ? 'scale-[1.02] z-10 shadow-2xl' : 'hover:-translate-y-1'}
                    `}
                    // ✅ STYLE TETAP SAMA SEPERTI ASLINYA (Bounding Box, Background Abu, dll)
                    style={{
                      border: isSelected ? '3px solid var(--primary-color)' : '1px solid rgba(128,128,128, 0.1)',
                      backgroundColor: 'rgba(128,128,128, 0.05)',
                      boxShadow: isSelected ? '0 0 30px -10px var(--primary-color)' : 'none'
                    }}
                  >
                    {/* Checkmark Badge */}
                    {isSelected && (
                      <div 
                        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200"
                        style={{ 
                          backgroundColor: 'var(--primary-color)', 
                          color: 'var(--bg-color)' 
                        }}
                      >
                        <CheckIcon />
                      </div>
                    )}

                    {/* Frame Preview */}
                    <div className="p-4 flex items-center justify-center aspect-[2/3] relative overflow-hidden rounded-t-2xl">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                      
                      <img
                        src={frame.cloudinary_url}
                        alt={frame.name}
                        className={`w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 
                          ${isSelected ? 'scale-95' : 'group-hover:scale-105'}
                        `}
                      />
                    </div>

                    {/* Frame Info */}
                    <div 
                      className="px-4 py-4 border-t transition-colors"
                      style={{ 
                          borderColor: 'rgba(128,128,128, 0.1)',
                          backgroundColor: isSelected ? 'rgba(var(--primary-color-rgb), 0.05)' : 'transparent'
                      }}
                    >
                      <h3 
                        className="font-semibold text-sm truncate transition-colors"
                        style={{ color: isSelected ? 'var(--primary-color)' : 'var(--foreground)' }}
                      >
                        {frame.name}
                      </h3>
                      <p className="text-xs mt-1 opacity-50">
                        {frame.photo_slots?.length || 3} Pose
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {/* Spacer agar item terakhir bisa digeser ke tengah layar */}
              <div className="w-4 flex-shrink-0 h-10"></div>
            </div>
          )
        )}
      </main>

      {/* --- FOOTER / ACTION BAR --- */}
      <div 
        className="fixed bottom-0 left-0 w-full backdrop-blur-md border-t py-4 px-6 z-50 transition-colors"
        style={{ 
          backgroundColor: 'rgba(var(--bg-color-rgb), 0.8)',
          borderColor: 'rgba(128,128,128, 0.1)'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 rounded-full hover:bg-white/5 transition-all font-medium text-sm opacity-60 hover:opacity-100"
            style={{ color: 'var(--foreground)' }}
          >
            <ArrowLeftIcon />
            Kembali
          </button>

          <button
            onClick={handleStart}
            disabled={!selectedFrame}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg transition-all transform shadow-lg
              ${!selectedFrame ? 'cursor-not-allowed grayscale opacity-50' : 'hover:scale-105 active:scale-95 cursor-pointer'}
            `}
            style={selectedFrame ? { 
              background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px var(--primary-color)'
            } : {
              backgroundColor: 'rgba(128,128,128, 0.2)',
              color: 'rgba(128,128,128, 0.5)'
            }}
          >
            Mulai Foto
            <ArrowRightIcon />
          </button>

        </div>
      </div>

    </div>
  );
}