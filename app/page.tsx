// app/page.tsx
import React from 'react';
import { getActiveEvent } from '@/lib/actions/events';
import LandingPageClient from '@/components/LandingPageClient'; 

// Halaman ini bersifat ASYNC (Server Component)
// Tugasnya HANYA mengambil data awal, agar SEO bagus dan load cepat
export default async function LandingPage() {
  
  // 1. Ambil data event dari server (Database)
  // Kalau tidak ada event aktif, nilainya null
  const activeEvent = await getActiveEvent();

  // 2. Kirim data tersebut ke komponen tampilan (Client)
  return (
    <LandingPageClient defaultEvent={activeEvent} />
  );
}