// config.js — konfigurasi umum aplikasi SIPIN
// Ganti nilai di bawah ini dengan kredensial project Supabase Anda sendiri.
// Jangan pernah menaruh service_role key di sini — hanya anon/public key
// yang aman dipakai di sisi browser (frontend).

export const SUPABASE_URL = "https://ekppeloecfwhsonnyeyn.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_8LMPI0yCKs27go89rfn0Zg_ClNNmQ2K";

export const APP_NAME = "SIMPEL";
export const ORG_NAME = "KIP Kabupaten Aceh Tamiang";

// Path relatif ke halaman setelah login berhasil, dibedakan per role.
// Role disimpan pada tabel "profiles" (kolom "role": 'admin' | 'pegawai' | 'pending').
export const REDIRECT_AFTER_LOGIN = {
  admin: "admin/dashboard.html",
  pegawai: "pegawai/dashboard.html",
  pending: "menunggu-konfirmasi.html",
};

// Kondisi barang yang dipakai pada form Pengembalian (js/admin/pengembalian.js)
export const KONDISI_BARANG = ["Baik", "Rusak", "Tidak Lengkap", "Hilang"];
