// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import React from 'react';

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
  title: 'Photobooth App',
  description: 'Professional photobooth application',
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
                {children}
                
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