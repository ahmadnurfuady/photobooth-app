// app/admin/frames/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Frame } from '@/types';
import { FrameCard } from '@/components/admin/FrameCard';
import { FrameUploadModal } from '@/components/admin/FrameUploadModal'; // NEW IMPORT
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function FrameManagementPage() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchFrames();
  }, []);

  const fetchFrames = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/frames');
      const data = await response.json();

      if (data.success) {
        setFrames(data. data);
      } else {
        toast.error('Failed to load frames');
      }
    } catch (error) {
      console.error('Error fetching frames:', error);
      toast.error('Failed to load frames');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (frameData: {
    name: string;
    imageFile: File;
    photoSlots: any[];
    frameConfig: any;
  }) => {
    const formData = new FormData();
    formData.append('name', frameData.name);

    // Convert image file to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(frameData.imageFile);
    });

    const base64Image = await base64Promise;
    formData.append('image', base64Image);
    formData.append('photoSlots', JSON.stringify(frameData.photoSlots));
    formData.append('frameConfig', JSON.stringify(frameData.frameConfig)); // NEW

    const response = await fetch('/api/frames', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (! data.success) {
      throw new Error(data.error || 'Failed to upload frame');
    }

    // Refresh frames list
    await fetchFrames();
  };

  const handleUpdate = async (id: string, updates:  Partial<Frame>) => {
    const response = await fetch('/api/frames', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update frame');
    }

    // Update local state
    setFrames((prev) =>
      prev.map((frame) => (frame.id === id ? { ...frame, ...updates } : frame))
    );
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/frames?id=${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete frame');
    }

    // Remove from local state
    setFrames((prev) => prev.filter((frame) => frame.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Frame Management</h1>
            <p className="text-gray-600 mt-1">Manage photo booth frames</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowUploadModal(true)}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload New Frame
          </Button>
        </div>

        {/* Frames Grid */}
        {frames.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No frames</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading a frame. </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {frames. map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal - NEW COMPONENT */}
      <FrameUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}