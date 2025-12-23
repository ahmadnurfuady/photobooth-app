// components/providers/ThemeWrapper.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// Inisialisasi Supabase Client (Client Side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  // Default Style (Fallback)
  const [themeStyles, setThemeStyles] = useState<React.CSSProperties>({
    '--primary-color': '#3b82f6',
    '--secondary-color': '#a855f7',
    '--bg-color': '#0f172a',
    '--foreground': '#f8fafc',
  } as React.CSSProperties);

  useEffect(() => {
    const loadTheme = async () => {
      // 1. CEK LOCAL STORAGE
      const cachedTheme = localStorage.getItem('app_theme');
      if (cachedTheme) {
        setThemeStyles(JSON.parse(cachedTheme));
      }

      // 2. FETCH KE SERVER (Hanya jika online)
      if (navigator.onLine) {
        try {
          const { data } = await supabase.from('theme_settings').select('*').single();
          
          if (data) {
            const newStyles = {
              '--primary-color': data.primary_color || '#3b82f6',
              '--secondary-color': data.secondary_color || '#a855f7',
              '--bg-color': data.background_color || '#0f172a',
              '--foreground': data.text_color || '#f8fafc',
            } as React.CSSProperties;

            setThemeStyles(newStyles);
            localStorage.setItem('app_theme', JSON.stringify(newStyles));
          }
        } catch (error) {
          console.error("Gagal sync tema:", error);
        }
      }
    };

    loadTheme();
  }, []);

  return (
    // PERBAIKAN DI SINI:
    // Hapus fragment <></> pembungkus.
    // Masukkan OfflineBanner KE DALAM body.
    <body style={themeStyles}>
      <OfflineBanner />
      {children}
    </body>
  );
}