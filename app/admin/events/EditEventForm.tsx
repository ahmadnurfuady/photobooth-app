// app/admin/events/EditEventForm.tsx
'use client';

import { useState } from 'react';
import { updateEvent } from '@/lib/actions/events';
import toast from 'react-hot-toast';

// Helper untuk format tanggal dari ISO DB ke value input datetime-local
const formatDateTimeLocal = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Mengoreksi offset timezone agar tampil benar di input lokal
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
};

export default function EditEventForm({ event }: { event: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize state dengan data event yang ada
  const [name, setName] = useState(event.name);
  const [accessCode, setAccessCode] = useState(event.access_code);
  const [maxSessions, setMaxSessions] = useState(event.max_sessions);
  const [expiresAt, setExpiresAt] = useState(formatDateTimeLocal(event.expires_at));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const utcExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;

      await updateEvent(event.id, {
        name,
        accessCode,
        maxSessions: Number(maxSessions),
        expiresAt: utcExpiresAt
      });
      
      toast.success('Event berhasil diupdate!');
      setIsOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Gagal update event.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Edit Event"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm z-[9999]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Edit Event</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
               <div>
                    <label className="block text-sm font-medium mb-1">Nama Kegiatan</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded p-2" required />
               </div>
               <div>
                    <label className="block text-sm font-medium mb-1">Kode Akses</label>
                    <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/\s/g, ''))} className="w-full border rounded p-2 font-mono uppercase" required />
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                        <label className="block text-sm font-medium mb-1">Limit Foto (0=Unlimited)</label>
                        <input type="number" value={maxSessions} onChange={e => setMaxSessions(Number(e.target.value))} className="w-full border rounded p-2" />
                   </div>
                   <div>
                        <label className="block text-sm font-medium mb-1">Tenggat Waktu</label>
                        <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full border rounded p-2 text-sm" />
                   </div>
               </div>

               <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                   <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                   <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                       {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                   </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}