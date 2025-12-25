// src/types/system.ts

export type Severity = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  desktopNotifications: boolean;
  categories: {
    system: boolean;
    upload: boolean;
    camera: boolean;
    network: boolean;
  };
  doNotDisturb: boolean;
}

export interface ServiceHealth {
  name: 'supabase' | 'cloudinary' | 'firebase' | 'network' | 'storage' | 'camera';
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  lastChecked: number;
  message?: string;
  details?: any;
}

export interface SystemHealthState {
  services: Record<string, ServiceHealth>;
  globalStatus: 'healthy' | 'degraded' | 'critical';
  batteryLevel?: number;
  isCharging?: boolean;
  deviceTemp?: number; // Experimental
}