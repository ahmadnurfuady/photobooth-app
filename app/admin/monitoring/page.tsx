// app/admin/monitoring/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link'; 
import { supabase } from '@/lib/supabase'; 

// ✅ IMPORT SYSTEM CONTEXT & WIDGET
import { useSystem } from '@/src/context/SystemContext';
import { HealthWidget } from '@/components/HealthWidget';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Clock, Activity, Download, WifiOff, Server, ArrowLeft, RefreshCw, Settings, Eye
} from 'lucide-react';
import { format } from 'date-fns';

// --- TYPES ---
type Log = {
  id: string;
  created_at: string;
  event_type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
};

type Metric = {
  created_at: string;
  operation_name: string;
  duration_ms: number;
};

// --- COMPONENT ---
export default function MonitoringDashboard() {
  // ✅ NEW: Ambil notifikasi dari SystemContext
  const { notifications } = useSystem();
  
  // ✅ NEW: State untuk Tab Navigasi
  const [activeTab, setActiveTab] = useState<'live' | 'config'>('live');

  // Existing State
  const [logs, setLogs] = useState<Log[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPhotos: 0,
    errorCount: 0,
    avgUploadTime: 0,
    status: 'Online'
  });
  const [isLive, setIsLive] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 1. DATA FETCHING (LOGIC LAMA TETAP DIPERTAHANKAN) ---
  const fetchInitialData = async () => {
    setLoading(true);
    console.log("🚀 [MONITORING] Fetching data...");

    // Ambil logs
    const { data: logData, error: logError } = await supabase
      .from('app_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logError) console.error("❌ Log Error:", logError);
    else console.log("📦 Log Data:", logData?.length, "items found");

    // Ambil metrics
    const { data: metricData, error: metricError } = await supabase
      .from('performance_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (metricError) console.error("❌ Metric Error:", metricError);

    if (logData) setLogs(logData);
    if (metricData) setMetrics(metricData.reverse()); 
    
    calculateStats(logData || [], metricData || []);
    setLoading(false);
  };

  const calculateStats = (currentLogs: any[], currentMetrics: any[]) => {
    const errors = currentLogs.filter(l => l.severity === 'error' || l.severity === 'critical').length;
    
    const uploads = currentMetrics.filter(m => m.operation_name.includes('UPLOAD'));
    const avgTime = uploads.length 
      ? Math.round(uploads.reduce((acc: number, curr: any) => acc + curr.duration_ms, 0) / uploads.length)
      : 0;

    setStats(prev => ({
      ...prev,
      errorCount: errors,
      avgUploadTime: avgTime,
      totalPhotos: currentMetrics.filter(m => m.operation_name === 'CAPTURE_PHOTO' && m.success).length 
    }));
  };

  // --- 2. REALTIME SUBSCRIPTION (LOGIC LAMA TETAP DIPERTAHANKAN) ---
  useEffect(() => {
    fetchInitialData();

    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

    console.log("🔌 [MONITORING] Subscribing to Realtime...");
    const channel = supabase
      .channel('dashboard-monitoring-v2') 
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_logs' },
        (payload) => {
          console.log("⚡ [REALTIME] New Log:", payload.new);
          if (!isLive) return;
          const newLog = payload.new as Log;
          
          setLogs(prev => [newLog, ...prev].slice(0, 100)); 
          
          if (newLog.severity === 'critical' || newLog.severity === 'error') {
            triggerAlert(newLog);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'performance_metrics' },
        (payload) => {
          if (!isLive) return;
          const newMetric = payload.new as Metric;
          setMetrics(prev => [...prev.slice(1), newMetric]); 
        }
      )
      .subscribe((status) => {
        console.log("📡 [REALTIME STATUS]:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive]);

  // --- 3. ALERT LOGIC ---
  const triggerAlert = (log: Log) => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio blocked', e));
    }
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Type', 'Severity', 'Message'];
    const rows = logs.map(l => [l.created_at, l.event_type, l.severity, l.message].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logs_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe chart data mapping
  const chartData = metrics.map(m => ({
    time: m.created_at ? format(new Date(m.created_at), 'HH:mm:ss') : '',
    duration: m.duration_ms,
    op: m.operation_name
  }));

  return (
    <div 
      className="p-6 min-h-screen font-sans"
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        color: 'var(--foreground)' 
      }}
    >
      {/* HEADER & NAV */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center gap-2 mb-2 text-sm font-medium transition-colors opacity-60 hover:opacity-100"
          >
             <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Mission Control</h1>
             {/* Status Live Indicator */}
             <span className={`flex h-3 w-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          </div>
          <p className="text-sm opacity-70 flex items-center gap-2">
            Unified Telemetry System
            {loading && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded">Fetching...</span>}
          </p>
        </div>

        {/* ✅ WIDGET KESEHATAN SISTEM (HEALTH) DI HEADER */}
        <div className="scale-90 origin-right">
             <HealthWidget />
        </div>
      </div>

      {/* ✅ TAB NAVIGATION BARU */}
      <div className="flex gap-6 border-b mb-6" style={{ borderColor: 'rgba(128,128,128, 0.2)' }}>
        <button 
            onClick={() => setActiveTab('live')}
            className={`pb-3 text-sm font-medium transition-all ${
                activeTab === 'live' 
                ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)]' 
                : 'opacity-60 hover:opacity-100'
            }`}
        >
            <div className="flex items-center gap-2"><Activity size={16}/> Live Telemetry</div>
        </button>
        <button 
            onClick={() => setActiveTab('config')}
            className={`pb-3 text-sm font-medium transition-all ${
                activeTab === 'config' 
                ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)]' 
                : 'opacity-60 hover:opacity-100'
            }`}
        >
            <div className="flex items-center gap-2"><Settings size={16}/> Configuration</div>
        </button>
      </div>

      {/* --- CONTENT AREA: LIVE TELEMETRY --- */}
      {activeTab === 'live' && (
      <>
        {/* ACTION BAR */}
        <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold opacity-90">Real-time Overview</h2>
            <div className="flex gap-3">
                <button onClick={() => fetchInitialData()} className="p-2 border rounded-lg hover:bg-gray-100 transition" title="Refresh Data">
                    <RefreshCw size={16} />
                </button>
                <button 
                    onClick={() => setIsLive(!isLive)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border"
                    style={{ 
                        backgroundColor: isLive ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(128,128,128, 0.1)',
                        borderColor: isLive ? 'var(--primary-color)' : 'gray',
                        color: isLive ? 'var(--primary-color)' : 'gray'
                    }}
                >
                    {isLive ? 'Live On' : 'Paused'}
                </button>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:opacity-80 transition">
                    <Download size={16} /> Export
                </button>
            </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard title="Avg Upload Time" value={`${stats.avgUploadTime} ms`} icon={<Clock />} useThemeColor={true} />
            <StatsCard title="Errors (24h)" value={stats.errorCount} icon={<AlertTriangle className={stats.errorCount > 0 ? "text-red-500" : "text-gray-400"} />} customBorderColor={stats.errorCount > 0 ? "red" : undefined} />
            <StatsCard title="Service Status" value={stats.status} icon={<Server className="text-green-500"/>} customBorderColor="green"/>
            <StatsCard title="Photos Captured" value={stats.totalPhotos} icon={<CheckCircle />} useThemeColor={true}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: CHARTS & LOGS */}
            <div className="lg:col-span-2 space-y-8">
                {/* PERFORMANCE CHART */}
                <div className="p-6 rounded-xl shadow-sm border" style={{ borderColor: 'rgba(128,128,128, 0.2)', backgroundColor: 'rgba(255,255,255, 0.05)' }}>
                    <h3 className="text-lg font-semibold mb-4">Performance Latency (ms)</h3>
                    <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128, 0.2)" />
                                <XAxis dataKey="time" tick={{fontSize: 12, fill: 'var(--foreground)'}} />
                                <YAxis tick={{fontSize: 12, fill: 'var(--foreground)'}} />
                                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid rgba(128,128,128,0.2)', backgroundColor: 'var(--bg-color)', color: 'var(--foreground)'}} />
                                <Line type="monotone" dataKey="duration" stroke="var(--primary-color)" strokeWidth={2} dot={false} activeDot={{ r: 8, fill: 'var(--primary-color)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ERROR STREAM TABLE */}
                <div className="rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(128,128,128, 0.2)' }}>
                    <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'rgba(128,128,128, 0.2)' }}>
                        <h3 className="text-lg font-semibold">Live Event Stream</h3>
                        <span className="text-xs opacity-60">{logs.length > 0 ? `Showing last ${logs.length} events` : 'Waiting for events...'}</span>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 italic">No logs found.</div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead style={{ backgroundColor: 'rgba(128,128,128, 0.1)' }}>
                                    <tr>
                                        <th className="px-6 py-3 font-medium opacity-70">Time</th>
                                        <th className="px-6 py-3 font-medium opacity-70">Severity</th>
                                        <th className="px-6 py-3 font-medium opacity-70">Event</th>
                                        <th className="px-6 py-3 font-medium opacity-70">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ divideColor: 'rgba(128,128,128, 0.1)' }}>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/5 transition" style={{ backgroundColor: log.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                                            <td className="px-6 py-3 whitespace-nowrap opacity-70">{format(new Date(log.created_at), 'HH:mm:ss')}</td>
                                            <td className="px-6 py-3"><Badge severity={log.severity} /></td>
                                            <td className="px-6 py-3 font-medium">{log.event_type}</td>
                                            <td className="px-6 py-3 opacity-80 truncate max-w-xs" title={log.message}>{log.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ RIGHT COLUMN: SIDEBAR WIDGETS (SENTRY & NOTIFICATIONS) */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* 1. SENTRY LINK WIDGET */}
                <div className="p-5 rounded-xl border border-l-4 border-l-purple-500 bg-purple-50/10 shadow-sm" style={{ borderColor: 'rgba(128,128,128, 0.2)', borderLeftColor: '#a855f7' }}>
                    <h3 className="font-bold mb-2 flex items-center gap-2 text-purple-700">
                        <Activity size={18}/> Sentry Issues
                    </h3>
                    <p className="text-xs opacity-70 mb-4">
                        View detailed stack traces and aggregated error trends directly on Sentry.
                    </p>
                    {/* Ganti URL di bawah dengan URL Project Sentry Anda */}
                    <a 
                        href="https://sentry.io/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition"
                    >
                        Open Sentry Dashboard <Eye size={14}/>
                    </a>
                </div>

                {/* 2. RECENT USER ALERTS (NOTIFICATION LOG) */}
                <div className="p-6 rounded-xl shadow-sm border" style={{ borderColor: 'rgba(128,128,128, 0.2)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Recent User Alerts</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">{notifications.length}</span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="text-sm opacity-50 italic">No active alerts.</p>
                        ) : (
                            notifications.map((notif: any) => (
                                <div key={notif.id} className="p-3 bg-gray-50 rounded border text-xs flex gap-2 items-start">
                                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.severity === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <p className="font-bold text-gray-700">{notif.title}</p>
                                        <p className="text-gray-500">{notif.body}</p>
                                        <span className="text-[10px] opacity-40">{format(new Date(notif.timestamp), 'HH:mm:ss')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 3. CRITICAL DB LOGS (EXISTING) */}
                <div className="p-6 rounded-xl shadow-sm border" style={{ borderColor: 'rgba(128,128,128, 0.2)' }}>
                    <h3 className="text-lg font-semibold mb-4 text-red-500">Critical DB Errors</h3>
                    <div className="space-y-4">
                        {logs.filter(l => l.severity === 'critical' || l.severity === 'error').slice(0, 5).map(log => (
                            <div key={log.id} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-sm">
                                <div className="flex justify-between font-semibold mb-1 text-red-600">
                                    <span>{log.event_type}</span>
                                    <span className="text-xs opacity-75">{format(new Date(log.created_at), 'HH:mm')}</span>
                                </div>
                                <p className="text-red-500 opacity-90">{log.message}</p>
                            </div>
                        ))}
                        {logs.filter(l => l.severity === 'critical' || l.severity === 'error').length === 0 && (
                            <p className="opacity-50 text-sm italic">No critical errors recently.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </>
      )}

      {/* --- CONTENT AREA: CONFIGURATION --- */}
      {activeTab === 'config' && (
        <div className="p-6 bg-white rounded-xl shadow-sm border max-w-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Settings size={20} /> Runtime Configuration
            </h3>
            <p className="text-sm text-gray-500 mb-6">
                Current active settings for telemetry and monitoring. 
                (Read-only in this version)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigItem label="Environment" value={process.env.NODE_ENV} />
                <ConfigItem label="Sentry Enabled" value="True" isGreen />
                <ConfigItem label="Supabase Log Level" value="INFO" />
                <ConfigItem label="Auto-Flush Interval" value="5000ms" />
                <ConfigItem label="Notification Sound" value="Enabled" isGreen />
                <ConfigItem label="Client-Side Batching" value="10 items" />
            </div>
        </div>
      )}
    </div>
  );
}

// --- HELPER COMPONENTS ---

const ConfigItem = ({ label, value, isGreen }: any) => (
    <div className="flex justify-between items-center p-3 border rounded bg-gray-50">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className={`font-mono text-sm font-bold ${isGreen ? 'text-green-600' : 'text-gray-800'}`}>
            {value}
        </span>
    </div>
);

const StatsCard = ({ title, value, icon, useThemeColor, customBorderColor, trend }: any) => {
    let borderColor = 'transparent';
    let iconColor = 'gray';
    let bgIconColor = 'rgba(128,128,128, 0.1)';

    if (useThemeColor) {
        borderColor = 'var(--primary-color)';
        iconColor = 'var(--primary-color)';
        bgIconColor = 'rgba(var(--primary-rgb), 0.1)'; 
    } else if (customBorderColor === 'red') {
        borderColor = '#ef4444';
        bgIconColor = '#fee2e2';
    } else if (customBorderColor === 'green') {
        borderColor = '#22c55e';
        bgIconColor = '#dcfce7';
    }

    return (
        <div 
            className="p-6 rounded-xl shadow-sm border border-l-4"
            style={{ 
                borderColor: 'rgba(128,128,128, 0.2)',
                borderLeftColor: borderColor,
                backgroundColor: 'rgba(255,255,255, 0.05)'
            }}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium opacity-60 mb-1">{title}</p>
                    <h4 className="text-2xl font-bold">{value}</h4>
                </div>
                <div 
                    className="p-2 rounded-lg"
                    style={{ 
                        color: iconColor,
                        backgroundColor: useThemeColor ? 'rgba(128,128,128, 0.1)' : bgIconColor 
                    }}
                >
                    <span style={{ color: useThemeColor ? 'var(--primary-color)' : undefined }}>
                        {icon}
                    </span>
                </div>
            </div>
            {trend && <p className="text-xs text-red-500 mt-2 font-medium">{trend}</p>}
        </div>
    );
};

const Badge = ({ severity }: { severity: string }) => {
    const styles = {
        info: 'bg-blue-100 text-blue-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
        critical: 'bg-red-600 text-white animate-pulse'
    };
    
    let styleObj = {};
    if (severity === 'info') {
        styleObj = { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
    } else if (severity === 'warning') {
        styleObj = { backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04' };
    }

    const className = styles[severity as keyof typeof styles] || styles.info;

    return (
        <span 
            className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${severity === 'error' || severity === 'critical' ? className : ''}`}
            style={severity === 'info' || severity === 'warning' ? styleObj : {}}
        >
            {severity}
        </span>
    );
};