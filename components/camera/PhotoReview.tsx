// components/camera/PhotoReview.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

export interface PhotoReviewProps {
  imageSrc: string;
  photoNumber: number;
  totalPhotos: number;
  onRetake: () => void;
  onNext: () => void;
}

export const PhotoReview:  React.FC<PhotoReviewProps> = ({
  imageSrc,
  photoNumber,
  totalPhotos,
  onRetake,
  onNext,
}) => {
  const isLastPhoto = photoNumber === totalPhotos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Photo {photoNumber} / {totalPhotos}
          </h2>
          <p className="text-gray-600">
            {isLastPhoto ? 'Last photo captured!' : 'Review your photo'}
          </p>
        </div>

        {/* Photo Preview */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8">
          <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={imageSrc}
              alt={`Photo ${photoNumber}`}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={onRetake}
            className="flex-1"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retake
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            className="flex-1"
          >
            {isLastPhoto ? (
              <>
                Finish & Process
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </>
            ) : (
              <>
                Next Photo
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </>
            )}
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8">
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPhotos }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index < photoNumber
                    ? 'w-12 bg-blue-600'
                    : 'w-8 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};