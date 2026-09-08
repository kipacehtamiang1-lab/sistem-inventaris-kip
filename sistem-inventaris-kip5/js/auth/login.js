
import { supabase } from '../supabase.js';
import { REDIRECT_AFTER_LOGIN } from '../config.js';

const form = document.getElementById('form-login');
const alertBox = document.getElementById('login-alert');
const btn = document.getElementById('btn-login');

function showAlert(message) {
  alertBox.innerHTML = `<div class="badge badge-bad" style="display:flex; margin-bottom:1rem; padding:.6rem .9rem;">${message}</div>`;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Memeriksa akun…';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showAlert('Email atau kata sandi salah. Silakan coba lagi.');
    btn.disabled = false;
    btn.textContent = 'Masuk';
    return;
  }

  // Ambil role dari tabel profiles untuk menentukan tujuan pengalihan
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role || 'pending';
  window.location.href = REDIRECT_AFTER_LOGIN[role] || 'menunggu-konfirmasi.html';
});