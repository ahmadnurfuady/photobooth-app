// components/admin/FrameUploadModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { PhotoSlot } from '@/types';
import toast from 'react-hot-toast';

interface FrameUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (frameData: {
    name: string;
    imageFile: File;
    photoSlots: PhotoSlot[];
  }) => Promise<void>;
}

type UploadStep = 'upload' | 'position';

export const FrameUploadModal:  React.FC<FrameUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [step, setStep] = useState<UploadStep>('upload');
  const [frameName, setFrameName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Default photo slots (will be adjusted by admin)
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([
    { id: 1, x: 7, y: 6, width: 35, height: 28 },   // Top slot
    { id: 2, x: 7, y: 36, width: 35, height:  28 },  // Middle slot
    { id: 3, x: 7, y: 66, width: 35, height: 28 },  // Bottom slot
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [resizing, setResizing] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (! file) return;

    if (! file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleNext = () => {
    if (!frameName.trim()) {
      toast.error('Please enter frame name');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select frame image');
      return;
    }

    setStep('position');
  };

  const handleBack = () => {
    setStep('upload');
  };

  const handleSaveFrame = async () => {
    if (!selectedFile || !frameName.trim()) return;

    setLoading(true);
    try {
      await onUpload({
        name:  frameName,
        imageFile: selectedFile,
        photoSlots,
      });

      toast.success('Frame uploaded successfully!');
      handleClose();
    } catch (error) {
      console.error('Error uploading frame:', error);
      toast.error(error instanceof Error ? error.message :  'Failed to upload frame');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFrameName('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoSlots([
      { id: 1, x: 7, y: 6, width: 35, height:  28 },
      { id: 2, x: 7, y: 36, width: 35, height:  28 },
      { id: 3, x: 7, y: 66, width:  35, height: 28 },
    ]);
    onClose();
  };

  // Drag & Resize Handlers
  const handleMouseDown = (slotId: number, isResize: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isResize) {
      setResizing(slotId);
    } else {
      setDragging(slotId);
    }
    
    setDragStart({ x:  e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (! containerRef.current) return;

    const container = containerRef.current. getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart. x) / container.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / container.height) * 100;

    if (dragging !== null) {
      setPhotoSlots(prev =>
        prev.map(slot =>
          slot.id === dragging
            ? {
                ...slot,
                x: Math.max(0, Math.min(100 - slot.width, slot.x + deltaX)),
                y: Math.max(0, Math.min(100 - slot.height, slot.y + deltaY)),
              }
            :  slot
        )
      );
      setDragStart({ x: e.clientX, y: e. clientY });
    }

    if (resizing !== null) {
      setPhotoSlots(prev =>
        prev.map(slot =>
          slot.id === resizing
            ? {
                ...slot,
                width: Math.max(10, Math.min(100 - slot.x, slot.width + deltaX)),
                height: Math.max(10, Math.min(100 - slot.y, slot.height + deltaY)),
              }
            : slot
        )
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'upload' ? 'Upload New Frame' : 'Position Photo Slots'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' ? (
            // STEP 1:  Upload Frame
            <div className="space-y-6">
              {/* Frame Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frame Name
                </label>
                <input
                  type="text"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter frame name"
                />
              </div>

              {/* Frame Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frame Image
                </label>
                <div
                  onClick={() => fileInputRef.current?. click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={previewUrl}
                        alt="Frame preview"
                        className="max-h-64 object-contain mb-4"
                      />
                      <p className="text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <div>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h. 02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            // STEP 2: Position Photo Slots
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Drag the boxes to position them.  Drag the bottom-right corner to resize.  Adjust to match the photo areas in your frame.
                </p>
              </div>

              {/* Frame with Draggable Slots */}
              <div
                ref={containerRef}
                className="relative bg-gray-100 rounded-lg overflow-hidden mx-auto"
                style={{ maxWidth: '600px', aspectRatio: '2/3' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Frame Image */}
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Frame"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                )}

                {/* Draggable Photo Slots */}
                {photoSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="absolute border-4 border-green-500 bg-green-500/20 cursor-move"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      width: `${slot.width}%`,
                      height: `${slot.height}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(slot.id, false, e)}
                  >
                    {/* Slot Label */}
                    <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded font-semibold">
                      Photo {slot.id}
                    </div>

                    {/* Resize Handle */}
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 cursor-se-resize"
                      onMouseDown={(e) => handleMouseDown(slot. id, true, e)}
                    />
                  </div>
                ))}
              </div>

              {/* Slot Info */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                {photoSlots. map((slot) => (
                  <div key={slot.id} className="bg-gray-100 p-3 rounded-lg">
                    <p className="font-semibold mb-1">Photo {slot.id}</p>
                    <p>X: {slot.x. toFixed(1)}%</p>
                    <p>Y: {slot.y.toFixed(1)}%</p>
                    <p>W: {slot.width.toFixed(1)}%</p>
                    <p>H: {slot.height.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          {step === 'upload' ? (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!frameName.trim() || !selectedFile}
              >
                Next:  Position Slots →
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleBack}>
                ← Back
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveFrame}
                loading={loading}
                disabled={loading}
              >
                Save Frame
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};