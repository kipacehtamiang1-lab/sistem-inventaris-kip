// auth/auth-guard.js — proteksi halaman admin/ dan pegawai/
//
// Disertakan di setiap halaman dalam folder admin/ dan pegawai/ (lihat tag
// <script type="module"> di bagian bawah setiap halaman). Skrip ini:
//   1. Memastikan ada sesi login aktif — jika tidak, kembalikan ke login.html
//   2. Memastikan role pengguna sesuai folder halaman (admin/ vs pegawai/)
//   3. Menolak akun berstatus 'pending' (belum dikonfirmasi Admin)
//
// Path "../" dipakai karena file ini diakses dari dalam admin/*.html
// dan pegawai/*.html, dua tingkat dari root proyek.

import { supabase, getCurrentProfile } from '../supabase.js';

const currentFolder = window.location.pathname.includes('/admin/') ? 'admin' : 'pegawai';

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  window.location.href = '../login.html';
} else {
  const profile = await getCurrentProfile();

  if (!profile || profile.role === 'pending') {
    window.location.href = '../menunggu-konfirmasi.html';
  } else if (profile.role !== currentFolder) {
    // Pegawai mencoba membuka halaman admin, atau sebaliknya
    window.location.href = profile.role === 'admin' ? '../admin/dashboard.html' : '../pegawai/dashboard.html';
  } else {
    // Sesi valid — simpan sementara untuk dipakai komponen lain (mis. navbar/sidebar)
    window.__simpelProfile = profile;

    // Isi otomatis nama/inisial di UI umum tiap halaman (topbar admin, navbar pegawai)
    // supaya tidak ada lagi nama contoh ("Fakhruddin") yang nyangkut di halaman
    // orang lain yang login.
    const inisial = (profile.nama || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    document.querySelectorAll('.profile-chip .avatar').forEach((el) => { el.textContent = inisial; });
    document.querySelectorAll('.profile-chip .info b').forEach((el) => { el.textContent = profile.nama; });
    document.querySelectorAll('.profile-chip .info span').forEach((el) => { el.textContent = profile.jabatan || (profile.role === 'admin' ? 'Admin Logistik' : 'Pegawai'); });
    document.querySelectorAll('#p-nama').forEach((el) => { el.textContent = profile.nama; });
    document.querySelectorAll('#p-avatar').forEach((el) => { el.textContent = inisial; });
    document.querySelectorAll('#p-role').forEach((el) => { el.textContent = profile.jabatan || ''; });
    document.querySelectorAll('#p-nip').forEach((el) => { el.textContent = profile.nip || '-'; });
    document.querySelectorAll('#p-email').forEach((el) => { el.textContent = profile.email || '-'; });
    document.querySelectorAll('#p-jabatan').forEach((el) => { el.textContent = profile.jabatan || '-'; });
    document.querySelectorAll('.sidebar-foot b').forEach((el) => { el.textContent = profile.role === 'admin' ? 'Admin Logistik' : profile.nama; });
  }
}
