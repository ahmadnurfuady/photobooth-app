// components/admin/FrameList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Frame } from '@/types';
import { FrameCard } from './FrameCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

interface FrameListProps {
  initialFrames?:  Frame[];
  onRefresh?:  () => void;
}

export const FrameList:  React.FC<FrameListProps> = ({ initialFrames = [], onRefresh }) => {
  const [frames, setFrames] = useState<Frame[]>(initialFrames);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialFrames.length > 0) {
      setFrames(initialFrames);
    } else {
      fetchFrames();
    }
  }, [initialFrames]);

  const fetchFrames = async () => {
    try {
      setLoading(true);
      // UBAH BARIS INI:
      // DARI: const response = await fetch('/api/frames');
      // MENJADI:
      const response = await fetch('/api/frames?active=true');  // ← TAMBAHKAN ?active=true
      
      if (!response.ok) throw new Error('Failed to fetch frames');
      
      const data = await response.json();
      setFrames(data.data || []);
    } catch (error) {
      console.error('Error fetching frames:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Frame>) => {
    try {
      console.log('Updating frame:', { id, updates });
      
      const response = await fetch(`/api/frames/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      console.log('PATCH response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Failed to update frame: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Server error:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Update response:', data);
      
      // Update local state
      setFrames((prev) =>
        prev.map((frame) => (frame.id === id ? { ...frame, ...data.data } : frame))
      );

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating frame:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/frames/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete frame');

      // Remove from local state
      setFrames((prev) => prev.filter((frame) => frame.id !== id));

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting frame:', error);
      throw error;
    }
  };

  // Filter frames
  const filteredFrames = frames.filter((frame) => {
    // Filter by status
    if (filter === 'active' && ! frame.is_active) return false;
    if (filter === 'inactive' && frame.is_active) return false;

    // Filter by search query
    if (searchQuery && !frame.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search frames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'inactive'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Frame Grid */}
      {filteredFrames.length === 0 ? (
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
          <h3 className="mt-2 text-lg font-medium text-gray-900">No frames found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Get started by uploading a new frame'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFrames.map((frame) => (
            <FrameCard
              key={frame.id}
              frame={frame}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredFrames.length} of {frames.length} frames
      </div>
    </div>
  );
};