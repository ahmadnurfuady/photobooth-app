'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, X, Fingerprint } from 'lucide-react';

export function BoothIdentityOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [boothCode, setBoothCode] = useState<string | null>(null);

  // Ambil kode booth dari localStorage saat komponen dimuat
  useEffect(() => {
    const code = localStorage.getItem('booth_code');
    setBoothCode(code);
  }, [isVisible]); // Refresh saat overlay dibuka

  // Logika Trigger: Klik 5x dalam 2 detik
  const handleTrigger = () => {
    setClickCount(prev => prev + 1);
    const timer = setTimeout(() => setClickCount(0), 2000);
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    if (clickCount >= 5) {
      setIsVisible(true);
      setClickCount(0);
    }
  }, [clickCount]);

  if (!isVisible) {
    return (
      <div 
        onClick={handleTrigger}
        className="fixed bottom-0 right-0 w-24 h-24 z-[9998] cursor-default opacity-0"
        title="Hidden Trigger Area"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400"
        >
          <X size={20} />
        </button>

        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
            <Monitor size={32} className="text-blue-600" />
          </div>
          
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Device Identity</h2>
            <p className="text-3xl font-black text-gray-900 mt-1 font-mono tracking-tighter">
              {boothCode || 'NOT_REGISTERED'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 rounded-xl border border-dashed">
            <Fingerprint size={14} className="text-gray-400" />
            <span className="text-[10px] font-mono text-gray-500">
              Unique Hardware ID Linked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}