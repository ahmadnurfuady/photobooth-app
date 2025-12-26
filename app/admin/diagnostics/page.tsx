'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertTriangle, Activity, Camera, Wifi, Database, Server } from 'lucide-react';

type DiagnosticResult = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  detail?: string; // Tambahan untuk info debug
  icon?: any;
};

type EventOption = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function SystemDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [results, setResults] = useState<DiagnosticResult[]>([
    { id: 'browser', name: 'Akses Kamera Real', status: 'pending', message: 'Menunggu...', icon: Camera },
    { id: 'internet', name: 'Koneksi Internet', status: 'pending', message: 'Menunggu...', icon: Wifi },
    { id: 'database', name: 'Koneksi Database', status: 'pending', message: 'Menunggu...', icon: Database },
    { id: 'event_config', name: 'Validasi Booth', status: 'pending', message: 'Pilih event diatas...', icon: Server },
  ]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, is_active')
        .order('created_at', { ascending: false });
      
      if (data) {
        setEvents(data);
        const active = data.find((e: any) => e.is_active);
        if (active) setSelectedEventId(active.id);
      }
    };
    fetchEvents();
  }, []);

  const updateStatus = (id: string, status: DiagnosticResult['status'], message: string, detail?: string) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, status, message, detail } : r));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults(prev => prev.map(r => ({ ...r, status: 'pending', message: 'Menunggu...', detail: '' })));

    // --- 1. CEK KAMERA (ULTIMATE CHECK) ---
    updateStatus('browser', 'running', 'Mengecek Permission API & Stream...');
    
    try {
      // LAPIS 1: Cek Status Izin via API (Chrome Only)
      // Ini akan langsung ketahuan kalau statusnya 'denied' tanpa buka kamera
      if (navigator.permissions && navigator.permissions.query) {
         try {
            const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
            console.log('📸 Permission State:', perm.state);
            if (perm.state === 'denied') {
                throw new Error('PermissionDeniedByAPI'); // Lempar error manual
            }
         } catch (e) {
            console.log('⚠️ Permission Query not supported/failed, skip.');
         }
      }

      // LAPIS 2: Paksa Buka Stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // LAPIS 3: Cek Apakah Stream "Hidup"
      const videoTrack = stream.getVideoTracks()[0];
      const cameraName = videoTrack.label || 'Kamera Generik'; // Ambil nama kamera
      const isLive = videoTrack.readyState === 'live';
      
      // Matikan segera
      videoTrack.stop();

      if (!isLive) {
          throw new Error('StreamNotLive');
      }
      
      updateStatus('browser', 'success', 'Kamera Berhasil (Izin OK).', `Terdeteksi: ${cameraName}`);

    } catch (err: any) {
      console.error("❌ Camera Diagnostic Error:", err);
      
      if (err.message === 'PermissionDeniedByAPI' || err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         updateStatus('browser', 'error', '⛔ IZIN DITOLAK USER', 'Anda memblokir akses kamera di browser.');
      } else if (err.name === 'NotFoundError') {
         updateStatus('browser', 'error', '📷 Kamera Tidak Ditemukan', 'Tidak ada hardware kamera terdeteksi.');
      } else if (err.name === 'NotReadableError') {
         updateStatus('browser', 'warning', '⚠️ Kamera Sibuk', 'Kamera sedang dipakai aplikasi lain (Zoom/Meet).');
      } else {
         updateStatus('browser', 'error', 'Gagal Akses Kamera', err.message || 'Unknown Error');
      }
    }

    // --- 2. CEK INTERNET ---
    updateStatus('internet', 'running', 'Ping server...');
    const start = Date.now();
    try {
      // Tambahkan timestamp agar tidak kena cache browser
      await fetch(`/favicon.ico?t=${Date.now()}`, { cache: 'no-store' }); 
      const duration = Date.now() - start;
      if (duration < 300) updateStatus('internet', 'success', `Sangat Cepat (${duration}ms)`);
      else if (duration < 1500) updateStatus('internet', 'success', `Stabil (${duration}ms)`);
      else updateStatus('internet', 'warning', `Lambat (${duration}ms)`);
    } catch (e) {
      updateStatus('internet', 'error', '❌ OFFLINE / Internet Putus.');
    }

    // --- 3. CEK DATABASE ---
    updateStatus('database', 'running', 'Ping Supabase...');
    const { error } = await supabase.from('events').select('count').single();
    if (!error) {
      updateStatus('database', 'success', 'Terhubung ke Database.');
    } else {
      updateStatus('database', 'error', '❌ Gagal koneksi Database.');
    }

    // --- 4. CEK EVENT SPESIFIK ---
    if (selectedEventId) {
        updateStatus('event_config', 'running', 'Validasi data event...');
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', selectedEventId)
            .single();

        if (eventError || !eventData) {
            updateStatus('event_config', 'error', '❌ Data event hilang/rusak!');
        } else {
            const now = new Date();
            const expires = eventData.expires_at ? new Date(eventData.expires_at) : null;
            
            if (expires && expires < now) {
                updateStatus('event_config', 'warning', `⚠️ Event SUDAH EXPIRED.`);
            } else if (!eventData.is_active) {
                updateStatus('event_config', 'warning', `⚠️ Event BELUM DIAKTIFKAN.`);
            } else {
                updateStatus('event_config', 'success', `✅ Event SIAP DIGUNAKAN.`, `Kode: ${eventData.access_code}`);
            }
        }
    } else {
        updateStatus('event_config', 'warning', 'Event belum dipilih.');
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 text-[var(--foreground)] transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/dashboard" className="p-2 hover:bg-black/10 rounded-full transition-colors">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-bold">System Diagnostics</h1>
                <p className="opacity-70">Uji kelayakan sistem, hardware, dan konfigurasi event.</p>
            </div>
        </div>

        {/* KONTROL UTAMA */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-black/5 space-y-6 text-gray-900">
            <div>
                <label className="block text-sm font-semibold mb-2">Target Event / Booth</label>
                <select 
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="" disabled>-- Pilih Event untuk Dites --</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>
                            {event.name} {event.is_active ? '✅ (LIVE)' : '⏸️ (Off)'}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={runDiagnostics}
                disabled={isRunning || !selectedEventId}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all text-white shadow-lg
                    ${isRunning || !selectedEventId 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-95'}
                `}
            >
                {isRunning ? (
                    <><Loader2 className="animate-spin" /> Sedang Mengecek...</>
                ) : (
                    <><Activity size={20} /> Mulai Diagnosa</>
                )}
            </button>
        </div>

        {/* HASIL DIAGNOSA */}
        <div className="grid gap-4">
            {results.map((result) => (
                <div key={result.id} className="bg-white/95 backdrop-blur-sm p-4 md:p-5 rounded-xl border border-black/5 shadow-sm flex items-center justify-between text-gray-900 transition-all">
                    <div className="flex items-center gap-4 w-full">
                        <div className={`p-3 rounded-full flex-shrink-0
                            ${result.status === 'success' ? 'bg-green-100 text-green-600' : 
                              result.status === 'error' ? 'bg-red-100 text-red-600' :
                              result.status === 'warning' ? 'bg-orange-100 text-orange-600' :
                              result.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                              'bg-gray-100 text-gray-400'}
                        `}>
                            {result.status === 'success' && <CheckCircle size={24} />}
                            {result.status === 'error' && <XCircle size={24} />}
                            {result.status === 'warning' && <AlertTriangle size={24} />}
                            {result.status === 'running' && <Loader2 size={24} className="animate-spin" />}
                            {result.status === 'pending' && result.icon && <result.icon size={24} />}
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="font-bold text-base md:text-lg">{result.name}</h3>
                            <p className={`text-sm md:text-base font-medium ${
                                result.status === 'error' ? 'text-red-600' : 
                                result.status === 'warning' ? 'text-orange-700' :
                                result.status === 'success' ? 'text-green-700' :
                                'text-gray-500'
                            }`}>
                                {result.message}
                            </p>
                            {/* DETAIL DEBUG (Muncul jika ada) */}
                            {result.detail && (
                                <p className="text-xs text-gray-400 mt-1 font-mono">{result.detail}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}