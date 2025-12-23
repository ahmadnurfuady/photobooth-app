'use client';

import React from 'react';

interface StatsProps {
  stats: {
    totalEvents: number;
    totalSessions: number;
    totalFrames: number;
    activeFrames: number;
    inactiveFrames: number;
    storageUsed: number;
  };
}

export default function DashboardStats({ stats }: StatsProps) {
  // Kita tidak perlu hook khusus/hex code manual.
  // Cukup pakai class 'text-primary' atau 'bg-primary' dari Tailwind.
  // Ini otomatis akan mengikuti warna tema yang sedang aktif (Hijau/Biru/dll).

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* CARD 1: TOTAL SESSIONS */}
      <StatCard 
        label="Total Sessions" 
        value={stats.totalSessions} 
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        }
        subText="Total pengunjung photobooth"
      />

      {/* CARD 2: TOTAL EVENTS */}
      <StatCard 
        label="Total Events" 
        value={stats.totalEvents} 
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        }
        subText="Kegiatan aktif & selesai"
      />

      {/* CARD 3: FRAMES */}
      <StatCard 
        label="Active Frames" 
        value={`${stats.activeFrames} / ${stats.totalFrames}`} 
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        }
        subText="Frame yang tersedia"
      />

       {/* CARD 4: STORAGE */}
       <StatCard 
        label="Storage Usage" 
        value={`~${stats.storageUsed} MB`} 
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
        }
        subText="Estimasi penggunaan space"
      />

    </div>
  );
}

// --- KOMPONEN CARD ---
function StatCard({ label, value, icon, subText }: any) {
    return (
      <div 
        className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        {/* Garis Warna di Kiri (Menggunakan class bg-primary) */}
        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
        
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
            {/* Angka Utama (Menggunakan class text-primary agar warnanya sesuai tema) */}
            <h3 className="text-3xl font-bold text-gray-800 group-hover:text-primary transition-colors">
                {value}
            </h3>
            {subText && <p className="text-xs text-gray-400 mt-2">{subText}</p>}
          </div>
          
          {/* Ikon dengan Background Transparan (bg-primary/10) dan Warna Utama (text-primary) */}
          <div className="p-3 rounded-lg bg-primary/10 text-primary opacity-80 group-hover:opacity-100 transition-opacity">
            {icon}
          </div>
        </div>
      </div>
    );
}