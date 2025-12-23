import React from 'react';
import Link from 'next/link';
import { getAppSettings, updateAppSetting } from '@/lib/actions/settings';
import { Button } from '@/components/ui/Button';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const settings = await getAppSettings();
  
  // Await searchParams (Next.js 15)
  const params = await searchParams;
  const isConnected = !!settings.google_refresh_token;
  const connectedEmail = settings.google_connected_email || 'Tidak diketahui';

  async function saveSettings(formData: FormData) {
    'use server';
    const clientId = formData.get('google_client_id') as string;
    const clientSecret = formData.get('google_client_secret') as string;
    await updateAppSetting('google_client_id', clientId);
    await updateAppSetting('google_client_secret', clientSecret);
  }

  return (
    <div className="p-8 w-full max-w-4xl mx-auto">
      
      {/* Tombol Back */}
      <Link href="/admin/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-6 text-sm font-medium group w-fit">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
        Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Pengaturan Aplikasi</h1>
      <p className="text-gray-500 mb-8">Kelola integrasi pihak ketiga dan konfigurasi sistem.</p>

      {/* --- STATUS KONEKSI --- */}
      <div className={`mb-8 p-6 rounded-xl border flex items-center justify-between ${isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div>
            <h3 className={`font-bold ${isConnected ? 'text-green-800' : 'text-gray-700'}`}>
                {isConnected ? '✅ Google Drive Terhubung' : '⚠️ Belum Terhubung'}
            </h3>
            <p className="text-sm mt-1 opacity-80">
                {isConnected 
                    ? `Backup aktif ke akun: ${connectedEmail}` 
                    : 'Hubungkan akun untuk mengaktifkan fitur backup otomatis.'}
            </p>
        </div>
        
        {isConnected ? (
             // Kalau sudah connect, tombolnya jadi "Reconnect" (Link biasa)
             <a href="/api/auth/google" className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition">
                Ganti Akun
             </a>
        ) : (
             // Kalau belum, tombol Connect (Link ke API route login)
             <a href="/api/auth/google" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 transition">
                🔗 Hubungkan Google Drive
             </a>
        )}
      </div>

      {/* --- FORM KUNCI --- */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
           <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
           </div>
           <div>
             <h2 className="text-lg font-bold text-gray-900">Konfigurasi API</h2>
             <p className="text-sm text-gray-500">Masukkan Client ID & Secret dari Google Cloud Console.</p>
           </div>
        </div>

        <form action={saveSettings} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
                <input type="text" name="google_client_id" defaultValue={settings.google_client_id || ''} placeholder="xxx.apps.googleusercontent.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm font-mono" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Client Secret</label>
                <input type="password" name="google_client_secret" defaultValue={settings.google_client_secret || ''} placeholder="Client Secret" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm font-mono" />
            </div>
            <div className="pt-4 flex justify-end">
                <Button type="submit">💾 Simpan Konfigurasi</Button>
            </div>
        </form>
      </div>

      {/* ALERT NOTIFIKASI SUKSES */}
      {params?.status === 'connected' && (
         <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-center animate-in fade-in slide-in-from-top-4">
            🎉 Berhasil terhubung! Sekarang Anda bisa menggunakan fitur Backup.
         </div>
      )}
    </div>
  );
}