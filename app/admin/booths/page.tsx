'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Monitor, 
  MapPin, 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone,
  Info,
  ArrowLeft,
  X,
  Settings // Ikon untuk assign event
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Booth {
  id: string;
  booth_name: string;
  booth_code: string;
  location: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  last_heartbeat: string;
  device_info: any;
  current_event_id: string;
  events: { id: string; name: string } | null; 
  stats: {
    photos_today: number;
    sessions_today: number;
    uptime_minutes: number;
  };
}

interface EventOption {
  id: string;
  name: string;
}

export default function MultiBoothDashboard() {
  const router = useRouter(); 
  const [booths, setBooths] = useState<Booth[]>([]);
  const [activeEvents, setActiveEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#10b981'); 
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchBooths();
    fetchTheme(); 
    fetchActiveEvents();

    const channel = supabase
    .channel('booth-status-changes')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'booths' }, 
        () => {
            fetchBooths();
        }
    )
    .subscribe();

    const photoChannel = supabase
    .channel('photo-updates')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'photo_sessions' }, 
        () => {
          fetchBooths();
        }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    supabase.removeChannel(photoChannel);
  };
}, []);

  const fetchTheme = async () => {
    const { data } = await supabase.from('theme_settings').select('primary_color').single();
    if (data?.primary_color) setPrimaryColor(data.primary_color);
  };

  const fetchActiveEvents = async () => {
    const { data } = await supabase.from('events').select('id, name').eq('is_active', true);
    if (data) setActiveEvents(data);
  };

  const fetchBooths = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('booths')
      .select(`*, events:current_event_id (id, name)`)
      .order('last_heartbeat', { ascending: false });
    
    if (data) {
      const boothsWithRealStats = await Promise.all(data.map(async (booth: any) => {
        const { count } = await supabase
          .from('photo_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('booth_id', booth.id);

        return {
          ...booth,
          stats: { ...booth.stats, photos_today: count || 0 }
        };
      }));
      setBooths(boothsWithRealStats);
    }
    setLoading(false);
  };

  const handleAssignEvent = async (boothId: string, eventId: string) => {
    setIsAssigning(true);
    const { error } = await supabase
      .from('booths')
      .update({ current_event_id: eventId === 'none' ? null : eventId })
      .eq('id', boothId);

    if (error) {
      toast.error("Gagal update event");
    } else {
      toast.success("Event berhasil ditugaskan");
      setSelectedBooth(null);
      fetchBooths();
    }
    setIsAssigning(false);
  };

  // ✅ LOGIKA SINKRON: Deteksi Online (Kurang dari 2 menit)
  const isOnline = (lastHeartbeat: string) => {
    const lastSeen = new Date(lastHeartbeat).getTime();
    return (Date.now() - lastSeen) < 120000;
  };

  // Gunakan logika waktu yang ketat (misal 1 menit saja agar lebih responsif)
const activeBoothsCount = booths.filter(b => {
  if (!b.last_heartbeat) return false;
  const lastSeen = new Date(b.last_heartbeat).getTime();
  const diffInSeconds = (Date.now() - lastSeen) / 1000;
  return diffInSeconds < 60; // Hanya hitung yang kirim sinyal dalam 60 detik terakhir
}).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-200 shadow-sm bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 italic">Multi-Booth Control Center</h1>
            <p className="text-sm text-gray-500">Monitor infrastruktur photobooth real-time.</p>
          </div>
        </div>
        <div className="flex gap-2">
           <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm border"
             style={{ backgroundColor: `${primaryColor}10`, color: primaryColor, borderColor: `${primaryColor}30` }}>
             <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}/>
             {activeBoothsCount} Online
           </span>
        </div>
      </div>

      {loading && booths.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {booths.map((booth) => (
            <BoothCard 
              key={booth.id} 
              booth={booth} 
              primaryColor={primaryColor} 
              onDetail={() => setSelectedBooth(booth)}
              isOnline={isOnline(booth.last_heartbeat)}
            />
          ))}
        </div>
      )}

      {/* MODAL DETAIL & ASSIGN EVENT */}
      {selectedBooth && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-gray-400" />
                <h2 className="text-lg font-bold text-gray-800">Pengaturan Booth</h2>
              </div>
              <button onClick={() => setSelectedBooth(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Pilih Event Untuk Booth Ini</label>
                <select 
                  className="w-full p-3 rounded-xl border-2 bg-white focus:outline-none transition-all text-sm font-medium"
                  style={{ borderColor: `${primaryColor}20` }}
                  defaultValue={selectedBooth.current_event_id || 'none'}
                  onChange={(e) => handleAssignEvent(selectedBooth.id, e.target.value)}
                  disabled={isAssigning}
                >
                  <option value="none">-- Lepas dari Event --</option>
                  {activeEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-[10px] text-gray-400">*Hanya event dengan status 'Aktif' yang muncul di sini.</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-3">Informasi Teknis</p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl border">
                        <p className="text-[9px] text-gray-400 uppercase">Platform</p>
                        <p className="text-xs font-bold">{selectedBooth.device_info?.platform || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border">
                        <p className="text-[9px] text-gray-400 uppercase">Layar</p>
                        <p className="text-xs font-bold">{selectedBooth.device_info?.screen || '-'}</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoothCard({ booth, primaryColor, onDetail, isOnline }: { booth: Booth, primaryColor: string, onDetail: () => void, isOnline: boolean }) {
  const currentStatus = isOnline ? 'online' : 'offline';

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 bg-white p-5 transition-all duration-300`}
      style={{ borderColor: isOnline ? primaryColor : '#f3f4f6', transform: isOnline ? 'scale(1.02)' : 'scale(1)', boxShadow: isOnline ? `0 10px 30px -10px ${primaryColor}40` : 'none' }}>
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl transition-colors" style={{ backgroundColor: isOnline ? `${primaryColor}15` : '#f3f4f6' }}>
            <Monitor size={22} style={{ color: isOnline ? primaryColor : '#9ca3af' }} />
          </div>
          <div className="max-w-[140px]">
            <h3 className="font-black text-gray-900 truncate text-sm uppercase tracking-tight">
              {booth.events?.name || booth.booth_name}
            </h3>
            <p className="text-[9px] text-gray-400 font-mono font-bold italic">ID: {booth.booth_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
          style={{ backgroundColor: isOnline ? `${primaryColor}20` : '#f3f4f6', color: isOnline ? primaryColor : '#6b7280' }}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'animate-ping' : ''}`} style={{ backgroundColor: isOnline ? primaryColor : '#9ca3af' }} />
          {currentStatus}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 mb-6">
        <div className="text-center">
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Photos</p>
          <p className="text-2xl font-black text-gray-800 italic">{booth.stats?.photos_today || 0}</p>
        </div>
        <div className="text-center border-l">
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Last Seen</p>
          <p className="text-[10px] font-bold text-gray-600 mt-2">
            {formatDistanceToNow(new Date(booth.last_heartbeat), { addSuffix: true, locale: id })}
          </p>
        </div>
      </div>

      <button onClick={onDetail} className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border group"
        style={{ color: isOnline ? primaryColor : '#64748b', borderColor: isOnline ? `${primaryColor}30` : '#e2e8f0' }}>
        <Settings size={14} className="group-hover:rotate-90 transition-transform" />
        Detail & Assign
      </button>
    </div>
  );
}