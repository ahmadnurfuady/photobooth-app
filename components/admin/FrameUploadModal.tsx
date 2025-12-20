// components/admin/FrameUploadModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { PhotoSlot, FrameConfig } from '@/types';
import { FRAME_PRESETS, generateDefaultSlots, getPreset } from '@/lib/framePresets';
import toast from 'react-hot-toast';

interface FrameUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (frameData: {
    name: string;
    imageFile: File;
    photoSlots: PhotoSlot[];
    frameConfig: FrameConfig;
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
  
  // Preset selection (default to 3 photos)
  const [selectedPhotoCount, setSelectedPhotoCount] = useState<1 | 2 | 3 | 4>(3);
  const selectedPreset = FRAME_PRESETS[selectedPhotoCount];
  
  // Photo slots (will be auto-generated based on preset)
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(
    generateDefaultSlots(FRAME_PRESETS[3])
  );

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

  // Handle photo count change - regenerate slots with new preset
  const handlePhotoCountChange = (count: 1 | 2 | 3 | 4) => {
    setSelectedPhotoCount(count);
    const preset = FRAME_PRESETS[count];
    const newSlots = generateDefaultSlots(preset);
    setPhotoSlots(newSlots);
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
      const frameConfig: FrameConfig = {
        photo_count: selectedPhotoCount,
        layout: selectedPreset.layout,
        aspect_ratio: selectedPreset.aspectRatio,
        default_slot_size: selectedPreset.defaultSlotSize,
      };

      await onUpload({
        name:  frameName,
        imageFile: selectedFile,
        photoSlots,
        frameConfig,
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
    setSelectedPhotoCount(3);
    setPhotoSlots(generateDefaultSlots(FRAME_PRESETS[3]));
    onClose();
  };

  // Drag & Resize Handlers with ASPECT RATIO LOCKING
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
      // Dragging (position change only)
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
      // Resizing with LOCKED ASPECT RATIO
      setPhotoSlots(prev =>
        prev.map(slot => {
          if (slot.id !== resizing) return slot;

          // Calculate new width based on horizontal drag
          const newWidth = Math.max(10, Math.min(100 - slot.x, slot.width + deltaX));
          
          // Calculate new height based on LOCKED aspect ratio
          const lockedAspectRatio = selectedPreset.aspectRatio;
          const newHeight = newWidth / lockedAspectRatio;
          
          // Ensure height doesn't exceed bounds
          const maxHeight = 100 - slot.y;
          const finalHeight = Math.min(newHeight, maxHeight);
          const finalWidth = finalHeight * lockedAspectRatio;

          return {
            ...slot,
            width: finalWidth,
            height: finalHeight,
          };
        })
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

              {/* Photo Count Selection - NEW! */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Layout
                </label>
                <select
                  value={selectedPhotoCount}
                  onChange={(e) => handlePhotoCountChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.values(FRAME_PRESETS).map((preset) => (
                    <option key={preset.photoCount} value={preset.photoCount}>
                      {preset.name} - {preset.description} (Aspect Ratio: {preset.aspectRatio.toFixed(2)})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: <strong>{selectedPreset.name}</strong> - 
                  Aspect ratio <strong>{selectedPreset.aspectRatio.toFixed(3)}</strong> 
                  ({selectedPreset.aspectRatio > 1 ? 'Landscape' : 'Portrait'})
                </p>
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
              {/* Instructions with Preset Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-blue-900">
                    Selected Preset: {selectedPreset.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    Aspect Ratio: <strong>{selectedPreset.aspectRatio.toFixed(3)}</strong> 
                    ({selectedPreset.aspectRatio > 1 ? 'Landscape' : 'Portrait'}) - 
                    {' '}{selectedPhotoCount} photo{selectedPhotoCount > 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Drag the boxes to position them. Drag the bottom-right corner to resize. 
                  <strong> Aspect ratio is locked</strong> - width and height adjust proportionally.
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
                {photoSlots.map((slot) => {
                  const slotAspectRatio = slot.width / slot.height;
                  return (
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
                      {/* Slot Label with Aspect Ratio */}
                      <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded font-semibold">
                        Photo {slot.id} | Ratio: {slotAspectRatio.toFixed(2)}
                      </div>

                      {/* Resize Handle */}
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-green-600 cursor-se-resize"
                        onMouseDown={(e) => handleMouseDown(slot. id, true, e)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Slot Info with Aspect Ratio */}
              <div className={`grid gap-4 text-xs ${selectedPhotoCount === 4 ? 'grid-cols-4' : selectedPhotoCount === 3 ? 'grid-cols-3' : selectedPhotoCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {photoSlots. map((slot) => {
                  const slotAspectRatio = slot.width / slot.height;
                  return (
                    <div key={slot.id} className="bg-gray-100 p-3 rounded-lg">
                      <p className="font-semibold mb-1">Photo {slot.id}</p>
                      <p>X: {slot.x. toFixed(1)}%</p>
                      <p>Y: {slot.y.toFixed(1)}%</p>
                      <p>W: {slot.width.toFixed(1)}%</p>
                      <p>H: {slot.height.toFixed(1)}%</p>
                      <p className="font-semibold text-green-600 mt-1">
                        Ratio: {slotAspectRatio.toFixed(3)}
                      </p>
                    </div>
                  );
                })}
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