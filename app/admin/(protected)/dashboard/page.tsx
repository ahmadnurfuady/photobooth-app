// app/admin/(protected)/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button'; // Pastikan Button support className custom
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AddFrameModal } from '@/components/admin/AddFrameModal';
import { Frame } from '@/types';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

// ✅ IMPORT KOMPONEN BARU
import { getDashboardStats } from '@/lib/actions/dashboard';
import DashboardStats from '@/components/admin/DashboardStats';

// Interface Data Stats
interface DashboardData {
  totalEvents: number;
  totalSessions: number;
  totalFrames: number;
  activeFrames: number;
  inactiveFrames: number;
  storageUsed: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  
  // State Data
  const [stats, setStats] = useState<DashboardData>({
    totalEvents: 0,
    totalSessions: 0,
    totalFrames: 0,
    activeFrames: 0,
    inactiveFrames: 0,
    storageUsed: 0
  });

  const [recentFrames, setRecentFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Stats dari Server Action (Logic Baru)
      const statsData = await getDashboardStats();
      setStats(statsData);

      // 2. Ambil Recent Frames dari API (Logic Lama)
      const framesResponse = await fetch('/api/frames');
      if (framesResponse.ok) {
        const framesData = await framesResponse.json();
        const frames: Frame[] = framesData.data || [];
        setRecentFrames(frames.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {/* Loading Spinner pakai text-primary biar ikut tema */}
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.email?.split('@')[0]}! 👋
        </p>
      </div>

      {/* ✅ STATS GRID: Pakai Komponen yang sudah kita bikin dinamis */}
      <DashboardStats stats={stats} />

      {/* ✅ QUICK ACTIONS: Warna diubah jadi 'primary' (Dinamis) */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </CardHeader>
        <CardBody className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* BUTTON 1: Add Frame */}
            <button
              onClick={() => setIsModalOpen(true)}
              // HAPUS: border-blue-300, GANTI: border-gray-300 hover:border-primary
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-4">
                {/* HAPUS: bg-blue-100, GANTI: bg-primary/10 */}
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  {/* HAPUS: text-blue-600, GANTI: text-primary */}
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">Add New Frame</h3>
                  <p className="text-sm text-gray-600">Upload a custom frame template</p>
                </div>
              </div>
            </button>

            {/* BUTTON 2: Manage Frames */}
            <Link href="/admin/frames">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">Manage Frames</h3>
                    <p className="text-sm text-gray-600">View and edit existing frames</p>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </CardBody>
      </Card>

      {/* Add Frame Modal */}
      <AddFrameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      {/* Recent Frames */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Frames</h2>
            <Link href="/admin/frames">
              <Button variant="ghost" size="sm" className="hover:text-primary">
                View All →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {recentFrames.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-gray-600">No frames yet</p>
              
              <Link href="/admin/frames">
                {/* GANTI BUTTON: Pakai class manual biar pasti warnanya bener */}
                <Button className="mt-4 bg-primary text-white hover:bg-primary/90">
                  Upload Your First Frame
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={frame.thumbnail_url || frame.cloudinary_url}
                      alt={frame.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{frame.name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(frame.created_at)}</p>
                  </div>
                  <div>
                    {/* STATUS BADGE: Tetap Hijau/Abu karena ini Status Semantic, bukan Branding */}
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        frame.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {frame.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}