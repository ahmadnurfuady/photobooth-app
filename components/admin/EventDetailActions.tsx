// components/admin/EventDetailActions.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { POSTER_ID } from './EventPosterTemplate';
import dynamic from 'next/dynamic';

// ✅ LAZY LOAD DENGAN LOADING STATE YANG AMAN
// Kita ganti loading-nya pakai tombol biasa biar tidak error variant

const DeleteEventPhotos = dynamic(() => import('./DeleteEventPhotos'), {
  ssr: false, 
  loading: () => (
    // Menggunakan variant="outline" yang pasti ada, dan styling manual untuk warna merah
    <Button variant="outline" size="sm" disabled className="opacity-50 border-red-200 text-red-300">
      ...
    </Button>
  )
});

const BackupButton = dynamic(() => import('@/components/admin/BackupButton'), {
  ssr: false,
  loading: () => (
    <Button variant="outline" size="sm" disabled className="opacity-50">
      ...
    </Button>
  )
});

interface Props {
  event: any;
  hasPhotos: boolean;
}

export default function EventDetailActions({ event, hasPhotos }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  // FUNGSI DOWNLOAD POSTER
  const handleDownloadPoster = async () => {
    const element = document.getElementById(POSTER_ID);
    if (!element) {
      toast.error('Template poster tidak ditemukan');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Membuat poster...');

    try {
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(element, {
        scale: 1.5, 
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Poster-${event.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Poster berhasil diunduh!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat poster', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-end mt-4 md:mt-0">
      {/* Tombol Download Poster */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleDownloadPoster}
        isLoading={isGenerating}
        className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
      >
        🖼️ Download Poster
      </Button>
      
       {/* Tombol Backup (Lazy Load) */}
       {hasPhotos && (
          <BackupButton eventId={event.id} />
       )}

      {/* Tombol Hapus Foto (Lazy Load) */}
      <DeleteEventPhotos 
        eventId={event.id}
        eventName={event.name}
        lastBackupAt={event.last_backup_at}
        hasPhotos={hasPhotos}
      />
    </div>
  );
}