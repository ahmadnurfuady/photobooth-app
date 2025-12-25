import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';
import './index.css';

// Inisialisasi Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // Simpan DSN di .env
  integrations: [
    new Sentry.BrowserTracing({
      // Ganti dengan domain production Anda nanti
      tracePropagationTargets: ["localhost", /^https:\/\/your-api\.com/],
    }),
    new Sentry.Replay({
      maskAllText: false, // Hati-hati dengan privasi
      blockAllMedia: false,
    }),
  ],
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // 100% data ditangkap (bisa dikurangi di production)
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // Rekam 10% sesi user biasa
  replaysOnErrorSampleRate: 1.0, // Rekam 100% jika terjadi error (PENTING)
  
  environment: import.meta.env.MODE, // 'development' atau 'production'
  
  // Filter data sensitif sebelum dikirim
  beforeSend(event) {
    // Contoh: Jangan kirim error jika itu hanya "User membatalkan upload"
    if (event.exception?.values?.[0].value?.includes("User cancelled")) {
      return null;
    }
    return event;
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);