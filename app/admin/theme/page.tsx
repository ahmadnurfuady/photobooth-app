'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ThemeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Tema (Default Values)
  const [config, setConfig] = useState({
    site_title: 'Photobooth Event',
    primary_color: '#3b82f6', // Blue-500
    secondary_color: '#a855f7', // Purple-500
    background_color: '#0f172a', // Slate-950
    text_color: '#f8fafc', // Slate-50
  });

  // Load Initial Data
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfig({
            site_title: data.site_title || 'Photobooth Event',
            primary_color: data.primary_color || '#3b82f6',
            secondary_color: data.secondary_color || '#a855f7',
            background_color: data.background_color || '#0f172a',
            text_color: data.text_color || '#f8fafc',
          });
        }
        setLoading(false);
      });
  }, []);

  // Handle Save
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

  // Helper Input Change
  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-10 text-white">Loading config...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10 font-sans">
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* --- KOLOM KIRI: KONTROL EDITOR --- */}
        <div className="space-y-8">
          <div>
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

            {/* Colors Grid */}
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Primary Color" value={config.primary_color} onChange={(v) => handleChange('primary_color', v)} />
              <ColorInput label="Secondary Color" value={config.secondary_color} onChange={(v) => handleChange('secondary_color', v)} />
              <ColorInput label="Background Color" value={config.background_color} onChange={(v) => handleChange('background_color', v)} />
              <ColorInput label="Text Color" value={config.text_color} onChange={(v) => handleChange('text_color', v)} />
            </div>

            <div className="pt-4 border-t border-slate-700">
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
          
          {/* MOCKUP HP */}
          <div className="relative w-[320px] h-[640px] bg-black rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Dynamic Styles Injection for Preview */}
            <div 
              className="flex-1 flex flex-col p-6 relative overflow-y-auto transition-colors duration-300"
              style={{
                backgroundColor: config.background_color,
                color: config.text_color,
              }}
            >
              {/* Background Blobs Simulation */}
              <div 
                className="absolute top-[-10%] left-[-10%] w-[200px] h-[200px] rounded-full blur-[60px] opacity-30 pointer-events-none"
                style={{ backgroundColor: config.secondary_color }}
              />
              <div 
                className="absolute bottom-[-10%] right-[-10%] w-[200px] h-[200px] rounded-full blur-[60px] opacity-30 pointer-events-none"
                style={{ backgroundColor: config.primary_color }}
              />

              {/* Mockup Content: Landing Page Vibe */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center space-y-6">
                
                {/* Badge */}
                <div 
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider opacity-80"
                  style={{ 
                    backgroundColor: `${config.primary_color}20`, // 20% opacity hex hack
                    color: config.primary_color,
                    border: `1px solid ${config.primary_color}40`
                  }}
                >
                  Ready to Capture
                </div>

                {/* Title */}
                <h2 className="text-3xl font-extrabold leading-tight">
                  {config.site_title}
                </h2>

                <p className="text-sm opacity-70">
                  Create memories with our premium photobooth experience.
                </p>

                {/* Primary Button */}
                <button 
                  className="w-full py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
                  style={{
                    background: `linear-gradient(to right, ${config.primary_color}, ${config.secondary_color})`,
                    color: '#ffffff' // Button text always white usually safe
                  }}
                >
                  Start Camera
                </button>

                {/* Secondary Button */}
                <button 
                  className="w-full py-3 rounded-full font-bold border"
                  style={{
                    borderColor: `${config.text_color}30`,
                    color: config.text_color
                  }}
                >
                  Admin Login
                </button>

              </div>
            </div>

            {/* Mockup Notch & Bar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full"></div>

          </div>

          <p className="absolute bottom-4 text-xs text-slate-500">Live Preview</p>
        </div>

      </div>
    </div>
  );
}

// Component Kecil untuk Input Warna
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
        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-white font-mono uppercase"
      />
    </div>
  </div>
);