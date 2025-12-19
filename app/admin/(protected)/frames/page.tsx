// app/admin/(protected)/frames/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { FrameList } from '@/components/admin/FrameList';
import { FrameUploadForm } from '@/components/admin/FrameUploadForm';
import { Frame } from '@/types';

export default function AdminFramesPage() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchFrames();
  }, [refreshKey]);

  const fetchFrames = async () => {
    try {
      const response = await fetch('/api/frames');
      if (response.ok) {
        const data = await response.json();
        setFrames(data. data || []);
      }
    } catch (error) {
      console.error('Error fetching frames:', error);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1); // Trigger refresh
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Frame Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage custom photo frames for your photobooth
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} size="lg">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Frame
        </Button>
      </div>

      {/* Frame List */}
      <FrameList initialFrames={frames} onRefresh={handleUploadSuccess} />

      {/* Upload Modal */}
      <FrameUploadForm
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}