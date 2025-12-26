'use client';

import { useState, useEffect } from 'react';
import { updateEvent } from '@/lib/actions/events';
import toast from 'react-hot-toast';
import { Palette } from 'lucide-react';

// --- DEFINISI PRESET TEMA LENGKAP (Tombol + Background + Text) ---
const THEME_PRESETS = [
  { 
    id: 'custom', 
    name: '🎨 Custom (Manual)', 
    primary: '', 
    secondary: '', 
    bg: '', 
    text: '' 
  },
  { 
    id: 'midnight', 
    name: '🌙 Midnight Blue (Default)', 
    primary: '#3b82f6', 
    secondary: '#a855f7', 
    bg: '#0f172a', 
    text: '#f8fafc' 
  },
  { 
    id: 'cupcake', 
    name: '🌸 Sweet Cupcake', 
    primary: '#ec4899', 
    secondary: '#f472b6', 
    bg: '#fff1f2', // Pink muda
    text: '#881337' // Merah maroon
  },
  { 
    id: 'forest', 
    name: '🌲 Deep Forest', 
    primary: '#22c55e', 
    secondary: '#15803d', 
    bg: '#052e16', // Hijau sangat gelap (hampir hitam)
    text: '#dcfce7' // Hijau sangat muda
  },
  { 
    id: 'cyberpunk', 
    name: '⚡ Cyberpunk Neon', 
    primary: '#facc15', 
    secondary: '#06b6d4', 
    bg: '#18181b', // Hitam pekat
    text: '#e4e4e7' // Abu-abu terang
  },
  { 
    id: 'minimalist', 
    name: '☕ Warm Minimalist', 
    primary: '#d97706', 
    secondary: '#78350f', 
    bg: '#fffbeb', // Krem hangat
    text: '#451a03' // Coklat tua
  },
  { 
    id: 'luxury', 
    name: '👑 Luxury Gold', 
    primary: '#ca8a04', 
    secondary: '#000000', 
    bg: '#1c1917', // Stone gelap
    text: '#fef08a' // Emas muda
  },
  // ... (preset lama) ...

  { 
    id: 'ocean', 
    name: '🌊 Ocean Breeze', 
    primary: '#06b6d4', // Cyan-500
    secondary: '#1e40af', // Blue-800
    bg: '#ecfeff', // Cyan-50 (Sangat muda)
    text: '#164e63' // Cyan-900
  },
  { 
    id: 'sunset', 
    name: '🌅 Sunset Vibes', 
    primary: '#f97316', // Orange-500
    secondary: '#db2777', // Pink-600
    bg: '#2e1065', // Violet Gelap (Malam)
    text: '#ffedd5' // Orange muda
  },
  { 
    id: 'lavender', 
    name: '💜 Lavender Dream', 
    primary: '#8b5cf6', // Violet-500
    secondary: '#6d28d9', // Violet-700
    bg: '#f3e8ff', // Purple-100 (Pastel)
    text: '#581c87' // Purple-900
  },
  { 
    id: 'corporate', 
    name: '🏢 Corporate Clean', 
    primary: '#1e293b', // Slate-800
    secondary: '#475569', // Slate-600
    bg: '#f8fafc', // Slate-50 (Putih keabu-abuan)
    text: '#0f172a' // Slate-900
  },
  { 
    id: 'romantic', 
    name: '❤️ Romantic Rose', 
    primary: '#e11d48', // Rose-600
    secondary: '#be123c', // Rose-700
    bg: '#fff1f2', // Rose-50
    text: '#881337' // Rose-900
  },
  { 
    id: 'halloween', 
    name: '🎃 Spooky Night', 
    primary: '#ea580c', // Orange-600
    secondary: '#7e22ce', // Purple-700
    bg: '#0a0a0a', // Hampir Hitam
    text: '#fed7aa' // Orange pucat
  },
  { 
    id: 'boho', 
    name: '🍂 Earthy Boho', 
    primary: '#b45309', // Amber-700
    secondary: '#78350f', // Amber-900
    bg: '#f5f5f4', // Stone-100 (Krem/Abu hangat)
    text: '#292524' // Stone-900
  },
  { 
    id: 'mint', 
    name: '🍃 Fresh Mint', 
    primary: '#10b981', // Emerald-500
    secondary: '#047857', // Emerald-700
    bg: '#ecfdf5', // Emerald-50
    text: '#064e3b' // Emerald-900
  },
  { 
    id: 'monochrome', 
    name: '🎹 Modern Mono', 
    primary: '#171717', // Neutral-900
    secondary: '#404040', // Neutral-700
    bg: '#ffffff', // Putih Murni
    text: '#000000' // Hitam Murni
  },
  { 
    id: 'retro', 
    name: '📼 Retro Wave', 
    primary: '#d946ef', // Fuchsia-500
    secondary: '#6366f1', // Indigo-500
    bg: '#fae8ff', // Fuchsia-100
    text: '#4c0519' // Rose-950
  }
];

const formatDateTimeLocal = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
};

export default function EditEventForm({ event }: { event: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [name, setName] = useState(event.name);
  const [accessCode, setAccessCode] = useState(event.access_code);
  const [maxSessions, setMaxSessions] = useState(event.max_sessions);
  const [expiresAt, setExpiresAt] = useState(formatDateTimeLocal(event.expires_at));

  // Theme States
  const [primaryColor, setPrimaryColor] = useState(event.primary_color || '#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState(event.secondary_color || '#a855f7');
  const [backgroundColor, setBackgroundColor] = useState(event.background_color || '#0f172a');
  const [textColor, setTextColor] = useState(event.text_color || '#f8fafc');
  
  const [selectedPreset, setSelectedPreset] = useState('custom');

  // ✅ AUTO DETECT PRESET SAAT BUKA MODAL
  useEffect(() => {
    if (isOpen) {
        // Cek kecocokan warna saat ini dengan preset yang ada
        const matched = THEME_PRESETS.find(p => 
            p.id !== 'custom' && 
            p.primary === primaryColor && 
            p.secondary === secondaryColor &&
            p.bg === backgroundColor // Cek Background juga
        );
        setSelectedPreset(matched ? matched.id : 'custom');
    }
  }, [isOpen, primaryColor, secondaryColor, backgroundColor]);

  // ✅ FUNGSI GANTI PRESET (Ini yang diperbaiki)
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    
    if (preset && presetId !== 'custom') {
        // GANTI SEMUA 4 WARNA SEKALIGUS
        setPrimaryColor(preset.primary);
        setSecondaryColor(preset.secondary);
        if (preset.bg) setBackgroundColor(preset.bg);
        if (preset.text) setTextColor(preset.text);
    }
  };

  const handleManualColorChange = (type: string, value: string) => {
    if (type === 'primary') setPrimaryColor(value);
    if (type === 'secondary') setSecondaryColor(value);
    if (type === 'background') setBackgroundColor(value);
    if (type === 'text') setTextColor(value);
    
    // Kalau ubah manual salah satu, otomatis jadi Custom
    setSelectedPreset('custom');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const utcExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;

      // Debugging Log di sisi Client
      console.log("🔥 [DEBUG] Mengirim data:", { backgroundColor, textColor });

      await updateEvent(event.id, {
        name,
        accessCode,
        maxSessions: Number(maxSessions),
        expiresAt: utcExpiresAt,
        primaryColor,
        secondaryColor,
        backgroundColor, 
        textColor       
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
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
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

               {/* ✅ EDIT TEMA DENGAN PRESET */}
               <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                   <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                      <Palette size={16} className="text-blue-600"/>
                      <label className="text-sm font-bold text-gray-800">Tema & Branding</label>
                   </div>
                   
                   <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Tema Cepat</label>
                      <select 
                        value={selectedPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                         {THEME_PRESETS.map(preset => (
                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                         ))}
                      </select>
                   </div>

                   {/* Grid Warna Utama (Primary/Secondary) */}
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">Warna Utama</label>
                         <div className="flex items-center gap-2">
                            <input 
                               type="color" 
                               value={primaryColor}
                               onChange={(e) => handleManualColorChange('primary', e.target.value)}
                               className="h-10 w-12 p-1 rounded border cursor-pointer bg-white"
                            />
                            <div className="flex-1 text-xs font-mono text-gray-600 bg-white border px-2 py-2.5 rounded truncate">
                               {primaryColor}
                            </div>
                         </div>
                      </div>

                      <div>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">Warna Kedua</label>
                         <div className="flex items-center gap-2">
                            <input 
                               type="color" 
                               value={secondaryColor}
                               onChange={(e) => handleManualColorChange('secondary', e.target.value)}
                               className="h-10 w-12 p-1 rounded border cursor-pointer bg-white"
                            />
                            <div className="flex-1 text-xs font-mono text-gray-600 bg-white border px-2 py-2.5 rounded truncate">
                               {secondaryColor}
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Grid Warna Background & Text */}
                   <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-dashed border-gray-300">
                      <div>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">Background Page</label>
                         <div className="flex items-center gap-2">
                            <input 
                               type="color" 
                               value={backgroundColor}
                               onChange={(e) => handleManualColorChange('background', e.target.value)}
                               className="h-10 w-12 p-1 rounded border cursor-pointer bg-white"
                            />
                            <div className="flex-1 text-xs font-mono text-gray-600 bg-white border px-2 py-2.5 rounded truncate">
                               {backgroundColor}
                            </div>
                         </div>
                      </div>

                      <div>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">Warna Teks</label>
                         <div className="flex items-center gap-2">
                            <input 
                               type="color" 
                               value={textColor}
                               onChange={(e) => handleManualColorChange('text', e.target.value)}
                               className="h-10 w-12 p-1 rounded border cursor-pointer bg-white"
                            />
                            <div className="flex-1 text-xs font-mono text-gray-600 bg-white border px-2 py-2.5 rounded truncate">
                               {textColor}
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   {/* Preview Bar Kecil */}
                   <div className="mt-2">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Preview Tombol</label>
                      <div 
                        className="w-full h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm transition-all"
                        style={{ 
                            background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                            color: '#ffffff'
                        }}
                      >
                         Tombol Utama
                      </div>
                   </div>
                   
                   {/* Preview Background Kecil */}
                   <div className="mt-2 p-3 rounded-lg border text-center text-xs transition-all"
                        style={{ backgroundColor: backgroundColor, color: textColor }}
                   >
                        Preview Background & Teks
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div>
                        <label className="block text-sm font-medium mb-1">Limit Foto</label>
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