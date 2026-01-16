'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { verifyEventAccess } from '@/lib/actions/eventAccess';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import toast from 'react-hot-toast';

interface EventAccessModalProps {
  // ✅ UPDATE: Ubah tipe data agar menerima object, bukan cuma string nama
  onUnlock: (eventData: any) => void;
}

export default function EventAccessModal({ onUnlock }: EventAccessModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [verifyingSession, setVerifyingSession] = useState(true); // State baru untuk loading awal
  const [turnstileToken, setTurnstileToken] = useState('');

  // Turnstile callbacks
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken('');
    toast.error('Verifikasi CAPTCHA gagal');
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
  }, []);

  // ✅ PERBAIKAN LOGIKA: Re-validasi ke server setiap kali halaman dibuka
  useEffect(() => {
    const checkSession = async () => {
      const savedEvent = localStorage.getItem('active_event_session');

      if (savedEvent) {
        try {
          const parsed = JSON.parse(savedEvent);

          // 1. Cek Client Side (Tanggal)
          if (new Date(parsed.expiry) <= new Date()) {
            throw new Error('Expired');
          }

          // 2. ✅ CEK SERVER SIDE (Kuota & Status Aktif)
          // Kita butuh kode aksesnya. Kalau tidak disimpan sebelumnya, kita harus minta user input lagi.
          // Jadi kita tambahkan penyimpanan 'code' di localStorage di bawah nanti.
          if (parsed.code) {
            const result = await verifyEventAccess(parsed.code);

            if (result.success) {
              setIsOpen(false);

              // ✅ FIX: Kirim object lengkap (ID & Nama) agar URL tidak error
              onUnlock({
                id: result.eventId || parsed.id,
                name: result.eventName
              });

            } else {
              // Kalau kuota habis saat re-check, hapus sesi dan kunci layar
              toast.error(result.message || 'Sesi berakhir.');
              localStorage.removeItem('active_event_session');
              setIsOpen(true);
            }
          } else {
            // Kalau data lama tidak ada kodenya, paksa login ulang
            localStorage.removeItem('active_event_session');
            setIsOpen(true);
          }

        } catch (e) {
          localStorage.removeItem('active_event_session');
          setIsOpen(true);
        }
      } else {
        setIsOpen(true);
      }
      setVerifyingSession(false);
    };

    checkSession();
  }, [onUnlock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyEventAccess(code);

      if (result.success && result.eventName && result.eventId) {
        toast.success(`Welcome to ${result.eventName}!`);

        // ✅ UPDATE: Simpan 'code' juga agar bisa direvalidasi nanti
        const sessionData = {
          id: result.eventId,
          name: result.eventName,
          code: code, // <--- PENTING: Simpan kode akses
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
        localStorage.setItem('active_event_session', JSON.stringify(sessionData));

        setIsOpen(false);

        // ✅ FIX: Kirim object lengkap (ID & Nama) ke LandingPageClient
        onUnlock({
          id: result.eventId,
          name: result.eventName
        });

      } else {
        toast.error(result.message || 'Access Denied');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Tampilkan layar hitam kosong saat sedang memverifikasi sesi (biar gak glitch)
  if (verifyingSession) return <div className="fixed inset-0 bg-black z-[99999]" />;

  if (!isOpen) return null;

  const fallbackRGB = '16 185 129';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
      <div
        className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-[80px] opacity-20 pointer-events-none"
          style={{ backgroundColor: `rgb(var(--primary, ${fallbackRGB}))` }}
        />

        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg transition-colors duration-300"
          style={{
            backgroundColor: `rgba(var(--primary, ${fallbackRGB}), 0.15)`,
            color: `rgb(var(--primary, ${fallbackRGB}))`,
            border: `1px solid rgba(var(--primary, ${fallbackRGB}), 0.2)`
          }}
        >
          🔒
        </div>

        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Event Access</h2>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          Masukkan kode akses unik event Anda untuk membuka kamera dan memulai sesi foto.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE HERE"
              className="w-full bg-black/50 border border-gray-700 text-white text-center text-3xl font-mono tracking-[0.2em] py-5 rounded-2xl outline-none transition-all placeholder:text-gray-700 placeholder:tracking-normal placeholder:text-lg focus:scale-[1.02]"
              style={{
                borderColor: code ? `rgb(var(--primary, ${fallbackRGB}))` : undefined,
                boxShadow: code ? `0 0 20px -5px rgba(var(--primary, ${fallbackRGB}), 0.3)` : 'none'
              }}
              autoFocus
            />
          </div>

          {/* Turnstile CAPTCHA */}
          <div className="flex justify-center">
            <TurnstileWidget
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
              theme="dark"
              size="normal"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code || !turnstileToken}
            className="w-full py-4 text-white font-bold text-lg rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
            style={{
              backgroundColor: `rgb(var(--primary, ${fallbackRGB}))`,
              borderColor: `rgb(var(--primary, ${fallbackRGB}))`,
              color: '#ffffff',
              boxShadow: `0 10px 30px -10px rgba(var(--primary, ${fallbackRGB}), 0.5)`
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : !turnstileToken ? (
              'Selesaikan CAPTCHA 🔒'
            ) : (
              'Unlock Photobooth 🔓'
            )}
          </button>
        </form>

        <div className="mt-8 flex justify-center">
          <div className="px-4 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] text-gray-500 uppercase tracking-widest">
            Protected by SnapBooth Engine
          </div>
        </div>
      </div>
    </div>
  );
}