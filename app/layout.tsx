// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

// ✅ Import Wrapper Tema (Agar style persistent saat offline)
import ThemeWrapper from '@/components/providers/ThemeWrapper'; 

// ✅ Import SyncProvider (Agar data offline otomatis ter-upload saat internet nyala)
import SyncProvider from '@/components/providers/SyncProvider';

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
      {/* ThemeWrapper merender tag <body> dan menyuntikkan variable CSS.
        Dia juga menangani OfflineBanner.
      */}
      <ThemeWrapper>
        
        {/* ✅ SyncProvider dipasang di sini (di dalam body).
           Tugasnya: Memantau koneksi internet. Begitu online, dia akan cek
           LocalStorage dan meng-upload data yang tertunda.
        */}
        <SyncProvider>
          
          {/* Div font Inter */}
          <div className={inter.className}>
            {children}
            
            {/* Config Toaster Asli Kamu (Tidak ada yang diringkas) */}
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
      </ThemeWrapper>
    </html>
  );
}