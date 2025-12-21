// app/camera/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import toast from 'react-hot-toast';

// --- ICON COMPONENTS ---
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
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(true);

  // --- LOGIKA FETCH FRAME (Sesuai kode aslimu) ---
  useEffect(() => {
    const fetchFrames = async () => {
      try {
        const response = await fetch('/api/frames');
        const data = await response.json();
        
        let validFrames: Frame[] = [];
        if (Array.isArray(data)) {
          validFrames = data;
        } else if (Array.isArray(data.frames)) {
          validFrames = data.frames;
        } else if (Array.isArray(data.data)) {
          validFrames = data.data;
        }

        // Filter active frames
        const activeFrames = validFrames.filter((frame: any) => {
           return frame.status === 'active' || frame.is_active === true || frame.status === 'published';
        });

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
    sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));
    
    // ✅ KEMBALI KE ROUTE ASLI KAMU: '/capture'
    // Jangan ke '/camera' karena kita sedang berada di file '/camera' (nanti looping)
    router.push('/capture'); 
  };

  return (
    // 1. CONTAINER UTAMA: Paksa Style Custom Theme
    <div 
      className="min-h-screen w-full relative flex flex-col font-sans overflow-hidden transition-colors duration-500"
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        color: 'var(--foreground)' 
      }}
    >
      
      {/* 2. BACKGROUND EFFECTS: Pakai Primary & Secondary Color */}
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
          Step 1 of 3
        </div>
        
        {/* Title Gradient menggunakan Foreground */}
        <h1 
          className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent"
          style={{ 
            backgroundImage: 'linear-gradient(to right, var(--foreground), rgba(var(--foreground-rgb), 0.5))',
            color: 'var(--foreground)' // Fallback
          }}
        >
          Choose Your Vibe
        </h1>
        
        <p className="text-sm md:text-base max-w-lg mx-auto opacity-60">
          Select a frame design that matches your style to begin the photo session.
        </p>
      </header>

      {/* --- CONTENT GRID --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pb-24 z-10 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50 gap-3">
            <LoaderIcon />
            <p>Loading frames...</p>
          </div>
        ) : (
          !frames || frames?.length === 0 ? (
            <div 
              className="text-center py-20 rounded-2xl border border-dashed"
              style={{ 
                backgroundColor: 'rgba(128,128,128, 0.05)', 
                borderColor: 'rgba(128,128,128, 0.2)' 
              }}
            >
              <p className="mb-2 opacity-60">No frames available yet.</p>
              <p className="text-xs opacity-40">Please add frames via Admin Dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 p-4">
              {frames.map((frame) => {
                const isSelected = selectedFrame?.id === frame.id;
                
                return (
                  <div
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame)}
                    // 3. LOGIKA KARTU FRAME DINAMIS
                    className={`group relative cursor-pointer rounded-2xl transition-all duration-300 ease-out overflow-hidden
                      ${isSelected ? 'scale-[1.02] z-10 shadow-2xl' : 'hover:-translate-y-1'}
                    `}
                    style={{
                      // Border & Shadow mengikuti warna Primary dari Admin
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
                        {frame.photo_slots?.length || 3} Photos
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
            Back to Home
          </button>

          <button
            onClick={handleStart}
            disabled={!selectedFrame}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg transition-all transform shadow-lg
              ${!selectedFrame ? 'cursor-not-allowed grayscale opacity-50' : 'hover:scale-105 active:scale-95 cursor-pointer'}
            `}
            // 4. TOMBOL START DINAMIS (Gradient Custom)
            style={selectedFrame ? { 
              background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px var(--primary-color)'
            } : {
              backgroundColor: 'rgba(128,128,128, 0.2)',
              color: 'rgba(128,128,128, 0.5)'
            }}
          >
            Start Photo Session
            <ArrowRightIcon />
          </button>

        </div>
      </div>

    </div>
  );
}