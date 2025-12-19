// components/admin/FrameCard.tsx
'use client';

import React, { useState } from 'react';
import { Frame } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FrameCardProps {
  frame: Frame;
  onUpdate: (id: string, updates: Partial<Frame>) => Promise<void>;
  onDelete:  (id: string) => Promise<void>;
}

export const FrameCard: React.FC<FrameCardProps> = ({ frame, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(frame.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      await onUpdate(frame.id, { is_active: !frame.is_active });
      toast.success(`Frame ${frame.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error updating frame status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update frame status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (! editName.trim()) {
      toast.error('Frame name cannot be empty');
      return;
    }

    if (editName === frame.name) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdate(frame.id, { name: editName. trim() });
      toast.success('Frame name updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating frame:', error);
      toast.error(error instanceof Error ? error.message :  'Failed to update frame name');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(frame.id);
      toast.success('Frame deleted successfully');
    } catch (error) {
      toast.error('Failed to delete frame');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(frame.name);
    setIsEditing(false);
  };

  return (
    <>
      <Card hover className="overflow-hidden">
        {/* Frame Image - FIXED: Support both portrait AND landscape frames */}
        <div className="relative w-full bg-gray-100 p-2 flex items-center justify-center" style={{ minHeight: '150px' }}>
            <img
                src={ frame.cloudinary_url}
                alt={frame.name}
                className="max-w-full h-auto object-contain"
                style={{ maxHeight:  '500px', maxWidth: '300px' }} 
            />
          
          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                frame.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {frame.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Frame Info */}
        <div className="p-4 space-y-3">
          {/* Frame Name */}
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  loading={loading}
                  disabled={loading}
                  className="flex-1"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {frame.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(frame.created_at)}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-blue-600 ml-2"
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Actions */}
          {! isEditing && (
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <Button
                size="sm"
                variant={frame.is_active ? 'secondary' : 'primary'}
                onClick={handleToggleActive}
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                {frame.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Frame"
        message={`Are you sure you want to delete "${frame.name}"?  This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading}
      />
    </>
  );
};