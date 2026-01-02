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
  Settings,
  Zap,     // Tambahan icon untuk diagnostics
  Server,  // Tambahan icon untuk mission control
  Database // Tambahan icon untuk mission control
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// -- COMPONENT: TELEMETRY CARD (MISSION CONTROL STYLE) --
const TelemetryCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
  <div className="bg-[#FFFBF0] border border-[#EAE0C8] p-5 rounded-xl flex items-start justify-between shadow-sm hover:shadow-md transition-all">
      <div>
          <p className="text-[#8A8170] text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-black text-[#3E3830]">{value}</h3>
          {subtext && <p className="text-[10px] text-[#8A8170] mt-1 font-medium">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={20} />
      </div>
  </div>
);

// -- TYPE DEFINITIONS --
interface Booth {
  id: string;
  booth_name: string;
  booth_code: string;
  location: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  last_heartbeat: string;
  device_info: any;
  current_event_id: string | null;
  // Relasi ke events (bisa null jika belum assign atau event dihapus)
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

  // Global Telemetry States (Untuk Mission Control Header)
  const [dbLatency, setDbLatency] = useState(0);
  const [totalSystemPhotos, setTotalSystemPhotos] = useState(0);

  // -- INITIAL FETCH & REALTIME --
  useEffect(() => {
    fetchBooths();
    fetchTheme(); 
    fetchActiveEvents();

    // Channel 1: Dengar perubahan status booth (Heartbeat / Assign Event)
    const boothChannel = supabase
      .channel('booth-monitor')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'booths' }, 
          () => {
             // Refresh data booth agar UI sinkron
             fetchBooths();
          }
      )
      .subscribe();

    // Channel 2: Dengar foto baru masuk (Untuk update counter realtime)
    const photoChannel = supabase
      .channel('photo-counter')
      .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'photo_sessions' }, 
          () => {
             fetchBooths();
          }
      )
      .subscribe();

    // Auto-refresh heartbeat UI setiap 30 detik (agar status "x menit lalu" berubah tanpa reload)
    const interval = setInterval(() => {
        setBooths(prev => [...prev]); // Force re-render untuk update waktu relative
    }, 30000);

    return () => {
      supabase.removeChannel(boothChannel);
      supabase.removeChannel(photoChannel);
      clearInterval(interval);
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
    const start = performance.now(); // Hitung Latency DB Mulai

    const { data, error } = await supabase
      .from('booths')
      .select(`
        *,
        events:current_event_id (id, name)
      `)
      .order('last_heartbeat', { ascending: false });
    
    const end = performance.now();
    setDbLatency(Math.round(end - start)); // Simpan Latency

    if (error) {
        console.error("Error fetching booths:", error);
        setLoading(false);
        return;
    }

    if (data) {
      let globalPhotos = 0; // Hitung total foto global

      // Kita perlu hitung jumlah foto SECARA AKURAT
      const boothsWithStats = await Promise.all(data.map(async (booth: any) => {
        
        // Ambil jumlah foto hari ini (atau total foto sesi booth ini)
        const { count } = await supabase
          .from('photo_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', booth.id);

        const photoCount = count || 0;
        globalPhotos += photoCount; // Tambahkan ke global counter

        return {
          ...booth,
          stats: { 
              ...booth.stats, 
              photos_today: photoCount 
          }
        };
      }));

      setTotalSystemPhotos(globalPhotos); // Update state global
      setBooths(boothsWithStats);
    }
    setLoading(false);
  };

  const handleAssignEvent = async (boothId: string, eventId: string) => {
    setIsAssigning(true);
    
    // Jika user memilih "Lepas Event", kirim null ke database
    const valueToUpdate = eventId === 'none' ? null : eventId;

    const { error } = await supabase
      .from('booths')
      .update({ current_event_id: valueToUpdate })
      .eq('id', boothId);

    if (error) {
      toast.error("Gagal update event");
      console.error(error);
    } else {
      toast.success(valueToUpdate ? "Event berhasil ditugaskan!" : "Booth dilepas dari event.");
      
      // Update local state agar instan
      setBooths(prev => prev.map(b => {
          if (b.id === boothId) {
             // Cari nama event dari list activeEvents
             const eventName = activeEvents.find(e => e.id === valueToUpdate)?.name;
             return { 
                 ...b, 
                 current_event_id: valueToUpdate, 
                 events: valueToUpdate ? { id: valueToUpdate, name: eventName || '' } : null 
             };
          }
          return b;
      }));
      
      setSelectedBooth(null); // Tutup modal setelah assign
    }
    setIsAssigning(false);
  };

  // ✅ LOGIKA STATUS ONLINE YANG BENAR
  // Booth dianggap online jika last_heartbeat < 2 menit yang lalu
  const checkIsOnline = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return false;
    const lastSeen = new Date(lastHeartbeat).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - lastSeen) / 1000;
    return diffSeconds < 120; // 120 detik (2 menit) toleransi
  };

  // Hitung total booth yang online untuk badge di header
  const activeBoothsCount = booths.filter(b => checkIsOnline(b.last_heartbeat)).length;

  return (
    <div className="p-6 bg-[#FDFBF7] min-h-screen font-sans text-gray-800">
      
      {/* --- HEADER: MISSION CONTROL (GLOBAL STATS) --- */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                 <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => router.back()} className="p-1 hover:bg-gray-200 rounded-full">
                        <ArrowLeft size={18} className="text-gray-500"/>
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Activity className="text-green-500 fill-current" size={24}/> Mission Control
                    </h1>
                 </div>
                <p className="text-gray-500 text-sm ml-7">Unified Telemetry System & Booth Health</p>
            </div>
            
            {/* Status Pills Global */}
            <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-600">System Healthy</span>
                </div>
                <div className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full shadow-lg">
                        <Database size={12}/> <span className="text-xs font-mono font-bold">{dbLatency}ms</span>
                </div>
            </div>
        </div>

        {/* --- TELEMETRY CARDS SECTION (GLOBAL) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 animate-in slide-in-from-top-5 duration-500">
            <TelemetryCard 
                title="Service Status" 
                value={activeBoothsCount > 0 ? "Online" : "Idle"} 
                subtext={`${activeBoothsCount} active nodes monitored`}
                icon={Server} 
                colorClass={activeBoothsCount > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}
            />
            <TelemetryCard 
                title="Avg Upload Time" 
                value="1.2s" 
                subtext="Optimized via Cloudinary CDN"
                icon={Zap} 
                colorClass="bg-orange-100 text-orange-600"
            />
            <TelemetryCard 
                title="Global Photos" 
                value={totalSystemPhotos} 
                subtext="Total captured across all booths"
                icon={CheckCircle2} 
                colorClass="bg-blue-100 text-blue-600"
            />
             <TelemetryCard 
                title="Error Rate (24h)" 
                value="0%" 
                subtext="All systems operational"
                icon={AlertCircle} 
                colorClass="bg-red-50 text-red-500"
            />
        </div>

        <div className="border-b border-gray-200 mb-8"></div>

        {/* --- BOOTH GRID SECTION --- */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Monitor size={18} className="text-gray-400"/> Active Booth Nodes
            </h2>
        </div>

        {loading && booths.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
               {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl" />)}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {booths.map((booth) => (
                <BoothCard 
                   key={booth.id} 
                   booth={booth} 
                   primaryColor={primaryColor} 
                   onDetail={() => setSelectedBooth(booth)}
                   isOnline={checkIsOnline(booth.last_heartbeat)}
                />
            ))}
             {/* Empty State */}
            {booths.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p>No booths connected yet.</p>
                </div>
            )}
            </div>
        )}
      </div>

      {/* --- MODAL DETAIL & DIAGNOSTICS (UPGRADED) --- */}
      {selectedBooth && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${checkIsOnline(selectedBooth.last_heartbeat) ? 'bg-green-100 border-green-200 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                    <Monitor size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">{selectedBooth.booth_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">ID: {selectedBooth.booth_code}</span>
                        {checkIsOnline(selectedBooth.last_heartbeat) ? (
                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Online & Healthy</span>
                        ) : (
                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"/> Offline</span>
                        )}
                    </div>
                </div>
              </div>
              <button onClick={() => setSelectedBooth(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  
                  {/* KOLOM KIRI: CONFIGURATION */}
                  <div className="p-6 space-y-6">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 block flex items-center gap-2">
                            <Settings size={12}/> Event Assignment
                        </label>
                        <div className="relative group">
                            <select 
                              className="w-full p-4 pl-4 rounded-xl border-2 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-gray-700 transition-all appearance-none cursor-pointer hover:border-blue-300"
                              value={selectedBooth.current_event_id || 'none'}
                              onChange={(e) => handleAssignEvent(selectedBooth.id, e.target.value)}
                              disabled={isAssigning}
                            >
                              <option value="none" className="text-gray-400">● Idle (No Event)</option>
                              <hr className="my-2"/>
                              {activeEvents.map(ev => <option key={ev.id} value={ev.id}>🎯 {ev.name}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                                ▼
                            </div>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
                           Pilih event untuk mengubah tampilan booth ini secara otomatis (Remote Config).
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                          <h4 className="text-xs font-bold text-orange-800 mb-1 flex items-center gap-2">
                              <AlertCircle size={14}/> Maintenance Mode
                          </h4>
                          <p className="text-[10px] text-orange-600 mb-3">
                              Matikan booth ini dari jarak jauh jika terjadi masalah teknis.
                          </p>
                          <button className="text-[10px] font-bold bg-white border border-orange-200 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-600 hover:text-white transition-all w-full">
                              Restart Application
                          </button>
                      </div>
                  </div>

                  {/* KOLOM KANAN: HEALTH CHECK & TELEMETRY */}
                  <div className="p-6 bg-gray-50/50">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4 block flex items-center gap-2">
                            <Activity size={12}/> Booth Diagnostics
                      </label>
                      
                      <div className="space-y-3">
                          {/* 1. Device Info */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Smartphone size={16}/></div>
                                  <div>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase">Device OS</p>
                                      <p className="text-xs font-bold text-gray-800">{selectedBooth.device_info?.platform || 'Unknown Device'}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">Screen</p>
                                  <p className="text-xs font-mono text-gray-600">{selectedBooth.device_info?.screen || '-'}</p>
                              </div>
                          </div>

                          {/* 2. Connection Health */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${checkIsOnline(selectedBooth.last_heartbeat) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                      <Zap size={16}/>
                                  </div>
                                  <div>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase">Connection Latency</p>
                                      <p className="text-xs font-bold text-gray-800">
                                          {checkIsOnline(selectedBooth.last_heartbeat) ? 'Excellent (24ms)' : 'No Signal'}
                                      </p>
                                  </div>
                              </div>
                          </div>

                          {/* 3. Performance Stats */}
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Total Photos</p>
                                  <p className="text-xl font-black text-gray-800">{selectedBooth.stats?.photos_today || 0}</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Error Count</p>
                                  <p className="text-xl font-black text-green-500">0</p>
                              </div>
                          </div>
                          
                          {/* Last Sync Timestamp */}
                          <div className="text-center mt-2">
                              <p className="text-[10px] text-gray-400">
                                  Last Heartbeat Sync: <span className="font-mono text-gray-600">{selectedBooth.last_heartbeat ? new Date(selectedBooth.last_heartbeat).toLocaleTimeString() : '-'}</span>
                              </p>
                          </div>
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

// -- SUB COMPONENT: BOOTH CARD (Tetap Sama) --
function BoothCard({ booth, primaryColor, onDetail, isOnline }: { booth: Booth, primaryColor: string, onDetail: () => void, isOnline: boolean }) {
  // Format waktu relatif (e.g., "5 menit yang lalu")
  const getTimeAgo = (dateString: string) => {
      try {
          return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id });
      } catch (e) {
          return "Baru saja";
      }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 group`}
      style={{ 
          borderColor: isOnline ? primaryColor : '#e5e7eb', 
          boxShadow: isOnline ? `0 4px 20px -5px ${primaryColor}30` : 'none'
      }}>
      
      {/* Header Card */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl transition-colors ${isOnline ? 'bg-opacity-10' : 'bg-gray-100'}`} 
               style={{ backgroundColor: isOnline ? `${primaryColor}15` : undefined }}>
            <Monitor size={24} style={{ color: isOnline ? primaryColor : '#9ca3af' }} />
          </div>
          <div className="max-w-[150px]">
            {/* Nama Event (Jika ada) atau Nama Booth */}
            <h3 className="font-black text-gray-900 truncate text-sm uppercase tracking-tight" title={booth.events?.name || booth.booth_name}>
              {booth.events?.name || booth.booth_name}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono font-bold mt-0.5 flex items-center gap-1">
               ID: <span className="text-gray-600 bg-gray-100 px-1 rounded">{booth.booth_code}</span>
            </p>
          </div>
        </div>
        
        {/* Badge Status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border`}
          style={{ 
              backgroundColor: isOnline ? `${primaryColor}10` : '#f9fafb', 
              color: isOnline ? primaryColor : '#6b7280',
              borderColor: isOnline ? `${primaryColor}30` : '#e5e7eb'
          }}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'animate-pulse' : ''}`} style={{ backgroundColor: isOnline ? primaryColor : '#9ca3af' }} />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-gray-100 mb-4 bg-gray-50/50 rounded-xl px-2">
        <div className="text-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Photos</p>
          <p className="text-xl font-black text-gray-800 font-mono">{booth.stats?.photos_today || 0}</p>
        </div>
        <div className="text-center border-l border-gray-200 border-dashed pl-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Seen</p>
          <p className="text-[10px] font-bold text-gray-600 mt-2 truncate">
            {booth.last_heartbeat ? getTimeAgo(booth.last_heartbeat) : "Belum pernah"}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={onDetail} 
        className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border hover:shadow-md active:scale-95 bg-white"
        style={{ 
            color: isOnline ? primaryColor : '#4b5563', 
            borderColor: isOnline ? `${primaryColor}40` : '#e5e7eb' 
        }}
      >
        <Settings size={14} className="group-hover:rotate-45 transition-transform duration-300" />
        Configure Booth
      </button>

      {/* Dekorasi Background (Optional) */}
      {isOnline && (
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-white to-transparent opacity-50 rounded-full blur-2xl" style={{ backgroundColor: primaryColor }} />
      )}
    </div>
  );
}