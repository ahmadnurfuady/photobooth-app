// app/admin/theme/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

// --- 1. DEFINISI PRESET TEMA ---
const THEME_PRESETS = [
  {
    id: 'custom',
    name: '🎨 Custom (Manual)',
    colors: null, // User atur sendiri
  },
  {
    id: 'midnight',
    name: '🌙 Midnight Blue (Default)',
    colors: {
      primary_color: '#3b82f6',    // Blue-500
      secondary_color: '#a855f7',  // Purple-500
      background_color: '#0f172a', // Slate-950
      text_color: '#f8fafc',       // Slate-50
    },
  },
  {
    id: 'cupcake',
    name: '🌸 Sweet Cupcake',
    colors: {
      primary_color: '#ec4899',    // Pink-500
      secondary_color: '#f472b6',  // Pink-400
      background_color: '#fff1f2', // Rose-50 (Terang)
      text_color: '#881337',       // Rose-900
    },
  },
  {
    id: 'forest',
    name: '🌲 Deep Forest',
    colors: {
      primary_color: '#22c55e',    // Green-500
      secondary_color: '#15803d',  // Green-700
      background_color: '#052e16', // Green-950
      text_color: '#dcfce7',       // Green-100
    },
  },
  {
    id: 'cyberpunk',
    name: '⚡ Cyberpunk Neon',
    colors: {
      primary_color: '#facc15',    // Yellow-400
      secondary_color: '#06b6d4',  // Cyan-500
      background_color: '#18181b', // Zinc-950
      text_color: '#e4e4e7',       // Zinc-200
    },
  },
  {
    id: 'minimalist',
    name: '☕ Warm Minimalist',
    colors: {
      primary_color: '#d97706',    // Amber-600
      secondary_color: '#78350f',  // Amber-900
      background_color: '#fffbeb', // Amber-50 (Terang)
      text_color: '#451a03',       // Amber-950
    },
  },
];

export default function ThemeSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Pilihan Dropdown
  const [selectedPresetId, setSelectedPresetId] = useState('custom');

  // State Config Warna
  const [config, setConfig] = useState({
    site_title: 'Photobooth Event',
    primary_color: '#3b82f6',
    secondary_color: '#a855f7',
    background_color: '#0f172a',
    text_color: '#f8fafc',
  });

  // Load Initial Data
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const loadedConfig = {
            site_title: data.site_title || 'Photobooth Event',
            primary_color: data.primary_color || '#3b82f6',
            secondary_color: data.secondary_color || '#a855f7',
            background_color: data.background_color || '#0f172a',
            text_color: data.text_color || '#f8fafc',
          };
          setConfig(loadedConfig);

          // Coba deteksi apakah warna saat ini cocok dengan salah satu preset?
          const matchedPreset = THEME_PRESETS.find(p => 
            p.colors &&
            p.colors.primary_color === loadedConfig.primary_color &&
            p.colors.background_color === loadedConfig.background_color
          );
          
          if (matchedPreset) {
            setSelectedPresetId(matchedPreset.id);
          } else {
            setSelectedPresetId('custom');
          }
        }
        setLoading(false);
      });
  }, []);

  // --- LOGIC GANTI PRESET ---
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);

    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (preset && preset.colors) {
      // Jika pilih preset, timpa warna config dengan warna preset
      setConfig(prev => ({
        ...prev,
        ...preset.colors
      }));
      toast.success(`Theme switched to ${preset.name}`);
    }
  };

  // Helper Input Change (Manual Edit)
  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    // Jika user ubah manual, otomatis set dropdown ke 'Custom'
    if (key.includes('_color')) {
      setSelectedPresetId('custom');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) toast.success('Theme updated successfully!');
      else toast.error('Failed to update theme');
    } catch (e) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-white">Loading config...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10 font-sans">
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* --- KOLOM KIRI: KONTROL EDITOR --- */}
        <div className="space-y-8">
          
          <div>
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-medium group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
              Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold mb-2">Theme Editor</h1>
            <p className="text-slate-400">Customize the look and feel of your photobooth.</p>
          </div>

          <div className="space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
            
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Event Title</label>
              <input 
                type="text" 
                value={config.site_title}
                onChange={(e) => handleChange('site_title', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <hr className="border-slate-700 my-4" />

            {/* --- DROPDOWN PRESET TEMA --- */}
            <div>
              <label className="block text-sm font-bold mb-2 text-white">Choose a Preset Theme</label>
              <select
                value={selectedPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
              >
                {THEME_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Selecting a preset will automatically update the colors below. You can still tweak them manually.
              </p>
            </div>

            {/* Colors Grid (Akan berubah otomatis jika preset dipilih) */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <ColorInput label="Primary Color" value={config.primary_color} onChange={(v) => handleChange('primary_color', v)} />
              <ColorInput label="Secondary Color" value={config.secondary_color} onChange={(v) => handleChange('secondary_color', v)} />
              <ColorInput label="Background Color" value={config.background_color} onChange={(v) => handleChange('background_color', v)} />
              <ColorInput label="Text Color" value={config.text_color} onChange={(v) => handleChange('text_color', v)} />
            </div>

            <div className="pt-4 border-t border-slate-700 mt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 py-3"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>


        {/* --- KOLOM KANAN: LIVE PREVIEW (PHONE MOCKUP) --- */}
        <div className="flex items-center justify-center bg-slate-800/20 rounded-3xl border border-slate-800 p-8">
          
          <div className="relative w-[320px] h-[640px] bg-black rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden flex flex-col">
            
            <div 
              className="flex-1 flex flex-col p-6 relative overflow-y-auto transition-colors duration-500"
              style={{
                backgroundColor: config.background_color,
                color: config.text_color,
              }}
            >
              <div 
                className="absolute top-[-10%] left-[-10%] w-[200px] h-[200px] rounded-full blur-[60px] opacity-30 pointer-events-none transition-colors duration-500"
                style={{ backgroundColor: config.secondary_color }}
              />
              <div 
                className="absolute bottom-[-10%] right-[-10%] w-[200px] h-[200px] rounded-full blur-[60px] opacity-30 pointer-events-none transition-colors duration-500"
                style={{ backgroundColor: config.primary_color }}
              />

              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center space-y-6">
                
                <div 
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider opacity-80 transition-colors duration-500"
                  style={{ 
                    backgroundColor: `${config.primary_color}20`, 
                    color: config.primary_color,
                    border: `1px solid ${config.primary_color}40`
                  }}
                >
                  Ready to Capture
                </div>

                <h2 className="text-3xl font-extrabold leading-tight">
                  {config.site_title}
                </h2>

                <p className="text-sm opacity-70">
                  Create memories with our premium photobooth experience.
                </p>

                <button 
                  className="w-full py-3 rounded-full font-bold shadow-lg transition-all active:scale-95 duration-500"
                  style={{
                    background: `linear-gradient(to right, ${config.primary_color}, ${config.secondary_color})`,
                    color: '#ffffff'
                  }}
                >
                  Start Camera
                </button>

                <button 
                  className="w-full py-3 rounded-full font-bold border transition-colors duration-500"
                  style={{
                    borderColor: `${config.text_color}30`,
                    color: config.text_color
                  }}
                >
                  Admin Login
                </button>

              </div>
            </div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full"></div>

          </div>

          <p className="absolute bottom-4 text-xs text-slate-500">Live Preview</p>
        </div>

      </div>
    </div>
  );
}

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div>
    <label className="block text-xs font-medium mb-1 text-slate-400">{label}</label>
    <div className="flex items-center gap-2">
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 rounded border-none cursor-pointer bg-transparent"
      />
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-white font-mono uppercase transition-colors"
      />
    </div>
  </div>
);