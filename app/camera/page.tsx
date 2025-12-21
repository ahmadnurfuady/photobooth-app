// app/camera/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import toast from 'react-hot-toast';

// Icon Components (Inline SVG)
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
  // Inisialisasi dengan array kosong []
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Frames dengan Debugging & Auto-Detect
  useEffect(() => {
    const fetchFrames = async () => {
      try {
        const response = await fetch('/api/frames');
        const data = await response.json();
        
        // 1. Deteksi Array Frames
        let validFrames: Frame[] = [];
        if (Array.isArray(data)) {
          validFrames = data;
        } else if (Array.isArray(data.frames)) {
          validFrames = data.frames;
        } else if (Array.isArray(data.data)) {
          validFrames = data.data;
        }

        // 🔍 DEBUG: Cek struktur data frame di Console
        console.log("Raw Frames:", validFrames);

        // ✅ 2. FILTERING: Hanya ambil yang statusnya 'active'
        // NOTE: Pastikan nama field-nya sesuai database kamu (misal: 'status', 'isActive', 'published')
        // Di sini saya asumsikan field-nya bernama 'status' dan valuenya 'active'
        const activeFrames = validFrames.filter((frame: any) => {
           // Cek variasi kemungkinan status aktif
           return frame.status === 'active' || frame.is_active === true || frame.status === 'published';
        });

        console.log("✅ Active Frames Only:", activeFrames);
        setFrames(activeFrames);

      } catch (error) {
        console.error('Error fetching frames:', error);
        toast.error('Error loading frames');
        setFrames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFrames();
  }, []);

  const handleStart = () => {
    if (!selectedFrame) {
      toast.error('Please select a frame first');
      return;
    }
    // Simpan frame pilihan ke session storage
    sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));
    router.push('/capture');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 relative flex flex-col font-sans text-slate-100 overflow-hidden">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* --- HEADER --- */}
      <header className="w-full pt-10 pb-6 px-6 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-medium mb-4 backdrop-blur-sm">
          Step 1 of 3
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
          Choose Your Vibe
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
          Select a frame design that matches your style to begin the photo session.
        </p>
      </header>

      {/* --- CONTENT GRID --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pb-24 z-10 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
            <LoaderIcon />
            <p>Loading frames...</p>
          </div>
        ) : (
          // ✅ PERBAIKAN 1: Gunakan Optional Chaining (?.) untuk mencegah crash "undefined reading length"
          !frames || frames?.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
              <p className="text-slate-400 mb-2">No frames available yet.</p>
              <p className="text-xs text-slate-600">Please add frames via Admin Dashboard.</p>
            </div>
          ) : (
            // ✅ PERBAIKAN 2: Tambahkan Padding (p-4) agar kartu tidak terpotong saat di-hover/scale
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 p-4">
              {frames.map((frame) => {
                const isSelected = selectedFrame?.id === frame.id;
                
                return (
                  <div
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame)}
                    className={`group relative cursor-pointer rounded-2xl transition-all duration-300 ease-out 
                      ${isSelected 
                        ? 'bg-slate-800 ring-2 ring-blue-500 scale-[1.02] shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] z-10' 
                        : 'bg-slate-900/40 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 hover:-translate-y-1'
                      }
                    `}
                  >
                    {/* Selection Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-20 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-200">
                        <CheckIcon />
                      </div>
                    )}

                    {/* Frame Preview Container */}
                    <div className="p-4 flex items-center justify-center aspect-[2/3] relative overflow-hidden rounded-t-2xl">
                      {/* Background Glow behind image */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/20 pointer-events-none" />
                      
                      <img
                        src={frame.cloudinary_url}
                        alt={frame.name}
                        className={`w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 
                          ${isSelected ? 'scale-95' : 'group-hover:scale-105'}
                        `}
                      />
                    </div>

                    {/* Frame Info Footer */}
                    <div className="px-4 py-4 border-t border-white/5">
                      <h3 className={`font-semibold text-sm truncate transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                        {frame.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {frame.photo_slots?.length || frame.frame_config?.photo_count || 3} Photos
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* --- FOOTER / ACTION BAR --- */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-md border-t border-slate-800 py-4 px-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium text-sm"
          >
            <ArrowLeftIcon />
            Back to Home
          </button>

          <button
            onClick={handleStart}
            disabled={!selectedFrame}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg transition-all transform shadow-lg
              ${selectedFrame 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 hover:shadow-blue-500/25 active:scale-95 cursor-pointer' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale opacity-50'
              }
            `}
          >
            Start Photo Session
            <ArrowRightIcon />
          </button>

        </div>
      </div>

    </div>
  );
}