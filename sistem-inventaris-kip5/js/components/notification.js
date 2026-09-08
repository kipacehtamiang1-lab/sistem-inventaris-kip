// components/notification.js — toast notifikasi sederhana
//
// Cara pakai dari skrip halaman mana pun:
//   showToast('Barang berhasil disimpan');
//   showToast('Gagal menyimpan data', 'error');

function showToast(message, type = 'success', duration = 3200) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);

  setTimeout(() => toast.remove(), duration);
}

// Diekspos secara global karena file lain (admin/*.js, pegawai/*.js) dimuat
// sebagai skrip biasa (bukan module) supaya lebih sederhana untuk pemula.
window.showToast = showToast;

// Contoh: tombol notifikasi lonceng di topbar admin
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-notif')?.addEventListener('click', () => {
    showToast('Belum ada notifikasi baru.', 'success');
  });
});
