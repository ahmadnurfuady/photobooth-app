'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Camera, 
  Image as ImageIcon, 
  RefreshCw, 
  ArrowLeft,
  LayoutGrid,
  List,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConsoleProps {
  params: Promise<{ id: string }>;
}

export default function EventConsole({ params }: ConsoleProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, booths: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchEventDetails();
    fetchPhotos();

    const channel = supabase
      .channel(`event-console-${eventId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'photo_sessions', filter: `event_id=eq.${eventId}` }, 
        () => { fetchPhotos(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const fetchEventDetails = async () => {
    const { data } = await supabase
      .from('events')
      .select('*, booths(count)')
      .eq('id', eventId)
      .single();
    if (data) setEvent(data);
  };

  const fetchPhotos = async () => {
    const { data, count } = await supabase
      .from('photo_sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setPhotos(data);
      setStats(prev => ({ ...prev, total: count || data.length }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full border border-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {event?.name || 'Loading Event...'}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono italic">ID: {eventId}</p>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-xl">
           <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}>
             <LayoutGrid size={18} />
           </button>
           <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}>
             <List size={18} />
           </button>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-7xl mx-auto">
        <StatCard icon={<ImageIcon size={20}/>} label="Total Photos" value={stats.total} color="text-blue-400" />
        <StatCard icon={<Camera size={20}/>} label="Active Booths" value={event?.booths?.[0]?.count || 0} color="text-emerald-400" />
      </div>

      {/* LIVE FEED */}
      <div className="max-w-7xl mx-auto">
        {photos.length === 0 ? (
          <div className="py-32 text-center border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-900/50">
            <RefreshCw className="w-12 h-12 text-slate-700 mx-auto mb-4 animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Menunggu Foto Pertama...</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" 
            : "flex flex-col gap-3 max-w-3xl mx-auto" // Fix: List tidak melebar
          }>
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} mode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-komponen untuk Kartu Foto agar rapi
function PhotoCard({ photo, mode }: { photo: any, mode: 'grid' | 'list' }) {
  const [error, setError] = useState(false);
  const imageUrl = photo.composite_url || (photo.photos && photo.photos.length > 0 ? photo.photos[0].url : null) || 
                   photo.gif_url;

  if (mode === 'list') {
    return (
      <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-slate-700 hover:bg-slate-800 transition-colors">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
          {!error ? (
            <img src={imageUrl} alt="Shoot" className="w-full h-full object-cover" onError={() => setError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600"><AlertCircle size={20}/></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-slate-400 truncate">ID: {photo.id}</p>
          <p className="text-xs font-bold text-white">{new Date(photo.created_at).toLocaleTimeString('id-ID')}</p>
        </div>
        <div className="text-[10px] bg-slate-700 px-2 py-1 rounded-md text-slate-400 font-bold uppercase">Ready</div>
      </div>
    );
  }

  return (
    <div className="group relative aspect-[3/4] bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all shadow-xl">
      {!error ? (
        <img 
          src={imageUrl} 
          alt="Shoot"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600 bg-slate-900">
          <AlertCircle size={24} />
          <span className="text-[10px] font-bold uppercase">Image Error</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
         <p className="text-[10px] font-mono text-slate-400 truncate">ID: {photo.id}</p>
         <p className="text-xs font-black text-white">{new Date(photo.created_at).toLocaleTimeString('id-ID')}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-3xl backdrop-blur-sm shadow-inner">
      <div className="flex items-center gap-2 mb-2 text-slate-500 uppercase text-[10px] font-black tracking-widest">
        {icon} {label}
      </div>
      <div className={`text-3xl font-black tracking-tighter ${color}`}>{value}</div>
    </div>
  );
}