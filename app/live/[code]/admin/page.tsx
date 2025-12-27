'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

type Photo = {
  id: string;
  cloudinary_url: string;
  created_at: string;
  is_hidden: boolean;
};

// Optimasi gambar thumbnail agar loading admin cepat
const getOptimizedUrl = (url: string) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/w_300,q_auto,f_auto/'); 
};

export default function AdminModerationPage() {
  const params = useParams();
  const rawCode = params.code as string;
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState(''); // PIN disimpan untuk request API
  const [inputPin, setInputPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // 1. Fetch Data Event
  useEffect(() => {
    const initData = async () => {
      const cleanCode = rawCode.trim();
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanCode);

      let query = supabase.from('events').select('id, name, access_code');
      if (isUUID) query = query.eq('id', cleanCode);
      else query = query.eq('access_code', cleanCode.toUpperCase());

      const { data: event } = await query.single();

      if (!event) {
        setLoading(false);
        return;
      }

      setEventName(event.name);
      setEventId(event.id);
      
      // 🔥 RESTORE SESSION: Cek apakah sudah login sebelumnya di tab ini
      const savedAuth = sessionStorage.getItem(`admin_auth_${event.id}`);
      const savedPin = sessionStorage.getItem(`admin_pin_${event.id}`);
      
      if (savedAuth === 'true' && savedPin) {
          setIsAuthenticated(true);
          setPin(savedPin);
      }

      // Ambil SEMUA foto (termasuk yang hidden)
      const { data: allPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (allPhotos) setPhotos(allPhotos);
      setLoading(false);
    };

    initData();
  }, [rawCode]);

  // 2. Realtime Update
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel('admin_photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
        (payload) => {
           if (payload.eventType === 'INSERT') {
               setPhotos(prev => [payload.new as Photo, ...prev]);
           } else if (payload.eventType === 'UPDATE') {
               const updated = payload.new as Photo;
               setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p));
           } else if (payload.eventType === 'DELETE') {
               setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
           }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // 3. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setVerifying(true);
      
      try {
          const res = await fetch('/api/live-auth', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ mode: 'verify', event_id: eventId, input_pin: inputPin })
          });
          const data = await res.json();
          
          if (data.valid) {
              setPin(inputPin);
              setIsAuthenticated(true);
              
              // 🔥 SAVE SESSION: Simpan status login ke SessionStorage
              // Ini aman karena akan hilang jika tab/browser ditutup, tapi tahan refresh.
              sessionStorage.setItem(`admin_auth_${eventId}`, 'true');
              sessionStorage.setItem(`admin_pin_${eventId}`, inputPin);
              
              toast.success("Login Berhasil");
          } else {
              toast.error("PIN Salah");
          }
      } catch (err) {
          toast.error("Gagal login server");
      } finally {
          setVerifying(false);
      }
  };

  // 4. Handle Logout
  const handleLogout = () => {
      setIsAuthenticated(false);
      setPin('');
      setInputPin('');
      sessionStorage.removeItem(`admin_auth_${eventId}`);
      sessionStorage.removeItem(`admin_pin_${eventId}`);
      toast('Logout berhasil', { icon: '👋' });
  };

  // 5. Toggle Hide/Show
  const toggleVisibility = async (photo: Photo) => {
      const newAction = photo.is_hidden ? 'show' : 'hide';
      
      // Optimistic Update
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_hidden: !p.is_hidden } : p));

      try {
          const res = await fetch('/api/moderate', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  photo_id: photo.id, 
                  action: newAction, 
                  event_id: eventId, 
                  pin: pin 
              })
          });

          if (!res.ok) throw new Error("Gagal update");
          toast.success(newAction === 'hide' ? 'Foto Disembunyikan' : 'Foto Ditampilkan');

      } catch (err) {
          // Revert jika gagal
          setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_hidden: photo.is_hidden } : p));
          toast.error("Gagal mengubah status foto");
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  // LAYAR LOGIN
  if (!isAuthenticated) {
      return (
          <div className="h-screen w-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
              <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-6 h-6 text-gray-500" />
                  </div>
                  <h2 className="text-xl font-bold mb-1">Admin Panel</h2>
                  <p className="text-gray-500 text-sm mb-6">{eventName}</p>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                      <input 
                        type="password" 
                        placeholder="PIN Event" 
                        className="w-full p-3 border border-gray-300 rounded-xl text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-black"
                        value={inputPin}
                        onChange={e => setInputPin(e.target.value)}
                        autoFocus
                      />
                      <button 
                        disabled={verifying}
                        className="w-full bg-black text-white p-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                          {verifying ? 'Memeriksa...' : 'Masuk Dashboard'}
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // LAYAR DASHBOARD
  return (
      <div className="min-h-screen bg-gray-50 font-sans">
          {/* Top Bar */}
          <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
              <div>
                  <h1 className="text-lg font-bold leading-none">Moderasi</h1>
                  <p className="text-xs text-gray-500 mt-1">{photos.length} Foto Total</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 bg-gray-100 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Logout"
              >
                  <LogOut size={18} />
              </button>
          </div>

          <div className="p-4 pb-20 max-w-5xl mx-auto">
              {photos.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                      <p>Belum ada foto masuk.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {photos.map(photo => (
                          <div key={photo.id} className={`relative group rounded-lg overflow-hidden bg-white shadow-sm transition-all border-2 ${photo.is_hidden ? 'border-red-500 opacity-60' : 'border-transparent'}`}>
                              
                              <div className="aspect-[3/4] relative bg-gray-100">
                                  <img 
                                    src={getOptimizedUrl(photo.cloudinary_url)} 
                                    className="w-full h-full object-cover" 
                                    loading="lazy"
                                  />
                              </div>
                              
                              {/* Overlay Button */}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => toggleVisibility(photo)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs shadow-lg transform active:scale-95 transition-transform ${photo.is_hidden ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                  >
                                      {photo.is_hidden ? <><Eye size={14}/> Tampilkan</> : <><EyeOff size={14}/> Sembunyikan</>}
                                  </button>
                              </div>

                              {/* Status Badge */}
                              {photo.is_hidden && (
                                  <div className="absolute top-1 right-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm">
                                      HIDDEN
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );
}