// components/DiagnosticTool.tsx
import React, { useState } from 'react';
import { useSystem } from '@/src/context/SystemContext';
import { supabase } from '@/lib/supabase';

export const DiagnosticTool = () => {
  const { notify } = useSystem();
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    const report: any[] = [];

    const addResult = (name: string, passed: boolean, msg: string) => {
      report.push({ name, passed, msg });
      setResults([...report]);
    };

    try {
      // 1. Camera Test
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        addResult('Camera Access', true, 'Camera accessible');
        stream.getTracks().forEach(t => t.stop());
      } catch (e) {
        addResult('Camera Access', false, 'Camera blocked or missing');
      }

      // 2. Upload Speed / Latency (Mock)
      const start = performance.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const latency = Math.round(performance.now() - start);
      addResult('Network Latency', latency < 500, `${latency}ms`);

      // 3. Database Write Test
      const { error } = await supabase.from('app_logs').insert({ 
        event_type: 'DIAGNOSTIC', message: 'Pre-event check' 
      });
      addResult('DB Write', !error, error ? error.message : 'Write success');

      // 4. Storage
      if (navigator.storage && navigator.storage.estimate) {
        const { quota, usage } = await navigator.storage.estimate();
        const free = (quota || 0) - (usage || 0);
        const freeGB = (free / 1024 / 1024 / 1024).toFixed(2);
        addResult('Disk Space', parseFloat(freeGB) > 1, `${freeGB} GB Free`);
      }

    } catch (e) {
      notify('Diagnostic Error', { severity: 'error', body: 'Test crashed' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pre-Event System Check</h2>
      
      <button 
        onClick={runDiagnostics} 
        disabled={isRunning}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isRunning ? 'Running Tests...' : 'Start Diagnostics'}
      </button>

      <div className="mt-6 space-y-2">
        {results.map((res, idx) => (
          <div key={idx} className={`p-3 border-l-4 rounded flex justify-between ${res.passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <span className="font-medium">{res.name}</span>
            <span>{res.msg}</span>
          </div>
        ))}
      </div>
      
      {!isRunning && results.length > 0 && (
         <button className="mt-4 text-sm text-gray-600 underline">Export PDF Report</button>
      )}
    </div>
  );
};