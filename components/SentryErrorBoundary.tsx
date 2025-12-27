// components/SentryErrorBoundary.tsx
'use client'; 

import React from 'react';
import * as Sentry from "@sentry/react";
import { telemetry } from '@/src/services/TelemetryService';

interface Props {
  children: React.ReactNode;
}

export const SentryErrorBoundary: React.FC<Props> = ({ children }) => {
  
  // ✅ FUNGSI PENTING: Menghubungkan crash React ke Telemetry Service
  // Ini memastikan error fatal juga tercatat di Supabase logs, bukan cuma di Sentry
  const handleError = (error: any, componentStack: string, eventId: string) => {
    telemetry.track({
      category: 'REACT_RENDER',
      action: 'FatalCrash',
      message: error.message,
      severity: 'critical', // Level tertinggi karena app crash
      metadata: {
        componentStack,
        sentryEventId: eventId,
        stack: error.stack
      },
      notifyUser: false // False karena kita sudah menampilkan UI Error besar, tidak perlu toast lagi
    });
  };

  return (
    <Sentry.ErrorBoundary
      // ✅ Pasang handler di sini
      onError={handleError}
      
      // Konfigurasi sebelum dikirim ke Sentry
      beforeCapture={(scope) => {
        scope.setTag("location", "ErrorBoundary");
        scope.setLevel("fatal"); 
      }}

      // UI Fallback saat crash
      fallback={({ error, resetError, eventId }) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              {/* Icon Warning Besar */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-extrabold text-gray-900">
                Terjadi Kesalahan Sistem
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Aplikasi mengalami crash fatal. Laporan otomatis telah dikirim ke tim teknis.
              </p>
              
              {eventId && (
                <div className="mt-2 inline-block bg-gray-100 rounded px-2 py-1">
                  <p className="text-xs text-gray-500 font-mono">
                    Ref ID: {eventId}
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-left overflow-auto max-h-40 shadow-inner">
              <code className="text-xs text-red-800 font-mono whitespace-pre-wrap">
                {error instanceof Error ? error.message : String(error)}
              </code>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  resetError(); // Reset Sentry state
                  window.location.reload(); // Hard reload page
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all"
              >
                Muat Ulang Halaman
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};