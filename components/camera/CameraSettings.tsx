'use client';

import React, { useEffect, useState } from 'react';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
}

export default function CameraSettings({
  isOpen,
  onClose,
  currentDeviceId,
  onDeviceChange,
}: CameraSettingsProps) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Ambil daftar kamera saat komponen muncul
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Minta izin dulu biar label/nama kameranya muncul (bukan cuma ID acak)
        await navigator.mediaDevices.getUserMedia({ video: true });

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => ({
            deviceId: device.deviceId,
            // Kalau label kosong, kasih nama default
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
          }));

        setDevices(videoDevices);
      } catch (error) {
        console.error("Gagal load device:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      getDevices();
    }
  }, [isOpen]);

  // Efek Animasi Slide (CSS Class)
  const containerClass = isOpen
    ? 'translate-y-0 opacity-100 pointer-events-auto'
    : '-translate-y-full opacity-0 pointer-events-none';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-black/95 text-white transition-all duration-500 ease-in-out ${containerClass}`}
    >
      {/* Header Setting */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Camera Settings
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* Konten Setting */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500 delay-100">
        
        <div className="w-full max-w-md space-y-4">
          <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
            Select Video Source
          </label>
          
          {loading ? (
            <div className="text-center text-gray-500">Detecting cameras...</div>
          ) : (
            <div className="relative">
              <select
                value={currentDeviceId || ''}
                onChange={(e) => onDeviceChange(e.target.value)}
                className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-lg"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    📷 {device.label}
                  </option>
                ))}
              </select>
              {/* Panah Dropdown Custom */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            Tips: Jika menggunakan DSLR, pastikan EOS Webcam Utility / Capture Card sudah terhubung sebelum membuka halaman ini.
          </p>
        </div>

        {/* Tombol Simpan / Tutup */}
        <button
          onClick={onClose}
          className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
        >
          Done / Selesai
        </button>

      </div>
    </div>
  );
}