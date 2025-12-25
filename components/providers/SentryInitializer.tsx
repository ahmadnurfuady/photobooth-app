// components/providers/SentryInitializer.tsx
'use client';

import { useEffect } from 'react';
import * as Sentry from "@sentry/react";

// ✅ HAPUS 'default', GANTI JADI NAMED EXPORT
export function SentryInitializer() {
  useEffect(() => {
    if (Sentry.getClient()) return;

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
        }),
      ],

      tracesSampleRate: 1.0, 
      replaysSessionSampleRate: 0.1, 
      replaysOnErrorSampleRate: 1.0, 
      environment: process.env.NODE_ENV,
      
      beforeSend(event) {
        if (event.exception?.values?.[0].value?.includes("User cancelled")) {
          return null;
        }
        return event;
      },
    });
    
    console.log("✅ Sentry Initialized on Client");
  }, []);

  return null;
}