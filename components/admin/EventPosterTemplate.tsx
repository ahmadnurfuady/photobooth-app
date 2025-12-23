'use client';

import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  eventName: string;
  eventDate: string;
  appUrl: string;
}

export const POSTER_ID = 'event-poster-hidden';

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);

// Helper untuk Inisial (Opsional, buat gaya-gayaan di pojok)
const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

export default function EventPosterTemplate({ eventName, eventDate, appUrl }: Props) {
  return (
    <div 
      style={{ 
        position: 'fixed', 
        left: '-9999px', 
        top: 0 
      }}
    >
      {/* Container Utama - Ukuran A4 (High Res Scale) */}
      <div 
        id={POSTER_ID}
        className="w-[800px] h-[1131px] relative flex flex-col overflow-hidden font-sans"
        style={{ 
          backgroundColor: 'var(--bg-color)', 
          color: 'var(--foreground)' 
        }}
      >
        {/* --- 1. BACKGROUND BLOBS (Mirip Landing Page) --- */}
        <div 
            className="absolute top-[-10%] left-[-20%] w-[700px] h-[700px] rounded-full blur-[100px] opacity-40"
            style={{ backgroundColor: 'var(--secondary-color)' }}
        />
        <div 
            className="absolute bottom-[-10%] right-[-20%] w-[800px] h-[800px] rounded-full blur-[120px] opacity-40"
            style={{ backgroundColor: 'var(--primary-color)' }}
        />
        <div 
            className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full blur-[80px] opacity-20"
            style={{ backgroundColor: 'var(--primary-color)' }}
        />

        {/* --- 2. GLASS FRAME CONTENT --- */}
        {/* Ini kotak kaca besarnya */}
        <div className="relative z-10 w-full h-full flex flex-col p-12">
            
            {/* Border Luar Hiasan */}
            <div className="absolute inset-8 border border-white/20 rounded-[40px] pointer-events-none"></div>

            {/* HEADER: Brand */}
            <div className="flex justify-between items-center mb-16 px-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                        <CameraIcon />
                    </div>
                    <span className="text-2xl font-bold tracking-widest uppercase opacity-80">SnapBooth.</span>
                </div>
                <div 
                    className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20 bg-white/5 backdrop-blur-sm"
                >
                    Official Event
                </div>
            </div>

            {/* TENGAH: Judul & Info */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                
                {/* Tanggal dengan style Glass Pill */}
                <div className="mb-8 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
                    <span className="text-xl">📅</span>
                    <span className="text-xl font-medium opacity-90">
                        {new Date(eventDate).toLocaleDateString('id-ID', { 
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                        })}
                    </span>
                </div>

                {/* Judul Event Besar & Mewah */}
                <h1 
                    className="text-7xl font-black leading-tight mb-12 drop-shadow-sm uppercase tracking-tight break-words max-w-3xl"
                    style={{ 
                        textShadow: '0 4px 30px rgba(0,0,0,0.1)' 
                    }}
                >
                    {eventName}
                </h1>

                {/* CARD QR CODE (Super Glassy) */}
                <div 
                    className="p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden group"
                    style={{ 
                        background: 'rgba(255, 255, 255, 0.05)', // Sangat transparan
                        backdropFilter: 'blur(40px)', // Blur kuat
                        border: '1px solid rgba(255, 255, 255, 0.2)', // Border kaca
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                    }}
                >
                    {/* Efek kilauan diagonal di kaca */}
                    <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 transform translate-x-[-100%]"></div>

                    <div className="bg-white p-5 rounded-3xl shadow-inner">
                        <QRCodeCanvas 
                            value={appUrl} 
                            size={350} 
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    
                    <div className="text-center">
                        <p 
                            className="text-2xl font-bold mb-1 uppercase tracking-[0.2em]"
                            style={{ color: 'var(--primary-color)' }}
                        >
                            Scan Me
                        </p>
                        <p className="text-lg opacity-60 font-light">
                            Capture your moment here
                        </p>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-16 text-center opacity-40">
                <p className="text-sm font-medium tracking-[0.5em] uppercase">Powered by SnapBooth AI</p>
            </div>
        </div>
      </div>
    </div>
  );
}