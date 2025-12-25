// lib/Logger.ts
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client khusus Log (gunakan env yang sesuai)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

interface LogEntry {
  event_type: string;
  message: string;
  severity: LogSeverity;
  metadata: any;
  session_id?: string;
  device_id?: string;
  created_at: string; // ISO String
}

interface MetricEntry {
  operation_name: string;
  duration_ms: number;
  success: boolean;
  metadata: any;
  created_at: string;
}

class LogManager {
  private logQueue: LogEntry[] = [];
  private metricQueue: MetricEntry[] = [];
  private isProcessing = false;
  private FLUSH_INTERVAL = 5000; // Kirim setiap 5 detik
  private BATCH_SIZE = 10;
  private sessionId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // ✅ PERBAIKAN: Validasi UUID untuk Session ID
      const storedSession = sessionStorage.getItem('session_id');
      
      // Jika ada session dan panjangnya 36 (panjang standar UUID), gunakan.
      // Jika tidak, biarkan null. JANGAN gunakan string sembarang seperti 'unknown-session'
      // karena akan menyebabkan Error 400 di database Postgres (tipe kolom UUID).
      if (storedSession && storedSession.length === 36) {
        this.sessionId = storedSession;
      } else {
        this.sessionId = null;
      }

      // Start auto-flush loop
      setInterval(() => this.flush(), this.FLUSH_INTERVAL);
      
      // Listen to online event to sync offline data
      window.addEventListener('online', () => this.flushOfflineData());
    }
  }

  // --- PUBLIC API ---

  public info(event: string, message: string, meta = {}) {
    this.enqueueLog('info', event, message, meta);
  }

  public warn(event: string, message: string, meta = {}) {
    this.enqueueLog('warning', event, message, meta);
  }

  public error(event: string, error: any, context = {}) {
    console.error(`[${event}]`, error); // Tetap print di console browser
    this.enqueueLog('error', event, error instanceof Error ? error.message : String(error), {
      stack: error instanceof Error ? error.stack : null,
      ...context
    });
  }

  public critical(event: string, error: any, context = {}) {
    this.enqueueLog('critical', event, String(error), context);
    // Trigger browser sound/alert here if needed immediately
  }

  public trackMetric(operation: string, durationMs: number, success: boolean, meta = {}) {
    this.metricQueue.push({
      operation_name: operation,
      duration_ms: durationMs,
      success,
      metadata: meta,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Wrapper function untuk mengukur durasi operasi async secara otomatis
   */
  public async monitorOperation<T>(
    operationName: string, 
    fn: () => Promise<T>,
    meta = {}
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.trackMetric(operationName, duration, true, meta);
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.trackMetric(operationName, duration, false, { error: String(error), ...meta });
      this.error(`${operationName}_FAILED`, error, meta);
      throw error;
    }
  }

  // --- INTERNAL LOGIC ---

  private enqueueLog(severity: LogSeverity, event: string, message: string, meta: any) {
    this.logQueue.push({
      event_type: event,
      message,
      severity,
      metadata: {
        url: typeof window !== 'undefined' ? window.location.pathname : '',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
        ...meta
      },
      // Gunakan undefined jika null agar JSON clean, atau biarkan null (Supabase handle null)
      session_id: this.sessionId || undefined, 
      created_at: new Date().toISOString()
    });

    // Jika critical, force flush segera
    if (severity === 'critical' || this.logQueue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush() {
    if (this.isProcessing || (!this.logQueue.length && !this.metricQueue.length)) return;
    
    // Cek koneksi internet
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.saveToLocalStorage();
      return;
    }

    this.isProcessing = true;

    // Ambil snapshot data
    const logsToSend = [...this.logQueue];
    const metricsToSend = [...this.metricQueue];

    // Clear queue memori
    this.logQueue = [];
    this.metricQueue = [];

    try {
      // Parallel upload
      await Promise.all([
        logsToSend.length > 0 ? supabase.from('app_logs').insert(logsToSend) : Promise.resolve(),
        metricsToSend.length > 0 ? supabase.from('performance_metrics').insert(metricsToSend) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Failed to flush logs to Supabase, saving offline.', err);
      // Restore ke queue atau save ke storage jika gagal
      this.saveToLocalStorage([...logsToSend], [...metricsToSend]);
    } finally {
      this.isProcessing = false;
    }
  }

  private saveToLocalStorage(logs: LogEntry[] = [], metrics: MetricEntry[] = []) {
    // Gabungkan dengan queue saat ini
    const combinedLogs = [...logs, ...this.logQueue];
    const combinedMetrics = [...metrics, ...this.metricQueue];
    
    // Reset queue memori agar tidak duplikat saat loop berikutnya
    this.logQueue = [];
    this.metricQueue = [];

    try {
      localStorage.setItem('offline_logs', JSON.stringify(combinedLogs));
      localStorage.setItem('offline_metrics', JSON.stringify(combinedMetrics));
    } catch (e) {
      console.warn('LocalStorage full, dropping logs');
    }
  }

  private async flushOfflineData() {
    const logs = JSON.parse(localStorage.getItem('offline_logs') || '[]');
    const metrics = JSON.parse(localStorage.getItem('offline_metrics') || '[]');

    if (logs.length === 0 && metrics.length === 0) return;

    // Masukkan kembali ke antrian untuk diproses flush() berikutnya
    this.logQueue = [...logs, ...this.logQueue];
    this.metricQueue = [...metrics, ...this.metricQueue];
    
    localStorage.removeItem('offline_logs');
    localStorage.removeItem('offline_metrics');
    
    this.info('SYSTEM', 'Offline logs synced to server', { count: logs.length });
    this.flush();
  }
}

export const logger = new LogManager();