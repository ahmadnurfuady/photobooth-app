// app/admin/events/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { getEventById } from '@/lib/actions/events';
import { Button } from '@/components/ui/Button';
import StatCard from '@/components/admin/StatCard';
import { redirect } from 'next/navigation';

// IMPORT KOMPONEN BARU
import EventPosterTemplate from '@/components/admin/EventPosterTemplate';
import EventDetailActions from '@/components/admin/EventDetailActions';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Event Tidak Ditemukan</h1>
        <Link href="/admin/events"><Button>Kembali</Button></Link>
      </div>
    );
  }

  // Siapkan URL Aplikasi untuk QR Code (Ganti domain saat production)
  // Saat dev, biasanya http://localhost:3000
  // Kita hardcode localhost dulu atau ambil dari ENV
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Hitung Statistik
  const liveSessionCount = event.photo_sessions?.length || 0;
  
  // Logika Prioritas Statistik
  const displayCount = liveSessionCount > 0 
    ? liveSessionCount 
    : (event.preserved_stats?.total_sessions || 0);
    
  const isArchivedData = liveSessionCount === 0 && (event.preserved_stats?.total_sessions > 0);

  return (
    <div className="p-8 w-full max-w-6xl mx-auto space-y-8">
      
      {/* --- KOMPONEN POSTER TERSEMBUNYI --- */}
      {/* Ini wajib ada di sini agar bisa dipotret html2canvas */}
      <EventPosterTemplate 
        eventName={event.name}
        eventDate={event.created_at}
        appUrl={APP_URL}
      />
      {/* ----------------------------------- */}

      {/* --- HEADER --- */}
      <div>
        <Link 
            href="/admin/events"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4 text-sm font-medium w-fit group"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
            Kembali ke Daftar
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white-900">{event.name}</h1>
                    {event.is_active && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                            LIVE
                        </span>
                    )}
                </div>
                <p className="text-gray-500 text-sm">
                    Dibuat pada: {new Date(event.created_at).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                </p>
            </div>

            {/* --- AREA TOMBOL AKSI --- */}
            <div className="flex flex-wrap items-center gap-3">
                
                

                {/* Tombol Aksi Lainnya (Poster, Delete, Edit) */}
                <EventDetailActions 
                    event={event} 
                    hasPhotos={liveSessionCount > 0} 
                />
            </div>

        </div>
      </div>

      {/* --- STATISTIK --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            label="Total Pengunjung (Sesi)" 
            value={displayCount} 
            subtext={isArchivedData ? "Data dari Arsip (Foto Telah Dihapus)" : "Data Live (Foto Tersedia)"}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard 
            label="Total Foto Diambil" 
            value={displayCount * 3} 
            subtext="Estimasi (3 foto/sesi)"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard 
            label="Status Backup" 
            value={event.last_backup_at ? "Aman" : "Belum"}
            subtext={event.last_backup_at ? `Terakhir: ${new Date(event.last_backup_at).toLocaleDateString()}` : "Segera lakukan backup!"}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
        />
      </div>

      {/* --- GALERI FOTO --- */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            📸 Galeri Kegiatan
            <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {liveSessionCount} Foto
            </span>
        </h2>

        {liveSessionCount > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {event.photo_sessions.map((session: any) => (
                    <div key={session.id} className="group relative aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all">
                        <img 
                            src={session.composite_url} 
                            alt="Session Result" 
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <p className="text-[10px] text-white opacity-70 mb-1">
                                {new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <a 
                                href={session.composite_url} 
                                target="_blank" 
                                className="text-xs text-white font-bold hover:underline"
                            >
                                Lihat Full ↗
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-400 font-medium mb-1">Belum ada foto di kegiatan ini.</p>
                <p className="text-xs text-gray-300">
                    {isArchivedData ? "Foto telah dihapus untuk menghemat ruang." : "Mulai photobooth dan pilih kegiatan ini!"}
                </p>
            </div>
        )}
      </div>
    </div>
  );
}