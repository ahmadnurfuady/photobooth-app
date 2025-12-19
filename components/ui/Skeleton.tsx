// components/ui/Skeleton. tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React. HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React. FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  ...props
}) => {
  const variants = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style:  React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variants[variant],
        className
      )}
      style={style}
      {...props}
    />
  );
};

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
    <Skeleton variant="rectangular" height={200} />
    <Skeleton variant="text" width="80%" />
    <Skeleton variant="text" width="60%" />
    <div className="flex gap-2 pt-2">
      <Skeleton variant="rectangular" width={80} height={32} />
      <Skeleton variant="rectangular" width={80} height={32} />
    </div>
  </div>
);