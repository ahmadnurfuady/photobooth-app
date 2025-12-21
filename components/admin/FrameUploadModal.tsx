// components/admin/FrameUploadModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { PhotoSlot, FrameConfig } from '@/types';
import { FRAME_PRESETS, FIXED_SLOT_SIZES, generateDefaultSlots } from '@/lib/framePresets';
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

export const FrameUploadModal: React.FC<FrameUploadModalProps> = ({
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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Store actual frame image dimensions
  const [frameDimensions, setFrameDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    const img = new Image();
    img.onload = () => {
      setFrameDimensions({ width: img.width, height: img.height });
    };
    img.src = url;
  };

  // Handle photo count change - regenerate slots with FIXED sizes
  const handlePhotoCountChange = (count: 1 | 2 | 3 | 4) => {
    setSelectedPhotoCount(count);
    const preset = FRAME_PRESETS[count];
    const fixedSize = FIXED_SLOT_SIZES[count];
    const newSlots = generateFixedSizeSlots(preset, fixedSize);
    setPhotoSlots(newSlots);
  };
  
  // Generate slots with FIXED size (4:3 aspect ratio)
  const generateFixedSizeSlots = (
    preset: typeof FRAME_PRESETS[1],
    fixedSize: { width: number; height: number }
  ): PhotoSlot[] => {
    const slots: PhotoSlot[] = [];
    const { layout } = preset;
    
    // NOTE: Logika posisi (x,y) sederhana untuk inisialisasi awal.
    // User bisa geser manual nanti.
    
    switch (layout) {
      case 'single':
        slots.push({
          id: 1,
          x: (100 - fixedSize.width) / 2,
          y: (100 - fixedSize.height) / 2,
          width: fixedSize.width,
          height: fixedSize.height,
        });
        break;

      case 'vertical':
        const verticalGap = 4;
        const verticalPadding = (100 - (fixedSize.height * 2 + verticalGap)) / 2;
        slots.push(
          { id: 1, x: (100 - fixedSize.width) / 2, y: verticalPadding, width: fixedSize.width, height: fixedSize.height },
          { id: 2, x: (100 - fixedSize.width) / 2, y: verticalPadding + fixedSize.height + verticalGap, width: fixedSize.width, height: fixedSize.height }
        );
        break;

      case 'strip':
        // Handle 3 or 4 photos strip logic
        const stripGap = 3;
        const count = preset.photoCount;
        const totalHeight = (fixedSize.height * count) + (stripGap * (count - 1));
        const stripPadding = (100 - totalHeight) / 2;
        
        for (let i = 0; i < count; i++) {
          slots.push({
            id: i + 1,
            x: (100 - fixedSize.width) / 2,
            y: stripPadding + i * (fixedSize.height + stripGap),
            width: fixedSize.width,
            height: fixedSize.height,
          });
        }
        break;

      case 'grid':
        // Fallback for grid logic
        const gridGap = 4;
        const gridPaddingX = (100 - (fixedSize.width * 2 + gridGap)) / 2;
        const gridPaddingY = (100 - (fixedSize.height * 2 + gridGap)) / 2;

        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            slots.push({
              id: row * 2 + col + 1,
              x: gridPaddingX + col * (fixedSize.width + gridGap),
              y: gridPaddingY + row * (fixedSize.height + gridGap),
              width: fixedSize.width,
              height: fixedSize.height,
            });
          }
        }
        break;
    }
    
    return slots;
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
    if (!frameDimensions) {
      toast.error('Please wait for frame image to load');
      return;
    }
    
    // Regenerate slots based on fresh selection before moving step
    const fixedSize = FIXED_SLOT_SIZES[selectedPhotoCount];
    const fixedSlots = generateFixedSizeSlots(selectedPreset, fixedSize);
    setPhotoSlots(fixedSlots);

    setStep('position');
  };

  const handleBack = () => {
    setStep('upload');
  };

  const handleSaveFrame = async () => {
    if (!selectedFile || !frameName.trim() || !frameDimensions) return;

    setLoading(true);
    try {
      const frameConfig: FrameConfig = {
        photo_count: selectedPhotoCount,
        layout: selectedPreset.layout,
        aspect_ratio: selectedPreset.aspectRatio,
        default_slot_size: selectedPreset.defaultSlotSize,
      };

      const photoSlotsForSave = photoSlots.map(slot => ({
        id: slot.id,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
      }));

      await onUpload({
        name: frameName,
        imageFile: selectedFile,
        photoSlots: photoSlotsForSave,
        frameConfig,
      });

      toast.success('Frame uploaded successfully!');
      handleClose();
    } catch (error) {
      console.error('Error uploading frame:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload frame');
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
    const fixedSize = FIXED_SLOT_SIZES[3];
    setPhotoSlots(generateFixedSizeSlots(FRAME_PRESETS[3], fixedSize));
    onClose();
  };

  const handleMouseDown = (slotId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(slotId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || dragging === null) return;

    const container = containerRef.current.getBoundingClientRect();
    if (container.width === 0 || container.height === 0) return;
    
    const deltaX = ((e.clientX - dragStart.x) / container.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / container.height) * 100;

    setPhotoSlots(prev =>
      prev.map(slot =>
        slot.id === dragging
          ? {
              ...slot,
              x: Math.max(0, Math.min(100 - slot.width, slot.x + deltaX)),
              y: Math.max(0, Math.min(100 - slot.height, slot.y + deltaY)),
            }
          : slot
      )
    );
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'upload' ? 'Upload New Frame' : 'Position Photo Slots'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' ? (
            // STEP 1: Upload Frame
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frame Name</label>
                <input
                  type="text"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter frame name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo Layout</label>
                <select
                  value={selectedPhotoCount}
                  onChange={(e) => handlePhotoCountChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.values(FRAME_PRESETS).map((preset) => (
                    <option key={preset.photoCount} value={preset.photoCount}>
                      {preset.name} (Ratio: {preset.aspectRatio.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frame Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
                >
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={previewUrl} alt="Preview" className="max-h-64 object-contain mb-4" />
                      <p className="text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">Click to upload frame image</p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>
            </div>
          ) : (
            // STEP 2: Position Photo Slots (THE FIX IS HERE)
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>Current Layout:</strong> {selectedPreset.name} <br />
                <strong>Container Ratio:</strong> {selectedPreset.aspectRatio.toFixed(3)}
              </div>

              {/* PERBAIKAN UTAMA:
                  Container ini sekarang memaksa aspect-ratio mengikuti preset.
                  Jadi untuk strip 4 foto (0.27), kotak abu-abu ini akan jadi kurus panjang.
              */}
              <div className="w-full flex justify-center bg-gray-200 p-4 rounded-xl overflow-hidden">
                <div
                  ref={containerRef}
                  className="relative bg-white shadow-xl mx-auto"
                  style={{
                    // 1. Paksa Aspect Ratio sesuai kertas fisik
                    aspectRatio: `${selectedPreset.aspectRatio}`,
                    
                    // 2. Logic Responsif: 
                    // Jika Strip (Ratio < 1), kunci tinggi (height), lebar auto.
                    // Jika Landscape (Ratio > 1), kunci lebar (width), tinggi auto.
                    height: selectedPreset.aspectRatio < 1 ? '70vh' : 'auto',
                    width: selectedPreset.aspectRatio > 1 ? '100%' : 'auto',
                    
                    // Batasan agar tidak keluar layar
                    maxHeight: '75vh',
                    maxWidth: '100%'
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Background Frame Image */}
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Frame"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  {/* Slots */}
                  {photoSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="absolute border-2 border-green-400 bg-green-400/30 hover:bg-green-400/40 cursor-move z-10"
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.width}%`,
                        height: `${slot.height}%`,
                      }}
                      onMouseDown={(e) => handleMouseDown(slot.id, e)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md pointer-events-none">
                        {slot.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          {step === 'upload' ? (
            <>
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" onClick={handleNext} disabled={!frameName.trim() || !selectedFile}>Next →</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleBack}>← Back</Button>
              <Button variant="primary" onClick={handleSaveFrame} loading={loading} disabled={loading}>Save Frame</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};