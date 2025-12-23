import React from 'react';
import { getEvents, createEvent, activateEvent } from '@/lib/actions/events';
import { Button } from '@/components/ui/Button';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Komponen Client Kecil untuk Tombol Switch/Activate
import EventActions from '@/app/admin/events/EventActions'; 
import CreateEventForm from '@/app/admin/events/CreateEventForm';

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <Link 
                href="/admin/dashboard"
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-6 text-sm font-medium group w-fit"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
                Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Daftar Kegiatan</h1>
            <p className="text-gray-500">Kelola acara photobooth Anda di sini.</p>
        </div>
        {/* Form Modal Buat Event (Kita buat di bawah) */}
        <CreateEventForm />
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-700">Nama Kegiatan</th>
              <th className="p-4 font-semibold text-gray-700">Tanggal Dibuat</th>
              <th className="p-4 font-semibold text-gray-700 text-center">Total Sesi</th>
              <th className="p-4 font-semibold text-gray-700 text-center">Status</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">Belum ada kegiatan. Buat baru yuk!</td>
                </tr>
            ) : (
                events.map((event: any) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{event.name}</td>
                    <td className="p-4 text-gray-500 text-sm">
                        {new Date(event.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </td>
                    <td className="p-4 text-center font-bold text-blue-600">{event.session_count}</td>
                    <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {event.is_active ? 'SEDANG AKTIF' : 'Non-Aktif'}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                        {/* Komponen Client untuk handle klik */}
                        <EventActions event={event} />
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}