'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { POSTER_ID } from './EventPosterTemplate';
import DeleteEventPhotos from './DeleteEventPhotos'; // Pastikan file ini ada dari langkah sebelumnya
import BackupButton from '@/components/admin/BackupButton';

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
      // 1. Screenshot elemen tersembunyi
      const canvas = await html2canvas(element, {
        scale: 1.5, // Resolusi tinggi
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      // 2. Convert ke Image URL
      const image = canvas.toDataURL('image/png');

      // 3. Trigger Download
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

  const handleBackupClick = () => {
    toast('Fitur Backup Google Drive akan segera hadir di update berikutnya!', {
        icon: '🚧',
    });
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
        {hasPhotos && (
          <BackupButton eventId={event.id} />
       )}
      {/* Tombol Backup (Placeholder dulu) */}

      {/* Tombol Hapus Foto (Logic yang sudah kita buat sebelumnya) */}
      <DeleteEventPhotos 
        eventId={event.id}
        eventName={event.name}
        lastBackupAt={event.last_backup_at}
        hasPhotos={hasPhotos}
      />
    </div>
  );
}