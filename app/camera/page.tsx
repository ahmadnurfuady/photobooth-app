// app/camera/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Frame } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function FrameSelectionPage() {
  const router = useRouter();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);

  useEffect(() => {
    fetchActiveFrames();
  }, []);

  const fetchActiveFrames = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/frames?active=true');
      if (response.ok) {
        const data = await response.json();
        setFrames(data. data || []);
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

  const handleStartSession = () => {
    if (! selectedFrame) {
      toast.error('Please select a frame first');
      return;
    }

    sessionStorage.setItem('selectedFrame', JSON.stringify(selectedFrame));
    router.push('/capture');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Frames Available
          </h2>
          <p className="text-gray-600 mb-6">
            Please contact admin to add photo frames
          </p>
          <Button onClick={() => router.push('/')} variant="secondary">
            Go Back Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            📸 Choose Your Frame
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Select a frame to start your photo session
          </p>
        </div>

        {/* Frame Grid - FINAL:  Show full portrait frames, proper size */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {frames.map((frame) => (
            <Card
              key={frame.id}
              hover
              className={`cursor-pointer transition-all w-[190px] ${
                selectedFrame?.id === frame.id
                  ? 'ring-4 ring-blue-500 shadow-2xl'
                  : 'hover:shadow-xl'
              }`}
              onClick={() => setSelectedFrame(frame)}
            >
              {/* Frame Image - Portrait, full visible, proper size */}
              <div className="relative w-full bg-gray-100 rounded-t-lg overflow-hidden p-2 flex items-center justify-center w-[160px] mx-auto" style={{ minHeight: '250px' }}>
                <img
                  src={ frame.cloudinary_url}
                  alt={frame.name}
                  className="max-w-full h-auto object-contain"
                  style={{ maxHeight: '260px', maxWidth: '200px' }}
                />
                
                {selectedFrame?.id === frame.id && (
                  <div className="absolute top-3 right-3 bg-blue-600 text-white px-2.5 py-1 rounded-full font-semibold text-xs flex items-center gap-1.5 shadow-lg">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Selected
                  </div>
                )}
              </div>
              <div className="p-3 w-[160px] mx-auto mt-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center truncate">
                  {frame. name}
                </h3>
              </div>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/')}
            className="order-2 sm:order-1"
          >
            ← Back to Home
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartSession}
            disabled={!selectedFrame}
            className="order-1 sm:order-2 px-8 sm:px-12"
          >
            Start Photo Session →
          </Button>
        </div>

        {/* Selected Info */}
        {selectedFrame && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm md:text-base">
              Selected:  <span className="font-semibold text-gray-900">{selectedFrame.name}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}