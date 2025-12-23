'use client';

import { Button } from '@/components/ui/Button';
import { activateEvent } from '@/lib/actions/events';
import toast from 'react-hot-toast';
import { useTransition } from 'react';

export default function EventActions({ event }: { event: any }) {
  const [isPending, startTransition] = useTransition();

  const handleActivate = () => {
    startTransition(async () => {
      try {
        await activateEvent(event.id);
        toast.success(`Event "${event.name}" berhasil diaktifkan!`);
      } catch (e) {
        toast.error('Gagal mengaktifkan event.');
      }
    });
  };

  return (
    <div className="flex justify-end gap-2">
      {!event.is_active && (
        <Button 
            onClick={handleActivate} 
            disabled={isPending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
        >
            {isPending ? 'Mengaktifkan...' : 'Set Aktif'}
        </Button>
      )}
      
      {/* Tombol Detail/Edit nanti diarahkan ke halaman detail */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => window.location.href = `/admin/events/${event.id}`}
        className="text-xs"
      >
        Detail
      </Button>
    </div>
  );
}