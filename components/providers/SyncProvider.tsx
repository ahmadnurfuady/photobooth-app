// components/providers/SyncProvider.tsx
'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
// ✅ PENTING: Import Sentry Helper
import { captureSystemError } from '@/src/utils/errorHandler';

export default function SyncProvider({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Fungsi untuk memproses antrian
    const processQueue = async () => {
      // Cek koneksi browser dulu
      if (!navigator.onLine) return;

      const queueData = localStorage.getItem('pending_uploads');
      if (!queueData) return;

      let queue: any[] = [];
      try {
        queue = JSON.parse(queueData);
      } catch (e) {
        console.error("Data queue corrupt", e);
        return;
      }

      if (!Array.isArray(queue) || queue.length === 0) return;

      const toastId = toast.loading(`Syncing ${queue.length} offline sessions...`);
      
      const newQueue = [];
      let successCount = 0;
      let failCount = 0;

      for (const item of queue) {
        try {
          // Coba upload ulang ke API
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });

          if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
          }
          
          successCount++;

          // ✅ LOG SENTRY: Info Sukses (Penyelamatan Berhasil)
          // Kita log level "info" agar kita tahu sistem offline-mode bekerja dengan baik
          captureSystemError({
             error: new Error("Offline Data Recovered"),
             category: "NETWORK",
             message: `Sesi Offline ${item.id.slice(0,6)} berhasil di-sync otomatis`,
             severity: "info"
          });

        } catch (error: any) {
          failCount++;
          // Jika masih gagal, masukkan kembali ke antrian baru
          newQueue.push(item);

          // ✅ LOG SENTRY: Warning Gagal (Butuh Perhatian)
          // Ini penting! Jika sync otomatis gagal terus, kita harus tahu alasannya.
          captureSystemError({
             error: error,
             category: "NETWORK",
             message: `Gagal Sync Sesi Offline ${item.id.slice(0,6)} - Retrying later`,
             severity: "warning"
          });
        }
      }

      // Update LocalStorage dengan sisa antrian (jika ada yang masih gagal)
      if (newQueue.length > 0) {
        localStorage.setItem('pending_uploads', JSON.stringify(newQueue));
        toast.error(`${failCount} items failed to sync. Will retry later.`, { id: toastId });
      } else {
        localStorage.removeItem('pending_uploads');
        toast.success(`All ${successCount} sessions synced to cloud! ☁️`, { id: toastId });
      }
    };

    // 1. Cek saat komponen dimount (misal pas refresh halaman / baru buka web)
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