// components/admin/AddFrameModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AddFrameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddFrameModal: React.FC<AddFrameModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    sidePadding: 12,
    verticalPadding: 6,
    gapBetweenPhotos: 4,
  });
  const [manualMode, setManualMode] = useState(false);
  const [slots, setSlots] = useState([
    { x: 12, y: 6, width: 76, height: 26, radius: 8 },
    { x: 12, y: 38, width: 76, height: 26, radius: 8 },
    { x: 12, y: 70, width: 76, height: 26, radius: 8 },
  ] as { x: number; y: number; width: number; height: number; radius?: number }[]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Frame name is required');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    setLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const response = await fetch('/api/frames', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            file: base64String,
            is_active: formData.isActive,
            layout_settings: manualMode
              ? { slots }
              : {
                  sidePadding: formData.sidePadding,
                  verticalPadding: formData.verticalPadding,
                  gapBetweenPhotos: formData.gapBetweenPhotos,
                },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create frame');
        }

        toast.success('Frame created successfully!');
        setFormData({ name: '', isActive: true, sidePadding: 12, verticalPadding: 6, gapBetweenPhotos: 4 });
        setManualMode(false);
        setSlots([
          { x: 12, y: 6, width: 76, height: 26, radius: 8 },
          { x: 12, y: 38, width: 76, height: 26, radius: 8 },
          { x: 12, y: 70, width: 76, height: 26, radius: 8 },
        ]);
        setSelectedFile(null);
        setPreview('');
        onSuccess();
        onClose();
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error creating frame:', error);
      toast.error('Failed to create frame');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Frame</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Frame Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Frame Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Birthday Frame"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Upload Image
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-6 h-6 mx-auto text-gray-400 mb-2"
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
              <p className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select image'}
              </p>
            </button>
          </div>

          {/* Image Preview with optional slot overlays */}
          {preview && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Preview
              </label>
              <div className="relative w-full overflow-hidden rounded-lg border border-gray-200" style={{ aspectRatio: '3/4' }}>
                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
                {manualMode && slots.map((s, idx) => (
                  <div
                    key={idx}
                    className="absolute border-2 border-blue-500/70 bg-blue-200/10"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: `${s.width}%`,
                      height: `${s.height}%`,
                      borderRadius: `${s.radius ?? 8}%`,
                    }}
                    title={`Slot ${idx + 1}`}
                  />
                ))}
              </div>
              {manualMode && (
                <p className="text-xs text-gray-500 mt-1">Tip: Atur angka di bawah untuk memosisikan 3 slot foto (persentase dari dimensi frame).</p>
              )}
            </div>
          )}

          {/* Layout Settings */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Photo Layout Settings</h3>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={manualMode} onChange={(e) => setManualMode(e.target.checked)} disabled={loading} />
                Manual placement (advanced)
              </label>
            </div>
            <p className="text-xs text-gray-500">Pilih metode pengaturan posisi foto.</p>
            
            {!manualMode && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Side Padding: {formData.sidePadding}%
              </label>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={formData.sidePadding}
                onChange={(e) => setFormData({ ...formData, sidePadding: Number(e.target.value) })}
                disabled={loading}
                className="w-full"
              />
            </div>
            )}

            {!manualMode && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Top/Bottom Padding: {formData.verticalPadding}%
              </label>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={formData.verticalPadding}
                onChange={(e) => setFormData({ ...formData, verticalPadding: Number(e.target.value) })}
                disabled={loading}
                className="w-full"
              />
            </div>
            )}

            {!manualMode && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gap Between Photos: {formData.gapBetweenPhotos}%
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={formData.gapBetweenPhotos}
                onChange={(e) => setFormData({ ...formData, gapBetweenPhotos: Number(e.target.value) })}
                disabled={loading}
                className="w-full"
              />
            </div>
            )}

            {manualMode && (
              <div className="grid grid-cols-1 gap-3">
                {[0,1,2].map((i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded">
                    <div className="col-span-2 text-xs font-medium text-gray-700">Slot {i+1}</div>
                    <label className="text-xs text-gray-700">X%
                      <input type="number" min={0} max={100} step={0.5} value={slots[i].x} onChange={(e) => {
                        const v = Number(e.target.value); const next = [...slots]; next[i] = { ...next[i], x: v }; setSlots(next);
                      }} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-gray-700">Y%
                      <input type="number" min={0} max={100} step={0.5} value={slots[i].y} onChange={(e) => {
                        const v = Number(e.target.value); const next = [...slots]; next[i] = { ...next[i], y: v }; setSlots(next);
                      }} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-gray-700">Width%
                      <input type="number" min={1} max={100} step={0.5} value={slots[i].width} onChange={(e) => {
                        const v = Number(e.target.value); const next = [...slots]; next[i] = { ...next[i], width: v }; setSlots(next);
                      }} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-gray-700">Height%
                      <input type="number" min={1} max={100} step={0.5} value={slots[i].height} onChange={(e) => {
                        const v = Number(e.target.value); const next = [...slots]; next[i] = { ...next[i], height: v }; setSlots(next);
                      }} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-gray-700">Radius%
                      <input type="number" min={0} max={30} step={0.5} value={slots[i].radius ?? 8} onChange={(e) => {
                        const v = Number(e.target.value); const next = [...slots]; next[i] = { ...next[i], radius: v }; setSlots(next);
                      }} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              disabled={loading}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-600">
              Active (available for use)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Uploading...' : 'Create Frame'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
