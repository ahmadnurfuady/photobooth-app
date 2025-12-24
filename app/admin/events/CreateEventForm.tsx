'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createEvent } from '@/lib/actions/events';
import toast from 'react-hot-toast';

export default function CreateEventForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk Form Fields
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [maxSessions, setMaxSessions] = useState(0); // 0 = Unlimited
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Input
    if (!name.trim() || !accessCode.trim()) {
      toast.error('Nama Event dan Kode Akses wajib diisi!');
      return;
    }

    setIsLoading(true);
    try {
      // 🔥 PENTING: Konversi Waktu Lokal (Laptop) ke UTC ISO String
      // Agar database mengerti waktu yang tepat dan tidak telat 7 jam (WIB)
      const utcExpiresAt = expiresAt 
        ? new Date(expiresAt).toISOString() 
        : null;

      // Panggil server action dengan parameter lengkap
      await createEvent(name, accessCode, Number(maxSessions), utcExpiresAt);
      
      toast.success('Kegiatan berhasil dibuat!');
      
      // Reset Form
      setName('');
      setAccessCode('');
      setMaxSessions(0);
      setExpiresAt('');
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Gagal membuat kegiatan. Pastikan Kode Akses unik.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>+ Buat Kegiatan Baru</Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Buat Kegiatan Baru</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. NAMA EVENT */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Kegiatan</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Malam Keakraban 2026"
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        autoFocus
                        required
                    />
                </div>

                {/* 2. KODE AKSES */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kode Akses (Unik)</label>
                    <input 
                        type="text" 
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/\s/g, ''))} // Auto Uppercase & No Space
                        placeholder="CONTOH: WEDDING24"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-mono tracking-wider focus:ring-2 focus:ring-blue-500 outline-none uppercase transition-all bg-gray-50"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Kode ini digunakan tamu untuk masuk ke photobooth.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* 3. LIMIT SESI */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Batas Jumlah Foto</label>
                        <input 
                            type="number" 
                            min="0"
                            value={maxSessions}
                            onChange={(e) => setMaxSessions(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Isi <strong>0</strong> jika Unlimited.</p>
                    </div>

                    {/* 4. TENGGAT WAKTU */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tenggat Waktu</label>
                        <input 
                            type="datetime-local" 
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika selamanya.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={isLoading || !name || !accessCode}>
                        {isLoading ? 'Menyimpan...' : 'Simpan Kegiatan'}
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}