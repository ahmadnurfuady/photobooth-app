// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import React from 'react';

import EventThemeProvider from '@/components/EventThemeProvider';

import { BoothIdentityOverlay } from '@/components/booth/BoothIdentityOverlay';

// ✅ Import Sentry Initializer (Agar Sentry jalan di client-side)
import { SentryInitializer } from '@/components/providers/SentryInitializer';

// ✅ Import Wrapper Tema (Agar style persistent saat offline & variable CSS ter-inject)
import ThemeWrapper from '@/components/providers/ThemeWrapper'; 

// ✅ Import SyncProvider (Agar data offline otomatis ter-upload saat internet nyala)
import SyncProvider from '@/components/providers/SyncProvider';

// ✅ Import Sentry Error Boundary (Penyelamat saat Crash)
import { SentryErrorBoundary } from '@/components/SentryErrorBoundary';

// ✅ Import SystemProvider (Monitoring Kesehatan & Notifikasi)
import { SystemProvider } from '@/src/context/SystemContext';

// Paksa dynamic rendering agar settingan tema dari DB selalu fresh
export const revalidate = 0;

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  // Base URL (Penting agar gambar terbaca di WA saat deploy)
  // Nanti saat sudah punya domain sendiri, ganti 'https://snapbooth.vercel.app' dengan domain asli.
  // Untuk sekarang biarkan default atau null, Next.js akan mencoba resolve otomatis.
  metadataBase: new URL('https://ministudiophotobooth.vercel.app'), 

  title: {
    template: '%s | SnapBooth Live', // Judul halaman lain akan ikut pola ini (misal: "Camera | SnapBooth Live")
    default: 'SnapBooth - Premium Live Event Gallery', // Judul halaman depan
  },
  description: 'Abadikan momen seru kamu dan tampil langsung di layar utama! 📸✨ Powered by SnapBooth.',
  
  // Icon kecil di tab browser
  icons: {
    icon: '/favicon.ico', 
  },

  // Konfigurasi untuk WhatsApp / Facebook / LinkedIn
  openGraph: {
    title: 'SnapBooth - Yuk Foto Bareng! 📸',
    description: 'Upload fotomu sekarang dan ramaikan acara ini. Klik untuk mulai!',
    siteName: 'SnapBooth Pro',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg', // File yang tadi kamu taruh di folder public
        width: 1200,
        height: 630,
        alt: 'SnapBooth Event Preview',
      },
    ],
  },
  
  // Konfigurasi untuk Twitter / X
  twitter: {
    card: 'summary_large_image',
    title: 'SnapBooth Live Event',
    description: 'Capture your moment and shine on stage!',
    images: ['/og-image.jpg'],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* ThemeWrapper merender tag <body> dan menyuntikkan variable CSS (--primary).
          Dia juga yang bertanggung jawab menampilkan OfflineBanner jika koneksi putus.
      */}
      <ThemeWrapper>
        
        {/* ✅ Pasang di sini agar jalan otomatis */}
        <SentryInitializer />

        {/* ✅ SENTRY INTEGRATION:
            Kita bungkus konten utama dengan ErrorBoundary.
            Jika ada komponen di dalam sini yang crash fatal, 
            Sentry akan menangkapnya dan menampilkan UI Fallback.
        */}
        <SentryErrorBoundary>
          
          {/* ✅ SYSTEM PROVIDER:
              Menyediakan logic notifikasi dan monitoring kesehatan sistem.
              Dibungkus di sini agar 'useSystem' bisa diakses oleh SyncProvider dan children.
          */}
          <SystemProvider>

            {/* ✅ SyncProvider:
                Tugasnya: Memantau koneksi internet. Begitu online, dia akan cek
                LocalStorage dan meng-upload data yang tertunda.
            */}
            <SyncProvider>
              
              {/* Div font Inter membungkus konten aplikasi */}
              <div className={inter.className}>
                <EventThemeProvider>  
                {children}
                </EventThemeProvider>
                {/* ✅ PASANG DI SINI: Akan muncul di atas konten apa pun */}
                <BoothIdentityOverlay />

                {/* Config Toaster Lengkap (Sesuai Permintaan: Tidak Diringkas) */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#10B981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 4000,
                      iconTheme: {
                        primary: '#EF4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
              
            </SyncProvider>
          </SystemProvider>

        </SentryErrorBoundary>
      </ThemeWrapper>
    </html>
  );
}