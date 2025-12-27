// app/admin/events/EventActions.tsx
'use client';

import { useState } from 'react';
// import { activateEvent } from '@/lib/actions/events'; // Sepertinya tidak dipakai di logic baru, bisa dihapus kalau mau bersih
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic'; // 1. IMPORT DYNAMIC

import EditEventForm from './EditEventForm';

// 2. HAPUS Import Statis Lama
// import InvoiceModal from './InvoiceModal'; ❌

// 3. GANTI jadi Dynamic Import
// Next.js akan memecah modal ini (dan jsPDF di dalamnya) ke file chunk terpisah
const InvoiceModal = dynamic(() => import('./InvoiceModal'), {
  ssr: false, // Modal ini tidak perlu dirender di server
  loading: () => (
    // Tampilkan tombol placeholder abu-abu saat script modal sedang didownload
    <button className="p-2 text-gray-300 rounded-lg">
       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
    </button>
  ) 
});

export default function EventActions({ event }: { event: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleActivate = async () => {
    const actionText = event.is_active ? 'Nonaktifkan' : 'Aktifkan';
    
    if(!confirm(`${actionText} event "${event.name}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !event.is_active })
        .eq('id', event.id);

      if (error) throw error;

      toast.success(`Event ${event.name} berhasil ${!event.is_active ? 'diaktifkan' : 'dinonaktifkan'}!`);
      
      // Refresh router untuk update UI
      router.refresh(); 
      
    } catch (e) {
      console.error(e);
      toast.error(`Gagal ${actionText.toLowerCase()} event.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      
      {/* 1. Tombol INVOICE (Sekarang sudah Lazy Loaded) */}
      <InvoiceModal event={event} />

      {/* 2. Tombol EDIT */}
      <EditEventForm event={event} />

      {/* 3. Tombol DETAIL */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => router.push(`/admin/events/${event.id}`)}
        className="text-gray-600 hover:text-blue-600"
        title="Lihat Galeri Foto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      </Button>

      {/* 4. Tombol SWITCH ACTIVE */}
      <div className="ml-2 border-l pl-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={event.is_active}
              onChange={handleActivate}
              disabled={loading} // Hapus '|| event.is_active' agar bisa di-uncheck kembali
            />
            <div className={`w-9 h-5 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors ${event.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-all ${event.is_active ? 'translate-x-full border-white' : ''}`}></div>
            </div>
          </label>
      </div>
    </div>
  );
}