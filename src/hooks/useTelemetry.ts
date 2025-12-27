// src/hooks/useTelemetry.ts
import { useCallback } from 'react';
import { telemetry } from '@/src/services/TelemetryService';

export const useTelemetry = () => {
  const trackError = useCallback((error: any, context: string) => {
    telemetry.logError(error, context);
  }, []);

  const trackAction = useCallback((action: string, message: string) => {
    telemetry.logActivity(action, message);
  }, []);

  return { trackError, trackAction, telemetry };
};