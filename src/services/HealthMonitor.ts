// src/services/HealthMonitor.ts
import { supabase } from '@/lib/supabase'; // Asumsi client supabase ada
import { ServiceHealth, SystemHealthState } from '../types/system';

class HealthMonitor {
  // --- Checkers ---
  
  private async checkSupabase(): Promise<ServiceHealth> {
    const start = performance.now();
    try {
      const { error } = await supabase.from('app_logs').select('count', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      return { 
        name: 'supabase', 
        status: 'healthy', 
        lastChecked: Date.now(), 
        latency: Math.round(performance.now() - start) 
      };
    } catch (e: any) {
      return { 
        name: 'supabase', 
        status: 'down', 
        lastChecked: Date.now(), 
        message: e.message 
      };
    }
  }

  private async checkNetwork(): Promise<ServiceHealth> {
    const isOnline = navigator.onLine;
    // Check actual connectivity via a ping
    if (isOnline) {
      try {
        const start = performance.now();
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
        return { name: 'network', status: 'healthy', latency: Math.round(performance.now() - start), lastChecked: Date.now() };
      } catch {
        return { name: 'network', status: 'degraded', message: 'Connected but no internet', lastChecked: Date.now() };
      }
    }
    return { name: 'network', status: 'down', message: 'Offline', lastChecked: Date.now() };
  }

  private async checkStorage(): Promise<ServiceHealth> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota, usage } = await navigator.storage.estimate();
      if (quota && usage) {
        const percentUsed = (usage / quota) * 100;
        const status = percentUsed > 90 ? 'degraded' : 'healthy';
        return { 
          name: 'storage', 
          status, 
          lastChecked: Date.now(), 
          details: { percentUsed: percentUsed.toFixed(1) + '%' } 
        };
      }
    }
    return { name: 'storage', status: 'healthy', lastChecked: Date.now() }; // Fallback
  }

  // --- Mobile Battery Check ---
  public async getBatteryStatus() {
    if ('getBattery' in navigator) {
      const battery: any = await (navigator as any).getBattery();
      return {
        level: battery.level * 100,
        charging: battery.charging
      };
    }
    return null;
  }

  // --- Main Runner ---
  public async runFullCheck(): Promise<SystemHealthState> {
    const [db, net, storage] = await Promise.all([
      this.checkSupabase(),
      this.checkNetwork(),
      this.checkStorage()
    ]);

    const services: Record<string, ServiceHealth> = {
      supabase: db,
      network: net,
      storage: storage
    };

    // Calculate Global Status
    let globalStatus: SystemHealthState['globalStatus'] = 'healthy';
    if (Object.values(services).some(s => s.status === 'down')) globalStatus = 'critical';
    else if (Object.values(services).some(s => s.status === 'degraded')) globalStatus = 'degraded';

    const battery = await this.getBatteryStatus();

    return {
      services,
      globalStatus,
      batteryLevel: battery?.level,
      isCharging: battery?.charging
    };
  }
}

export const healthMonitor = new HealthMonitor();