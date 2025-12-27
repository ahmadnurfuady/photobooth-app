'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Loader2, Clock, Maximize2, Minimize2, Lock, KeyRound } from 'lucide-react';
// Tidak ada import QR Code lagi

type Photo = {
  id: string;
  cloudinary_url: string;
  created_at: string;
  is_hidden?: boolean;
};

// Helper transparansi warna
const hexToRgba = (hex: string, alpha: number) => {
  let c: any;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c= hex.substring(1).split('');
      if(c.length== 3){
          c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c= '0x'+c.join('');
      return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
  }
  return `rgba(255,255,255,${alpha})`;
}

// 🔥 POIN 2 (OPTIMASI): Fungsi untuk meminta gambar versi KECIL ke Cloudinary
// Ini akan mengubah URL gambar asli (besar) menjadi gambar lebar 600px + kompresi otomatis.
const getOptimizedUrl = (url: string) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    // Sisipkan parameter transformasi: w_600, q_auto (quality), f_auto (format)
    return url.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
};

export default function LiveFeedPage() {
  const params = useParams();
  const rawCode = params.code as string;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [eventName, setEventName] = useState('');
  
  const [primaryColor, setPrimaryColor] = useState('#3b82f6'); 
  const [secondaryColor, setSecondaryColor] = useState('#a855f7'); 
  const [bgColor, setBgColor] = useState('#f8fafc'); 
  
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [accessCodeDisplay, setAccessCodeDisplay] = useState(''); 
  const [currentTime, setCurrentTime] = useState('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  // Security State
  const [isLocked, setIsLocked] = useState(true);
  const [inputPin, setInputPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cursorTimer: NodeJS.Timeout;
    const handleMouseMove = () => {
        setShowCursor(true);
        clearTimeout(cursorTimer);
        cursorTimer = setTimeout(() => setShowCursor(false), 3000);
    };
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false; };
    const handleFsChange = () => { setIsFullscreen(!!document.fullscreenElement); };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFsChange);
    cursorTimer = setTimeout(() => setShowCursor(false), 3000);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('fullscreenchange', handleFsChange);
        clearTimeout(cursorTimer);
    };
  }, []);

  useEffect(() => {
    const initData = async () => {
      const cleanCode = rawCode.trim();
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanCode);
      
      let query = supabase
        .from('events')
        .select('id, name, access_code, primary_color, secondary_color, background_color'); 

      if (isUUID) {
         query = query.eq('id', cleanCode);
      } else {
         query = query.eq('access_code', cleanCode.toUpperCase());
      }

      const { data: event, error } = await query.single();

      if (error || !event) {
        setLoading(false);
        return;
      }

      setEventName(event.name);
      setEventId(event.id);
      setAccessCodeDisplay(event.access_code);

      // Cek Status Lock via API
      try {
          const authCheck = await fetch('/api/live-auth', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ mode: 'check_lock', event_id: event.id })
          });
          const authData = await authCheck.json();
          setIsLocked(authData.isLocked);
      } catch (e) {
          console.error("Auth check failed", e);
          setIsLocked(true); 
      }
      
      if (event.primary_color) setPrimaryColor(event.primary_color);
      if (event.secondary_color) setSecondaryColor(event.secondary_color); 
      if (event.background_color) setBgColor(event.background_color);

      // Fetch Awal (Limit 50 foto agar ringan)
      const { data: existingPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(50); // 🔥 LIMIT QUERY

      if (existingPhotos) {
        setPhotos(existingPhotos);
      }
      setLoading(false);
    };

    initData();
  }, [rawCode]);

  // Realtime Listener
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel('live_photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
              const newPhoto = payload.new as Photo;
              if (!newPhoto.is_hidden) {
                  // 🔥 POIN 2 (MEMORY OPTIMIZATION):
                  // Tambahkan foto baru di depan, lalu potong array agar maksimal tetap 50.
                  // Ini mencegah browser crash jika event berjalan lama.
                  setPhotos((prev) => {
                      const updated = [newPhoto, ...prev];
                      return updated.slice(0, 50); 
                  });
              }
          } else if (payload.eventType === 'UPDATE') {
              const updatedPhoto = payload.new as Photo;
              if (updatedPhoto.is_hidden) {
                  setPhotos((prev) => prev.filter(p => p.id !== updatedPhoto.id));
              }
          } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setPhotos((prev) => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // 🔥 POIN 1 (AUTO-HEALING): Internet Kedip / Reconnect Issue
  // Interval check setiap 1 menit untuk memastikan data sinkron jika internet sempat putus
  // Ini akan mengambil ulang 50 foto terbaru dari server secara diam-diam.
  useEffect(() => {
    if (!eventId) return;

    const silentRefresh = async () => {
      // Query yang sama persis dengan fetch awal
      const { data: freshPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (freshPhotos) {
        // Update state (React akan handle diffing agar tidak flickering parah)
        setPhotos(freshPhotos);
      }
    };

    // Jalankan setiap 60 detik (60000 ms)
    const interval = setInterval(silentRefresh, 60000);
    return () => clearInterval(interval);
  }, [eventId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => console.error(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsVerifying(true);
      setErrorMsg('');

      try {
          const res = await fetch('/api/live-auth', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  mode: 'verify', 
                  event_id: eventId, 
                  input_pin: inputPin 
              })
          });
          
          const data = await res.json();
          if (data.valid) {
              setIsLocked(false);
          } else {
              setErrorMsg('PIN Salah!');
              setInputPin('');
          }
      } catch (err) {
          setErrorMsg('Gagal verifikasi server');
      } finally {
          setIsVerifying(false);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin w-10 h-10 text-gray-300" />
      </div>
    );
  }

  if (!eventId) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-gray-400">
            <p className="text-xl font-bold">Event Tidak Ditemukan</p>
        </div>
    );
  }

  if (isLocked) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center font-sans bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl text-center border border-gray-100">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Restricted Access</h2>
                <p className="text-gray-500 text-sm mb-8">Event: <strong>{eventName}</strong></p>
                <form onSubmit={handleUnlock} className="space-y-4">
                    <input 
                        type="password" 
                        value={inputPin}
                        onChange={(e) => setInputPin(e.target.value)}
                        placeholder="PIN Event"
                        className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 text-lg text-center tracking-widest"
                        autoFocus
                        disabled={isVerifying}
                    />
                    {errorMsg && <p className="text-red-500 text-sm font-bold animate-pulse">{errorMsg}</p>}
                    <button type="submit" disabled={isVerifying} className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">
                        {isVerifying ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'BUKA LAYAR'}
                    </button>
                </form>
            </div>
        </div>
      );
  }

  const shouldAnimate = photos.length > 1;

  const renderPhotos = () => (
    <>
        {photos.map((photo, index) => (
            <div key={`${photo.id}-orig-${index}`} className="relative flex-shrink-0 group animate-in fade-in zoom-in duration-700" style={{ height: '50vh' }}>
                <div className="h-full w-auto p-3 rounded-2xl shadow-xl transform transition-transform duration-500 group-hover:scale-105 bg-white"
                     style={{ boxShadow: `0 15px 30px -5px ${hexToRgba(primaryColor, 0.15)}` }}>
                    {/* 🔥 GANTI SRC DENGAN VERSI OPTIMIZED */}
                    <img 
                        src={getOptimizedUrl(photo.cloudinary_url)} 
                        alt="Live" 
                        className="h-full w-auto object-contain rounded-xl bg-gray-50" 
                        loading="eager" 
                    />
                </div>
            </div>
        ))}
        {shouldAnimate && photos.map((photo, index) => (
            <div key={`${photo.id}-shadow-${index}`} className="relative flex-shrink-0 group animate-in fade-in zoom-in duration-700" style={{ height: '50vh' }}>
                <div className="h-full w-auto p-3 rounded-2xl shadow-xl transform transition-transform duration-500 group-hover:scale-105 bg-white"
                     style={{ boxShadow: `0 15px 30px -5px ${hexToRgba(primaryColor, 0.15)}` }}>
                    {/* 🔥 GANTI SRC DENGAN VERSI OPTIMIZED */}
                    <img 
                        src={getOptimizedUrl(photo.cloudinary_url)} 
                        alt="Live" 
                        className="h-full w-auto object-contain rounded-xl bg-gray-50" 
                        loading="eager" 
                    />
                </div>
            </div>
        ))}
    </>
  );

  return (
    <div 
      className="h-screen w-screen overflow-hidden relative flex flex-col justify-between font-sans transition-colors duration-700"
      style={{ 
          background: `linear-gradient(to bottom right, ${bgColor}, ${hexToRgba(secondaryColor, 0.05)})`,
          cursor: showCursor ? 'default' : 'none' 
      }}
    >
      <style jsx global>{`
        @keyframes scrollSeamless {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); } 
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER */}
      <div className="flex-none pt-10 pb-6 px-8 z-50 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 shadow-sm border border-white/20 backdrop-blur-md"
            style={{ 
                background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.1)}, ${hexToRgba(secondaryColor, 0.1)})`,
                color: primaryColor,
                borderColor: hexToRgba(primaryColor, 0.2)
            }}>
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: secondaryColor }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: primaryColor }}></span>
            </span>
           Live Gallery •  
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-sm mb-2"
            style={{ 
                background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: primaryColor
            }}>
          {eventName}
        </h1>
        <div className="flex items-center gap-2 text-gray-500 font-medium opacity-80 mt-1">
             <Clock size={14} />
             <span className="text-sm tracking-wide">{currentTime} • Welcome to the party!</span>
        </div>
      </div>

      {/* SLIDER TRACK */}
      <div className="flex-1 flex items-center w-full relative overflow-hidden">
        {photos.length === 0 ? (
           <div className="w-full flex flex-col items-center justify-center opacity-40">
             <div className="w-20 h-20 rounded-full animate-pulse mb-4 flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(primaryColor, 0.1) }}>
                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: hexToRgba(secondaryColor, 0.2) }} />
             </div>
             <p className="font-bold text-gray-400 text-lg">Menunggu foto pertama...</p>
           </div>
        ) : (
           <div 
              className="flex gap-8 px-8 items-center"
              style={{
                  width: shouldAnimate ? 'max-content' : '100%',
                  justifyContent: shouldAnimate ? 'flex-start' : 'center',
                  animation: shouldAnimate ? `scrollSeamless ${photos.length * 6}s linear infinite` : 'none',
              }}
              onMouseEnter={(e) => { if(shouldAnimate) e.currentTarget.style.animationPlayState = 'paused'; }}
              onMouseLeave={(e) => { if(shouldAnimate) e.currentTarget.style.animationPlayState = 'running'; }}
           > 
              {renderPhotos()}
           </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex-none pb-10 pt-6 px-8 z-50 text-center relative group">
         <div className="inline-block px-6 py-3 rounded-2xl backdrop-blur-md border border-white/40 shadow-sm"
            style={{ background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.05)}, ${hexToRgba(secondaryColor, 0.05)})` }}>
             <p className="text-sm md:text-base font-semibold italic bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, #334155, #64748b)` }}>
                "Capture every moment, share the joy! ✨"
             </p>
         </div>
        <div className="flex items-center justify-center gap-3 mt-3 opacity-50">
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-gray-400"></span>
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-500">Powered by SnapBooth</p>
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-gray-400"></span>
         </div>

         
         {/* FULLSCREEN BUTTON */}
         <button 
            onClick={toggleFullscreen}
            className={`absolute bottom-4 right-4 p-3 rounded-full text-gray-400 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg transition-all duration-300
                ${showCursor ? 'opacity-50 hover:opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
            `}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
         >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
         </button>
      </div>
    </div>
  );
}