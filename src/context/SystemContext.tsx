// src/context/SystemContext.tsx
'use client'; // <--- WAJIB ADA untuk Context Provider

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationManager } from '../services/NotificationManager';
import { healthMonitor } from '../services/HealthMonitor';
import { SystemHealthState, NotificationPreferences } from '../types/system';

interface SystemContextType {
  health: SystemHealthState | null;
  isChecking: boolean;
  runHealthCheck: () => Promise<void>;
  notifications: any[]; // In-app toasts queue
  dismissNotification: (id: number) => void;
  notify: typeof notificationManager.notify;
  prefs: NotificationPreferences;
  updatePrefs: (p: Partial<NotificationPreferences>) => void;
  isOfflineMode: boolean;
}

const SystemContext = createContext<SystemContextType | null>(null);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [health, setHealth] = useState<SystemHealthState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Ambil initial prefs, pastikan hanya jalan di client-side
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => {
    if (typeof window !== 'undefined') {
      return notificationManager.getPreferences();
    }
    // Default fallback jika di server (walaupun context ini client only)
    return {
      soundEnabled: true,
      vibrationEnabled: true,
      desktopNotifications: true,
      categories: { system: true, upload: true, camera: true, network: true },
      doNotDisturb: false,
    };
  });

  // --- Notification Logic ---
  const notify = useCallback((title: string, options: any) => {
    const result = notificationManager.notify(title, options);
    if (result) {
      setNotifications(prev => [result, ...prev]);
      // Auto dismiss non-critical after 5s
      if (options.severity !== 'critical' && options.severity !== 'error') {
        setTimeout(() => dismissNotification(result.id), 5000);
      }
    }
    return result;
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- Health Check Logic ---
  const runHealthCheck = useCallback(async () => {
    setIsChecking(true);
    const result = await healthMonitor.runFullCheck();
    setHealth(result);
    setIsChecking(false);

    // CRITICAL ERROR HANDLER
    if (result.globalStatus === 'critical') {
      handleCriticalSystemState(result);
    }
  }, []);

  // --- Critical Handler ---
  const handleCriticalSystemState = (status: SystemHealthState) => {
    // 1. Check Network
    if (status.services.network.status === 'down') {
      if (!isOfflineMode) {
        setIsOfflineMode(true);
        notify('Network Lost', { 
          body: 'Switching to Offline Mode. Queuing uploads locally.', 
          severity: 'warning',
          category: 'network',
          persistent: true 
        });
      }
    }

    // 2. Check Database
    if (status.services.supabase.status === 'down' && status.services.network.status === 'healthy') {
      notify('Database Error', { 
        body: 'Cannot connect to server. Admin attention required.', 
        severity: 'critical', 
        persistent: true 
      });
    }

    // 3. Check Battery
    if (status.batteryLevel && status.batteryLevel < 15 && !status.isCharging) {
       notify('Low Battery', { body: 'Plug in device immediately!', severity: 'warning' });
    }
  };

  // --- Scheduler ---
  useEffect(() => {
    // Check on mount
    runHealthCheck();

    // Check every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);

    // Check on reconnection
    const handleOnline = () => {
      notify('Back Online', { body: 'Network restored. Resuming uploads.', severity: 'success' });
      setIsOfflineMode(false);
      runHealthCheck();
    };
    
    // Check visibility change (user comes back to tab)
    const handleVisibility = () => {
        if (!document.hidden) runHealthCheck();
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [runHealthCheck, notify]);

  return (
    <SystemContext.Provider value={{
      health, isChecking, runHealthCheck,
      notifications, dismissNotification, notify,
      prefs, updatePrefs: (p) => { notificationManager.updatePreferences(p); setPrefs({...prefs, ...p}); },
      isOfflineMode
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used within SystemProvider");
  return ctx;
};