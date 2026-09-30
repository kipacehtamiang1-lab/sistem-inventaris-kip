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
