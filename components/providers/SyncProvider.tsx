// components/providers/SyncProvider.tsx
'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function SyncProvider({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Fungsi untuk memproses antrian
    const processQueue = async () => {
      const queueData = localStorage.getItem('pending_uploads');
      if (!queueData) return;

      const queue = JSON.parse(queueData);
      if (!Array.isArray(queue) || queue.length === 0) return;

      if (!navigator.onLine) return;

      const toastId = toast.loading(`Syncing ${queue.length} offline sessions...`);
      
      const newQueue = [];
      let successCount = 0;

      for (const item of queue) {
        try {
          // Coba upload ulang ke API
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });

          if (!response.ok) {
            throw new Error('Failed');
          }
          successCount++;
        } catch (error) {
          // Jika masih gagal, masukkan kembali ke antrian baru
          newQueue.push(item);
        }
      }

      // Update LocalStorage dengan sisa antrian (jika ada yang masih gagal)
      if (newQueue.length > 0) {
        localStorage.setItem('pending_uploads', JSON.stringify(newQueue));
        toast.error(`${newQueue.length} items failed to sync. Will retry later.`, { id: toastId });
      } else {
        localStorage.removeItem('pending_uploads');
        toast.success(`All ${successCount} sessions synced to cloud! ☁️`, { id: toastId });
      }
    };

    // 1. Cek saat komponen dimount (misal pas refresh halaman)
    if (navigator.onLine) {
        processQueue();
    }

    // 2. Cek saat browser mendeteksi perubahan jaringan (Offline -> Online)
    window.addEventListener('online', processQueue);

    return () => {
      window.removeEventListener('online', processQueue);
    };
  }, []);

  return <>{children}</>;
}