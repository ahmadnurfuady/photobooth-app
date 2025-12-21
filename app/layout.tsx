// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js'; // Import Supabase
import './globals.css';

export const revalidate = 0;

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Photobooth App',
  description: 'Professional photobooth application',
};

// Ubah menjadi async function untuk fetch data di server
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  // 1. Fetch Tema dari Database (Server Side)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: theme } = await supabase
    .from('theme_settings')
    .select('*')
    .single();

  // 2. Siapkan Variable CSS (Gunakan default jika DB kosong)
  const themeStyles = {
    '--primary-color': theme?.primary_color || '#3b82f6',
    '--secondary-color': theme?.secondary_color || '#a855f7',
    '--bg-color': theme?.background_color || '#0f172a',
    '--foreground': theme?.text_color || '#f8fafc',
  } as React.CSSProperties;

  return (
    <html lang="en">
      {/* 3. Inject Style ke Body */}
      <body className={inter.className} style={themeStyles}>
        {children}
        
        {/* Config Toaster Asli Kamu */}
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
      </body>
    </html>
  );
}