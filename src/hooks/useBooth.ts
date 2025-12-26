// src/hooks/useBooth.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { telemetry } from '@/src/services/TelemetryService';

export const useBooth = () => {
  useEffect(() => {
    const initBooth = async () => {
      let boothId = localStorage.getItem('booth_id');
      let boothCode = localStorage.getItem('booth_code');

      // Jika belum ada, buat kode baru
      if (!boothCode) {
        boothCode = `BOOTH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        localStorage.setItem('booth_code', boothCode);
      }

      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`
      };

      // Registrasi atau Update status ke Online
      // FIX: Menambahkan booth_name dan device_info agar tidak null
      const { data, error } = await supabase
        .from('booths')
        .upsert({
            booth_code: boothCode,
            booth_name: boothCode, // Menggunakan boothCode sebagai nama default agar tidak null
            device_info: deviceInfo,
            status: 'online',
            last_heartbeat: new Date().toISOString()
        }, { onConflict: 'booth_code' })
        .select()
        .single();

      if (error) {
        // Kirim error.message (string), bukan objek 'error' utuh
        telemetry.logError(error.message, 'BoothRegistration'); 
        return;
      }

      if (data) {
        localStorage.setItem('booth_id', data.id);
        
        // Mulai kirim Heartbeat setiap 30 detik
        const interval = setInterval(async () => {
          const health = {
            network: navigator.onLine,
            memory: (performance as any).memory?.usedJSHeapSize || 0
          };

          await supabase.from('booth_heartbeats').insert({
            booth_id: data.id,
            status: 'healthy',
            health_data: health
          });

          await supabase.from('booths').update({
            last_heartbeat: new Date().toISOString(),
            status: 'online'
          }).eq('id', data.id);
          
        }, 30000);

        return () => clearInterval(interval);
      }
    };

    initBooth();
  }, []);
};