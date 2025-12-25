// src/services/NotificationManager.ts
import { Severity, NotificationPreferences } from '../types/system';

const DEFAULT_PREFS: NotificationPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  desktopNotifications: true,
  categories: { system: true, upload: true, camera: true, network: true },
  doNotDisturb: false,
};

class NotificationManager {
  private preferences: NotificationPreferences;
  private audioContext: AudioContext | null = null;

  constructor() {
    // ✅ PERBAIKAN: Cek apakah kita ada di browser (Client) sebelum akses localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notify_prefs');
      this.preferences = saved ? JSON.parse(saved) : DEFAULT_PREFS;
    } else {
      // Jika di server, gunakan default saja agar tidak error
      this.preferences = DEFAULT_PREFS;
    }
  }

  // --- Permission Flow ---
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // --- Core Notification Logic ---
  public notify(title: string, options: { 
    body?: string; 
    severity?: Severity; 
    category?: keyof NotificationPreferences['categories'];
    persistent?: boolean;
  }) {
    // Safety check for server-side
    if (typeof window === 'undefined') return null;

    const { body, severity = 'info', category = 'system', persistent = false } = options;

    // 1. Check Preferences (DND & Category)
    if (this.preferences.doNotDisturb && severity !== 'critical') return;
    if (!this.preferences.categories[category] && severity !== 'critical') return;

    // 2. Browser Notification
    if (this.preferences.desktopNotifications && document.hidden) {
      this.showBrowserNotification(title, body, severity, persistent);
    }

    // 3. Sensory Feedback
    if (this.preferences.soundEnabled) this.playSound(severity);
    if (this.preferences.vibrationEnabled) this.vibrate(severity);

    // 4. Return object for In-App Toast (consumed by React UI)
    return { id: Date.now(), title, body, severity, timestamp: new Date() };
  }

  private showBrowserNotification(title: string, body: string | undefined, severity: Severity, persistent: boolean) {
    if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

    const iconMap: Record<string, string> = {
      info: '/icons/info.png',
      success: '/icons/check.png',
      warning: '/icons/warn.png',
      error: '/icons/error.png',
      critical: '/icons/critical.png'
    };

    const n = new Notification(title, {
      body,
      icon: iconMap[severity] || iconMap['info'],
      requireInteraction: persistent || severity === 'critical', // Keeps it on screen
      tag: severity === 'critical' ? 'critical-alert' : undefined,
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };
  }

  // --- Sensory Alerts ---
  private playSound(severity: Severity) {
    if (typeof window === 'undefined') return;

    // Simple implementation using AudioContext or HTMLAudioElement
    const tone = severity === 'error' || severity === 'critical' ? 880 : 440;
    const duration = severity === 'critical' ? 1 : 0.2;
    
    this.beep(tone, duration); 
  }

  private beep(freq: number, duration: number) {
    // Safe check for AudioContext availability
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!this.audioContext) this.audioContext = new AudioContextClass();
    
    // Resume context if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  private vibrate(severity: Severity) {
    if (typeof window === 'undefined' || !navigator.vibrate) return;
    
    const patterns: Record<string, number[]> = {
      info: [100],
      success: [100, 50, 100],
      warning: [200, 100, 200],
      error: [500],
      critical: [500, 100, 500, 100, 500]
    };
    navigator.vibrate(patterns[severity] || [100]);
  }

  // --- Preference Management ---
  public updatePreferences(newPrefs: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('notify_prefs', JSON.stringify(this.preferences));
    }
  }

  public getPreferences() { return this.preferences; }
}

export const notificationManager = new NotificationManager();