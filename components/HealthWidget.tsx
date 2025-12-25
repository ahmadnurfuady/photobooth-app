// src/components/HealthWidget.tsx
import React from 'react';
import { useSystem } from '@/src/context/SystemContext';

export const HealthWidget = () => {
  const { health, isChecking, runHealthCheck, isOfflineMode } = useSystem();

  if (!health) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': case 'critical': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-slate-800 text-white p-4 rounded-lg shadow-md w-full max-w-xs">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold flex items-center gap-2">
          System Health
          {isOfflineMode && <span className="text-xs bg-red-600 px-2 py-0.5 rounded">OFFLINE MODE</span>}
        </h3>
        <button onClick={runHealthCheck} className={`text-xs ${isChecking ? 'animate-spin' : ''}`}>↻</button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Supabase Status */}
        <div className="flex justify-between items-center">
          <span>Database</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{health.services.supabase.latency}ms</span>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(health.services.supabase.status)}`} />
          </div>
        </div>

        {/* Network Status */}
        <div className="flex justify-between items-center">
          <span>Network</span>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(health.services.network.status)}`} />
        </div>

        {/* Battery (Mobile) */}
        {health.batteryLevel !== undefined && (
           <div className="flex justify-between items-center">
             <span>Battery {health.isCharging ? '⚡' : ''}</span>
             <span className={`${health.batteryLevel < 20 ? 'text-red-400' : 'text-green-400'}`}>
               {health.batteryLevel.toFixed(0)}%
             </span>
           </div>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-slate-700 text-xs text-slate-400 text-center">
        Last checked: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};