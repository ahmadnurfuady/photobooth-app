// components/booth/FrameSelectionPreview.tsx
'use client';

import React from 'react';
import { PhotoSlot } from '@/types';

interface FrameSelectionPreviewProps {
    slots: PhotoSlot[];
    frameImageUrl?: string | null;
    aspectRatio?: number;
    className?: string;
    slotColors?: string[];
}

// Default slot colors - biru, hijau, kuning, merah
const DEFAULT_SLOT_COLORS = [
    '#3B82F6', // Slot 1: Bright Blue
    '#22C55E', // Slot 2: Vivid Green  
    '#EAB308', // Slot 3: Bright Yellow
    '#EF4444', // Slot 4: Bright Red
    '#8B5CF6', // Slot 5: Purple
    '#EC4899', // Slot 6: Pink
    '#06B6D4', // Slot 7: Cyan
    '#F97316', // Slot 8: Orange
];

export const FrameSelectionPreview: React.FC<FrameSelectionPreviewProps> = ({
    slots,
    frameImageUrl,
    aspectRatio = 5 / 18.5,
    className = '',
    slotColors = DEFAULT_SLOT_COLORS,
}) => {
    return (
        <div className={`relative ${className}`}>
            {/* Film Strip Container */}
            <div
                className="relative bg-black rounded-lg shadow-2xl overflow-hidden"
                style={{ aspectRatio: `${aspectRatio}` }}
            >
                {/* Left Sprocket Holes */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-black flex flex-col justify-evenly items-center py-2 z-20">
                    {Array.from({ length: Math.max(8, slots.length * 2) }).map((_, i) => (
                        <div key={`left-${i}`} className="w-1.5 h-1.5 rounded-sm bg-gray-800 border border-gray-600" />
                    ))}
                </div>

                {/* Right Sprocket Holes */}
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-black flex flex-col justify-evenly items-center py-2 z-20">
                    {Array.from({ length: Math.max(8, slots.length * 2) }).map((_, i) => (
                        <div key={`right-${i}`} className="w-1.5 h-1.5 rounded-sm bg-gray-800 border border-gray-600" />
                    ))}
                </div>

                {/* Frame Background Image */}
                {frameImageUrl && (
                    <img src={frameImageUrl} alt="Frame" className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" />
                )}

                {/* Photo Slots dengan Nomor dan Warna */}
                {slots.map((slot, index) => {
                    const slotColor = slotColors[index % slotColors.length];
                    const slotNumber = slot.id <= 4 ? slot.id : ((slot.id - 1) % 4) + 1;

                    return (
                        <div
                            key={slot.id}
                            className="absolute overflow-hidden"
                            style={{
                                left: `${slot.x}%`,
                                top: `${slot.y}%`,
                                width: `${slot.width}%`,
                                height: `${slot.height}%`,
                            }}
                        >
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: slotColor }}
                            >
                                <span
                                    className="font-extrabold text-white"
                                    style={{
                                        fontSize: 'clamp(1rem, 8vw, 4rem)',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    {slotNumber}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Glow Effect */}
            <div
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{ boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' }}
            />
        </div>
    );
};

export default FrameSelectionPreview;
