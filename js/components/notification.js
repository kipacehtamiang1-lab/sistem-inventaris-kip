

function showToast(message, type = 'success', duration = 3200) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);

  setTimeout(() => toast.remove(), duration);
}


window.showToast = showToast;

// Contoh: tombol notifikasi lonceng di topbar admin
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-notif')?.addEventListener('click', () => {
    showToast('Belum ada notifikasi baru.', 'success');
  });
});
