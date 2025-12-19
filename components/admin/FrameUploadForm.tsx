// components/admin/FrameUploadForm.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { fileToBase64, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FrameUploadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess:  () => void;
}

export const FrameUploadForm: React.FC<FrameUploadFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState({ name: '', file: '' });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({ name: '', isActive: true });
    setFile(null);
    setPreview(null);
    setErrors({ name: '', file: '' });
    setUploadProgress(0);
  };

  const validateForm = (): boolean => {
    const newErrors = { name: '', file: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Frame name is required';
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Frame name must be at least 3 characters';
      isValid = false;
    }

    if (!file) {
      newErrors.file = 'Please select an image file';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Only PNG, JPG, JPEG, and WebP files are allowed';
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFileSelect = async (selectedFile: File) => {
    const error = validateFile(selectedFile);
    
    if (error) {
      setErrors((prev) => ({ ...prev, file: error }));
      toast.error(error);
      return;
    }

    setFile(selectedFile);
    setErrors((prev) => ({ ...prev, file: '' }));

    // Generate preview
    try {
      const base64 = await fileToBase64(selectedFile);
      setPreview(base64);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e. target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React. DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleSubmit = async (e:  React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !file) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const base64File = await fileToBase64(file);

      // Simulate progress (since we don't have real progress from fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to API
      const response = await fetch('/api/frames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON. stringify({
          name: formData.name. trim(),
          file: base64File,
          is_active: formData.isActive,
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (! response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload frame');
      }

      const data = await response.json();
      
      toast.success('Frame uploaded successfully!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error:  any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload frame');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (! loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload New Frame"
      size="lg"
      closeOnBackdropClick={! loading}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={loading}>
            Upload Frame
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Frame Name */}
        <Input
          label="Frame Name"
          type="text"
          placeholder="Enter frame name (e.g., Birthday Frame)"
          value={formData. name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target. value });
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors. name}
          disabled={loading}
          required
        />

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frame Image
          </label>
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : errors.file
                ?  'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />

            {preview ?  (
              <div className="space-y-4">
                {/* Preview Image */}
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* File Info */}
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{file?. name}</p>
                  <p className="text-gray-500">{file && formatFileSize(file.size)}</p>
                </div>

                {/* Change File Button */}
                {! loading && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    Choose File
                  </Button>
                  <p className="mt-2 text-sm text-gray-500">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, JPEG, WebP up to 10MB
                </p>
              </div>
            )}
          </div>

          {errors.file && (
            <p className="mt-2 text-sm text-red-600">{errors.file}</p>
          )}
        </div>

        {/* Active Status Toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="sr-only peer"
              disabled={loading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            Set as active frame
          </span>
        </div>

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};