'use client';

import React, { useState } from 'react';
import { backupEventToDrive } from '@/lib/actions/backup';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Props {
  eventId: string;
}

export default function BackupButton({ eventId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    if (!confirm("Proses backup akan memakan waktu beberapa saat tergantung jumlah foto. Lanjutkan?")) return;

    setLoading(true);
    const toastId = toast.loading("Sedang memproses backup...");

    try {
      const result = await backupEventToDrive(eventId);
      
      if (result.success) {
        toast.success("Backup Berhasil! File tersimpan di Google Drive.", { id: toastId });
        // Buka link Google Drive di tab baru jika ada
        if (result.link) {
            window.open(result.link, '_blank');
        }
      } else {
        toast.error(`Gagal: ${result.error}`, { id: toastId });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
        onClick={handleBackup} 
        variant="outline" // Putih/Outline biar beda sama tombol Delete
        className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
        isLoading={loading}
    >
      {!loading && (
        // Icon Google Drive
        <svg viewBox="0 0 87.3 78" className="w-5 h-5">
           <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
           <path d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2l13.75 23.8z" fill="#ea4335"/>
           <path d="M73.55 66.85c.8-1.4 1.2-2.95 1.2-4.5h-27.5l13.75 23.8c1.35-.8 2.5-1.9 3.3-3.3l9.25-16z" fill="#fbbc04"/>
           <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-20 34.6c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#1155cc"/>
           <path d="M73.55 66.85l-9.25 16c1.55 0 3.1-.4 4.5-1.2l18.5-32.05c.8-1.35 1.2-2.9 1.2-4.5h-27.5l12.55 21.75z" fill="#34a853"/>
           <path d="M43.65 25l-13.75 23.8H2.4c0 1.55.45 3.1 1.2 4.5l20-34.6 13.75-23.8c.8-1.35 1.9-2.5 3.3-3.3L43.65 25z" fill="#4285f4"/>
        </svg>
      )}
      {loading ? "Mengupload..." : "Backup ke Drive"}
    </Button>
  );
}