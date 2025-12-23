// components/ui/OfflineBanner.tsx
'use client';

import { useNetwork } from '@/hooks/useNetwork';

export const OfflineBanner = () => {
  const isOnline = useNetwork();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 z-[9999] shadow-md animate-in slide-in-from-top">
      ⚠️ No Internet Connection. Working in Offline Mode.
    </div>
  );
};