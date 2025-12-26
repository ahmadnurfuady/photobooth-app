'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation'; // 👈 1. Import hook navigasi

export default function EventThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // 👈 2. Ambil URL halaman saat ini

  const applyTheme = async () => {
    const root = document.body;

    // ⛔ 3. LOGIKA BARU: PROTEKSI HALAMAN ADMIN
    // Jika URL diawali dengan "/admin", kita hapus style custom & berhenti di sini.
    // Ini agar tampilan Admin kembali bersih (Teks hitam, Background putih)
    if (pathname && pathname.startsWith('/admin')) {
        console.log('🛡️ [THEME] Admin Panel detected. Resetting theme to default.');
        root.removeAttribute('style'); // Hapus inject warna event
        return; // Stop, jangan lanjut baca database
    }

    // --- DI BAWAH INI ADALAH LOGIKA LAMA (TIDAK DIUBAH) ---
    const activeEventId = localStorage.getItem('active_event_id');

    console.log('🎨 [THEME DEBUG] Cek Active Event ID:', activeEventId);

    // --- PRIORITAS 1: CEK EVENT SPESIFIK ---
    if (activeEventId) {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('primary_color, secondary_color, background_color, text_color')
        .eq('id', activeEventId)
        .single();

      if (eventData && !error) {
        console.log('✅ [THEME DEBUG] Menggunakan Warna SPESIFIK EVENT:', eventData);
        
        // Apply Warna Event
        if (eventData.primary_color) root.style.setProperty('--primary-color', eventData.primary_color);
        if (eventData.secondary_color) root.style.setProperty('--secondary-color', eventData.secondary_color);
        
        // 👇 TAMBAHAN BARU: Apply Warna Background & Teks
        if (eventData.background_color) root.style.setProperty('--bg-color', eventData.background_color);
        if (eventData.text_color) root.style.setProperty('--foreground', eventData.text_color);

        // Kita return di sini agar tidak lanjut load global theme (agar tidak tertimpa)
        return; 
      } else {
        console.warn('⚠️ [THEME DEBUG] Gagal ambil data event (mungkin ID salah/terhapus). Fallback ke Global.');
      }
    }

    // --- PRIORITAS 2: CEK GLOBAL SETTING (ADMIN/THEME) ---
    console.log('🌍 [THEME DEBUG] Menggunakan Warna GLOBAL (Admin Theme)...');
    
    const { data: globalSettings } = await supabase
      .from('app_settings')
      .select('primary_color, secondary_color, background_color, text_color')
      .eq('id', 1)
      .single();

    if (globalSettings) {
      if (globalSettings.primary_color) root.style.setProperty('--primary-color', globalSettings.primary_color);
      if (globalSettings.secondary_color) root.style.setProperty('--secondary-color', globalSettings.secondary_color);
      if (globalSettings.background_color) root.style.setProperty('--bg-color', globalSettings.background_color);
      if (globalSettings.text_color) root.style.setProperty('--foreground', globalSettings.text_color);
    }
  };

  useEffect(() => {
    // 1. Jalan saat pertama load
    applyTheme();

    // 2. Jalan saat user login/logout/ubah event (Storage Event Listener)
    const handleStorageChange = () => {
        console.log('🔄 [THEME DEBUG] Storage changed, re-applying theme...');
        applyTheme();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listener custom jika kita trigger manual dari kode lain
    window.addEventListener('event_unlocked', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('event_unlocked', handleStorageChange);
    };
  }, [pathname]); // 👈 4. Tambahkan 'pathname' agar fungsi jalan ulang saat pindah halaman

  return <>{children}</>;
}