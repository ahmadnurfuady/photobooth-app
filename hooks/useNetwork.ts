// hooks/useNetwork.ts
import { useState, useEffect } from 'react';

export function useNetwork() {
  const [isOnline, setOnline] = useState(true);

  useEffect(() => {
    // Cek status awal (hanya di client side)
    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine);
    }

    const updateOnlineStatus = () => setOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return isOnline;
}