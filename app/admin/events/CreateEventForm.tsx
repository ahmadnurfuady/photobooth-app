'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createEvent } from '@/lib/actions/events';
import toast from 'react-hot-toast';

export default function CreateEventForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await createEvent(name);
      toast.success('Kegiatan berhasil dibuat!');
      setName('');
      setIsOpen(false);
    } catch (e) {
      toast.error('Gagal membuat kegiatan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>+ Buat Kegiatan Baru</Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Buat Kegiatan Baru</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kegiatan / Event</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Malam Keakraban 2026"
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={isLoading || !name}>
                        {isLoading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}