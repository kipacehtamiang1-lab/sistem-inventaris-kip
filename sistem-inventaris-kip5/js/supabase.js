// supabase.js — inisialisasi Supabase client, dipakai bersama oleh semua halaman.
//
// Menggunakan Supabase JS lewat CDN ESM sehingga tidak perlu langkah build/bundler,
// selaras dengan keputusan stack proyek ini (HTML + CSS + JavaScript murni).
//
// Cara pakai di halaman lain:
//   import { supabase } from '../js/supabase.js';
//   const { data, error } = await supabase.from('inventaris').select('*');

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper kecil: ambil user yang sedang login beserta data profil (role, nama, dsb)
// dari tabel "profiles". Dipakai oleh auth-guard.js dan halaman-halaman lain
// yang butuh menampilkan nama/role pengguna.
export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Gagal mengambil profil:', error.message);
    return null;
  }
  return profile;
}
