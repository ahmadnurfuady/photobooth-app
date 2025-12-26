'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createEvent } from '@/lib/actions/events';
import toast from 'react-hot-toast';
import { Palette } from 'lucide-react';

// --- DEFINISI PRESET TEMA LENGKAP (Sama dengan Edit Form) ---
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
    bg: '#fff1f2', 
    text: '#881337' 
  },
  { 
    id: 'forest', 
    name: '🌲 Deep Forest', 
    primary: '#22c55e', 
    secondary: '#15803d', 
    bg: '#052e16', 
    text: '#dcfce7' 
  },
  { 
    id: 'cyberpunk', 
    name: '⚡ Cyberpunk Neon', 
    primary: '#facc15', 
    secondary: '#06b6d4', 
    bg: '#18181b', 
    text: '#e4e4e7' 
  },
  { 
    id: 'minimalist', 
    name: '☕ Warm Minimalist', 
    primary: '#d97706', 
    secondary: '#78350f', 
    bg: '#fffbeb', 
    text: '#451a03' 
  },
  { 
    id: 'luxury', 
    name: '👑 Luxury Gold', 
    primary: '#ca8a04', 
    secondary: '#000000', 
    bg: '#1c1917', 
    text: '#fef08a' 
  },
];

export default function CreateEventForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State Form Standard
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [maxSessions, setMaxSessions] = useState(0); 
  const [expiresAt, setExpiresAt] = useState('');

  // ✅ STATE TEMA (Preset & 4 Warna)
  const [selectedPreset, setSelectedPreset] = useState('midnight');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6'); 
  const [secondaryColor, setSecondaryColor] = useState('#a855f7');
  
  // Tambahan State Baru
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [textColor, setTextColor] = useState('#f8fafc');

  // Handler Ganti Preset (Update 4 Warna Sekaligus)
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
        setPrimaryColor(preset.primary);
        setSecondaryColor(preset.secondary);
        if (preset.bg) setBackgroundColor(preset.bg);
        if (preset.text) setTextColor(preset.text);
    }
  };

  // Handler Ganti Warna Manual (Otomatis set ke Custom)
  const handleManualColorChange = (type: string, value: string) => {
    if (type === 'primary') setPrimaryColor(value);
    if (type === 'secondary') setSecondaryColor(value);
    if (type === 'background') setBackgroundColor(value);
    if (type === 'text') setTextColor(value);
    
    setSelectedPreset('custom');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !accessCode.trim()) {
      toast.error('Nama Event dan Kode Akses wajib diisi!');
      return;
    }

    setIsLoading(true);
    try {
      const utcExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;

      await createEvent({
        name, 
        accessCode, 
        maxSessions: Number(maxSessions), 
        expiresAt: utcExpiresAt,
        primaryColor,   
        secondaryColor,
        // ✅ Kirim data baru ke backend
        backgroundColor,
        textColor
      });
      
      toast.success('Kegiatan berhasil dibuat!');
      
      // Reset Form Total
      setName('');
      setAccessCode('');
      setMaxSessions(0);
      setExpiresAt('');
      
      // Reset ke Default Preset (Midnight)
      setSelectedPreset('midnight');
      setPrimaryColor('#3b82f6');
      setSecondaryColor('#a855f7');
      setBackgroundColor('#0f172a');
      setTextColor('#f8fafc');
      
      setIsOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Gagal membuat kegiatan. Pastikan Kode Akses unik.');
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
                        onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/\s/g, ''))} 
                        placeholder="CONTOH: WEDDING24"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-mono tracking-wider focus:ring-2 focus:ring-blue-500 outline-none uppercase transition-all bg-gray-50"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Kode ini digunakan tamu untuk masuk.</p>
                </div>

                {/* ✅ INPUT WARNA TEMA DENGAN PRESET */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                   <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                      <Palette size={16} className="text-blue-600"/>
                      <label className="text-sm font-bold text-gray-800">Tema & Branding</label>
                   </div>
                   
                   {/* Dropdown Preset */}
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

                   {/* ✅ Grid Warna Background & Text */}
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

                   {/* Preview Tombol */}
                   <div className="mt-2">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Preview Tombol</label>
                      <div 
                        className="w-full h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm transition-all"
                        style={{ 
                            background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                            color: '#ffffff'
                        }}
                      >
                         Mulai Photobooth
                      </div>
                   </div>
                   
                   {/* ✅ Preview Background */}
                   <div className="mt-2 p-3 rounded-lg border text-center text-xs transition-all"
                        style={{ backgroundColor: backgroundColor, color: textColor }}
                   >
                        Preview Background & Teks
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* 3. LIMIT SESI */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Batas Foto</label>
                        <input 
                            type="number" 
                            min="0"
                            value={maxSessions}
                            onChange={(e) => setMaxSessions(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">0 = Unlimited.</p>
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