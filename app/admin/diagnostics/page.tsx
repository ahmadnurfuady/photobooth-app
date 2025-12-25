// app/admin/diagnostics/page.tsx
'use client';

import React from 'react';
import { DiagnosticTool } from '@/components/DiagnosticTool'; // Pastikan path import benar
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; // Atau pakai SVG manual

export default function DiagnosticsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-2">
          ← Kembali ke Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">System Diagnostics</h1>
        <p className="text-gray-600">
          Jalankan tes ini sebelum event dimulai untuk memastikan Hardware, Internet, dan Database siap tempur.
        </p>
      </div>
      
      <DiagnosticTool />
    </div>
  );
}