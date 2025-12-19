// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Photobooth App - Admin',
  description: 'Professional photobooth application for tablets',
};

export default function RootLayout({
  children,
}:  {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter. className}>
        {children}
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
                primary:  '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme:  {
                primary: '#EF4444',
                secondary:  '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}