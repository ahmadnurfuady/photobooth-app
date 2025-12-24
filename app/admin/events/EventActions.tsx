// app/admin/events/EventActions.tsx
'use client';

import { useState } from 'react';
import { activateEvent } from '@/lib/actions/events';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Import komponen baru
import EditEventForm from './EditEventForm';
import InvoiceModal from './InvoiceModal';

export default function EventActions({ event }: { event: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleActivate = async () => {
    if (event.is_active) return; // Sudah aktif
    
    // Konfirmasi dulu biar gak kepencet
    if(!confirm(`Aktifkan event "${event.name}"? Event lain akan dinonaktifkan.`)) return;

    setLoading(true);
    try {
      await activateEvent(event.id);
      toast.success(`Event ${event.name} diaktifkan!`);
    } catch (e) {
      toast.error('Gagal mengaktifkan event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      
      {/* 1. Tombol INVOICE */}
      <InvoiceModal event={event} />

      {/* 2. Tombol EDIT */}
      <EditEventForm event={event} />

      {/* 3. Tombol DETAIL (Tetap ada) */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => router.push(`/admin/events/${event.id}`)}
        className="text-gray-600 hover:text-blue-600"
        title="Lihat Galeri Foto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      </Button>

      {/* 4. Tombol SWITCH ACTIVE (Tetap ada) */}
      <div className="ml-2 border-l pl-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={event.is_active}
              onChange={handleActivate}
              disabled={loading || event.is_active}
            />
            <div className={`w-9 h-5 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors ${event.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-all ${event.is_active ? 'translate-x-full border-white' : ''}`}></div>
            </div>
          </label>
      </div>
    </div>
  );
}