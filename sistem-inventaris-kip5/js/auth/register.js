// auth/register.js — menangani submit form di register.html
//
// Alur: buat akun di Supabase Auth lewat signUp(), sambil menitipkan
// nama/nip/jabatan sebagai "user metadata". Baris di tabel `profiles`
// TIDAK dibuat dari sini lagi — itu sekarang tugas trigger database
// `handle_new_user()` (lihat sql/patch_2026-09-01_auto_profile.sql), yang
// otomatis jalan begitu akun baru masuk ke auth.users, apa pun status
// login/konfirmasi emailnya. Ini menghindari bug lama: insert dari
// JavaScript ditolak RLS kalau akun baru belum punya sesi aktif (mis.
// karena "Confirm email" aktif di pengaturan Supabase Auth).

import { supabase } from '../supabase.js';

const form = document.getElementById('form-register');
const alertBox = document.getElementById('register-alert');
const btn = document.getElementById('btn-register');

function showAlert(message, type = 'bad') {
  alertBox.innerHTML = `<div class="badge badge-${type}" style="display:flex; margin-bottom:1rem; padding:.6rem .9rem;">${message}</div>`;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Memproses…';

  const nama = document.getElementById('nama').value.trim();
  const nip = document.getElementById('nip').value.trim();
  const jabatan = document.getElementById('jabatan').value.trim();
  const email = document.getElementById('remail').value.trim();
  const password = document.getElementById('rpass').value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nama, nip, jabatan } },
  });

  if (error) {
    console.error(error);
    showAlert(error.message.includes('already') ? 'Email sudah terdaftar.' : 'Pendaftaran gagal. Coba lagi.');
    btn.disabled = false;
    btn.textContent = 'Daftar & Tunggu Konfirmasi';
    return;
  }

  window.location.href = 'menunggu-konfirmasi.html';
});
