'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Loader2, Clock, Maximize2, Minimize2, Lock, KeyRound } from 'lucide-react';

type Photo = {
  id: string;
  cloudinary_url: string;
  created_at: string;
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

export default function LiveFeedPage() {
  const params = useParams();
  const urlParam = params.code as string; // Bisa berupa Kode Akses ATAU ID Event

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [eventName, setEventName] = useState('');
  
  const [primaryColor, setPrimaryColor] = useState('#3b82f6'); 
  const [secondaryColor, setSecondaryColor] = useState('#a855f7'); 
  const [bgColor, setBgColor] = useState('#f8fafc'); 
  
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [accessCodeDisplay, setAccessCodeDisplay] = useState(''); // Untuk display di header
  const [currentTime, setCurrentTime] = useState('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  // 🔒 PIN Logic
  const [isLocked, setIsLocked] = useState(true);
  const [eventPin, setEventPin] = useState<string | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // JAM DIGITAL
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // SOFT KIOSK LOGIC
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

  // FETCH DATA (LOGIC BARU: DUKUNG UUID & KODE AKSES)
  useEffect(() => {
    const initData = async () => {
      // Cek apakah parameter URL adalah UUID (ID Panjang) atau Kode Pendek
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlParam);

      let query = supabase
        .from('events')
        .select('id, name, access_code, primary_color, secondary_color, background_color, pin');

      // 🔥 LOGIC PINTAR:
      if (isUUID) {
         // Jika URL pakai ID Panjang (Rahasia), cari berdasarkan ID
         query = query.eq('id', urlParam);
      } else {
         // Jika URL pakai Kode (FUAD1234), cari berdasarkan Access Code
         query = query.eq('access_code', urlParam.toUpperCase());
      }

      const { data: event } = await query.single();

      if (!event) {
        setLoading(false);
        return;
      }

      setEventName(event.name);
      setEventId(event.id);
      
      // Simpan Kode Akses asli untuk ditampilkan di Header (hanya visual)
      // Jadi meskipun URL-nya ID acak, di layar tetap tampil "Kode: FUAD1234" agar tamu tahu.
      setAccessCodeDisplay(event.access_code);

      // Cek PIN
      if (event.pin && event.pin.trim() !== '') {
          setEventPin(event.pin);
          setIsLocked(true);
      } else {
          setIsLocked(false);
      }
      
      if (event.primary_color) setPrimaryColor(event.primary_color);
      if (event.secondary_color) setSecondaryColor(event.secondary_color); 
      if (event.background_color) setBgColor(event.background_color);

      // Load Photos
      const { data: existingPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (existingPhotos) {
        setPhotos(existingPhotos);
      }
      setLoading(false);
    };

    initData();
  }, [urlParam]); // Trigger ulang jika URL berubah

  // REALTIME UPDATE
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel('live_photos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const newPhoto = payload.new as Photo;
          setPhotos((prev) => [newPhoto, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => console.error(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputPin === eventPin) {
          setIsLocked(false);
          setErrorMsg('');
      } else {
          setErrorMsg('PIN Salah!');
          setInputPin('');
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
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Event Tidak Ditemukan</div>;
  }

  // --- LOCK SCREEN ---
  if (isLocked) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center font-sans bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl text-center border border-gray-100">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Restricted Access</h2>
                <p className="text-gray-500 text-sm mb-8">
                    Masukkan PIN Event untuk membuka tampilan.
                </p>
                <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="password" 
                            value={inputPin}
                            onChange={(e) => setInputPin(e.target.value)}
                            placeholder="PIN Event"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center tracking-widest font-mono"
                            autoFocus
                        />
                    </div>
                    {errorMsg && <p className="text-red-500 text-sm font-bold animate-pulse">{errorMsg}</p>}
                    <button type="submit" className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-colors">
                        BUKA LAYAR
                    </button>
                </form>
                <p className="mt-6 text-xs text-gray-300 uppercase tracking-widest">SnapBooth Security</p>
            </div>
        </div>
      );
  }

  // --- LIVE FEED RENDER ---
  const shouldAnimate = photos.length > 1;

  const renderPhotos = () => (
    <>
        {photos.map((photo, index) => (
            <div key={`${photo.id}-orig-${index}`} className="relative flex-shrink-0 group" style={{ height: '50vh' }}>
                <div className="h-full w-auto p-3 rounded-2xl shadow-xl transform transition-transform duration-500 group-hover:scale-105 bg-white"
                     style={{ boxShadow: `0 15px 30px -5px ${hexToRgba(primaryColor, 0.15)}` }}>
                    <img src={photo.cloudinary_url} alt="Live" className="h-full w-auto object-contain rounded-xl bg-gray-50" loading="eager" />
                </div>
            </div>
        ))}
        {shouldAnimate && photos.map((photo, index) => (
            <div key={`${photo.id}-shadow-${index}`} className="relative flex-shrink-0 group" style={{ height: '50vh' }}>
                <div className="h-full w-auto p-3 rounded-2xl shadow-xl transform transition-transform duration-500 group-hover:scale-105 bg-white"
                     style={{ boxShadow: `0 15px 30px -5px ${hexToRgba(primaryColor, 0.15)}` }}>
                    <img src={photo.cloudinary_url} alt="Live" className="h-full w-auto object-contain rounded-xl bg-gray-50" loading="eager" />
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
           {/* Tampilkan Kode Akses untuk Tamu, meskipun URL-nya ID Rahasia */}
           Live Gallery 
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
         <div className="flex items-center justify-center gap-3 mt-4 opacity-50">
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-gray-400"></span>
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-500">Powered by SnapBooth</p>
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-gray-400"></span>
         </div>

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