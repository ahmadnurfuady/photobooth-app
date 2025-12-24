// app/admin/events/page.tsx
import React from 'react';
import { getEvents } from '@/lib/actions/events';
import Link from 'next/link';
import EventActions from './EventActions'; 
import CreateEventForm from './CreateEventForm';

export const dynamic = 'force-dynamic'; // 🔥 PENTING: Paksa halaman selalu ambil data terbaru (No Cache)

export default async function EventsPage() {
  // getEvents sekarang sudah otomatis mematikan event yang kadaluarsa
  const events = await getEvents();

  return (
    <div className="p-8 w-full max-w-7xl mx-auto"> {/* Lebarkan max-w */}
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
            <p className="text-gray-500">Kelola acara, kode akses, dan kuota foto.</p>
        </div>
        <CreateEventForm />
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-700">Nama Kegiatan</th>
              <th className="p-4 font-semibold text-gray-700">Kode Akses</th> 
              <th className="p-4 font-semibold text-gray-700 text-center">Kuota</th> 
              <th className="p-4 font-semibold text-gray-700 text-center">Total Sesi</th>
              <th className="p-4 font-semibold text-gray-700 text-center">Status</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">Belum ada kegiatan. Buat baru yuk!</td>
                </tr>
            ) : (
                events.map((event: any) => (
                <tr key={event.id} className={`hover:bg-gray-50 transition-colors ${!event.is_active ? 'opacity-75' : ''}`}>
                    <td className="p-4">
                        <div className="font-medium text-gray-900">{event.name}</div>
                        <div className="text-xs text-gray-500">
                             {new Date(event.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </div>
                    </td>
                    <td className="p-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700 font-bold border">
                            {event.access_code || '-'}
                        </code>
                    </td>
                    <td className="p-4 text-center text-sm">
                        {event.max_sessions === 0 ? (
                            <span className="text-green-600 font-bold">∞ Unlimited</span>
                        ) : (
                            <span className="text-gray-700">{event.max_sessions}</span>
                        )}
                    </td>
                    <td className="p-4 text-center font-bold text-blue-600">
                        {event.session_count}
                    </td>
                    <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {event.is_active && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                            {event.is_active ? 'AKTIF' : 'Non-Aktif'}
                        </span>
                        {/* Indikator Expired */}
                        {event.expires_at && new Date(event.expires_at) < new Date() && (
                            <div className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wide">Expired</div>
                        )}
                    </td>
                    <td className="p-4 text-right">
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