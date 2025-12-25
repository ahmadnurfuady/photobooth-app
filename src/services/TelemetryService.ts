// src/services/TelemetryService.ts
import * as Sentry from "@sentry/react";
import { logger } from "@/lib/Logger"; // Logger lama kita jadikan transport layer
import { notificationManager } from "./NotificationManager";
import { MONITORING_CONFIG } from "@/src/config/monitoring";
import { Severity } from "@/types/system";

interface TelemetryEvent {
  category: string;
  action: string;
  message: string;
  severity: Severity;
  metadata?: Record<string, any>;
  userId?: string;
  notifyUser?: boolean; // Paksa muncul notifikasi?
}

class TelemetryService {
  private static instance: TelemetryService;
  
  // Deduplication cache sederhana
  private recentErrors: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  public track(event: TelemetryEvent) {
    const { category, action, message, severity, metadata, notifyUser } = event;
    const fullMessage = `[${category}:${action}] ${message}`;

    // 1. Console Log (Dev Only)
    if (MONITORING_CONFIG.features.enableConsoleLogs) {
      const style = severity === 'error' ? 'color: red' : 'color: blue';
      console.log(`%c${fullMessage}`, style, metadata);
    }

    // 2. Supabase Logging (Always, unless disabled)
    if (MONITORING_CONFIG.features.enableSupabaseLogs) {
      // Kita pakai method logger yang sudah ada (batching sudah dihandle di sana)
      if (severity === 'error' || severity === 'critical') {
        logger.error(action, new Error(message), { category, ...metadata });
      } else if (severity === 'warning') {
        logger.warn(action, message, { category, ...metadata });
      } else {
        logger.info(action, message, { category, ...metadata });
      }
    }

    // 3. Sentry Tracking (Smart Filtering)
    // Hanya kirim ke Sentry jika error/critical DAN fitur nyala
    if (
      MONITORING_CONFIG.features.enableSentry && 
      ['error', 'critical', 'fatal'].includes(severity)
    ) {
      // Deduplication: Jangan kirim error yang sama persis dalam 5 detik
      const errorKey = `${action}-${message}`;
      if (!this.recentErrors.has(errorKey)) {
        Sentry.withScope((scope) => {
          scope.setTag("category", category);
          scope.setTag("action", action);
          scope.setLevel(severity as Sentry.SeverityLevel);
          if (metadata) scope.setContext("metadata", metadata);
          
          Sentry.captureMessage(fullMessage);
        });
        
        this.recentErrors.add(errorKey);
        setTimeout(() => this.recentErrors.delete(errorKey), 5000);
      }
    }

    // 4. User Notification (Browser Notification / Toast)
    const shouldNotify = notifyUser || 
      (['warning', 'error', 'critical'].includes(severity));

    if (shouldNotify) {
      notificationManager.notify(action, {
        body: message,
        severity: severity,
        category: category as any,
      });
    }
  }

  // --- Helpers ---
  
  public logError(error: any, context: string, meta = {}) {
    this.track({
      category: 'SYSTEM',
      action: context,
      message: error instanceof Error ? error.message : String(error),
      severity: 'error',
      metadata: { stack: error.stack, ...meta }
    });
  }

  public logActivity(action: string, message: string, meta = {}) {
    this.track({
      category: 'USER_ACTION',
      action,
      message,
      severity: 'info',
      metadata: meta
    });
  }
}

export const telemetry = TelemetryService.getInstance();