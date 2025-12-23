'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Gunakan Admin Client untuk bypass RLS saat update
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAppSettings() {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  // Convert array ke object biar gampang dipanggil
  // Contoh: { google_client_id: '123...', google_client_secret: 'abc...' }
  const settingsObject = data.reduce((acc: any, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  return settingsObject;
}

export async function updateAppSetting(key: string, value: string) {
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString() 
    });

  if (error) throw new Error(error.message);
  
  // Refresh halaman agar data terbaru muncul
  revalidatePath('/admin/settings');
}