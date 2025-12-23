'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Props {
  eventId: string;
  eventName: string;
  lastBackupAt: string | null; // Tanggal backup terakhir (atau null jika belum)
  hasPhotos: boolean; // Cek apakah masih ada foto di event ini
}

export default function DeleteEventPhotos({ eventId, eventName, lastBackupAt, hasPhotos }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Jika foto sudah 0 (sudah bersih), tombol tidak perlu bisa diklik/aktif
  if (!hasPhotos) {
    return (
      <Button disabled variant="outline" className="opacity-50 cursor-not-allowed">
        Data Bersih
      </Button>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Panggil API delete (Pastikan file API route-nya juga sudah dibuat nanti)
      const res = await fetch(`/api/admin/events/${eventId}/clear-photos`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data');
      
      toast.success('Foto berhasil dihapus. Statistik aman.');
      setIsOpen(false);
      router.refresh(); // Refresh halaman agar angka update
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        // Style tombol merah muda (warning lembut)
        className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
      >
        🗑️ Hapus Foto
      </Button>

      {/* MODAL POPUP KONFIRMASI */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200">
            
            {/* Header Modal */}
            <h3 className="text-xl font-bold mb-1 text-gray-900">Hapus Foto Kegiatan?</h3>
            <p className="text-sm text-gray-500 mb-6">Event: <span className="font-semibold">{eventName}</span></p>

            {/* LOGIKA TAMPILAN PERINGATAN */}
            {!lastBackupAt ? (
              // TAMPILAN 1: JIKA BELUM BACKUP (MERAH MENYALA - BAHAYA)
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <h4 className="font-bold text-red-800 text-sm uppercase tracking-wide">Peringatan: Belum Backup!</h4>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      Sistem mendeteksi Anda <strong>belum melakukan backup</strong>. 
                      Tindakan ini <strong>tidak dapat dibatalkan</strong>. Foto akan hilang permanen dari server.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // TAMPILAN 2: JIKA SUDAH BACKUP (BIRU TENANG - AMAN)
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700">
                <div className="flex items-center gap-2 mb-1 font-semibold">
                   <span>✅</span> Data Aman
                </div>
                <p className="text-xs opacity-90">
                  Terakhir backup: {new Date(lastBackupAt).toLocaleString()}.<br/>
                  Statistik pengunjung akan tetap tersimpan di database sebagai arsip.
                </p>
              </div>
            )}

            {/* TOMBOL AKSI DI DALAM MODAL */}
            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              
              <Button 
                onClick={handleDelete} 
                disabled={isDeleting}
                className={`text-white transition-colors ${
                    !lastBackupAt 
                        ? "bg-red-700 hover:bg-red-800" // Merah gelap jika belum backup
                        : "bg-red-500 hover:bg-red-600" // Merah biasa jika aman
                }`}
              >
                {isDeleting ? 'Menghapus...' : (!lastBackupAt ? 'Saya Paham, Hapus Permanen' : 'Ya, Hapus Foto')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}