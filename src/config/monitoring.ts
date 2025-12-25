// src/config/monitoring.ts

export const MONITORING_CONFIG = {
  // Environment Detection
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Feature Flags
  features: {
    enableSentry: process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true',
    enableSupabaseLogs: true,
    enableConsoleLogs: process.env.NODE_ENV !== 'production',
  },

  // Thresholds
  batchSize: 10, // Kumpulin 10 log baru kirim ke Supabase
  flushInterval: 5000, // Atau kirim setiap 5 detik
  
  // Rules: Kapan harus notify user?
  notifications: {
    minSeverityForToast: 'warning', // info tidak muncul toast, warning/error muncul
    soundEnabled: true,
  },

  // Rules: Kapan masuk Sentry?
  sentry: {
    minSeverity: 'error', // Warning tidak masuk Sentry, hanya Error/Critical
    sampleRate: 1.0, // 100% error dikirim (bisa dikurangi kalau traffic tinggi)
  }
} as const;