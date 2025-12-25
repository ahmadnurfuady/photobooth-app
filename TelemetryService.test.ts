import { telemetry } from '@/services/TelemetryService';
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/Logger";

jest.mock("@sentry/nextjs");
jest.mock("@/lib/Logger");

describe('TelemetryService', () => {
  it('should route Critical errors to Sentry AND Supabase', () => {
    telemetry.track({
      category: 'TEST',
      action: 'TestCritical',
      message: 'Boom',
      severity: 'critical'
    });

    expect(Sentry.captureMessage).toHaveBeenCalled(); // Masuk Sentry
    expect(logger.error).toHaveBeenCalled(); // Masuk Supabase
  });

  it('should route Info logs ONLY to Supabase', () => {
    telemetry.track({
      category: 'TEST',
      action: 'TestInfo',
      message: 'Just info',
      severity: 'info'
    });

    expect(Sentry.captureMessage).not.toHaveBeenCalled(); // Tidak masuk Sentry
    expect(logger.info).toHaveBeenCalled(); // Masuk Supabase
  });
});