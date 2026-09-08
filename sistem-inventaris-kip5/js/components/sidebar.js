// components/sidebar.js — perilaku sidebar admin (khusus layar kecil)
// Active link sudah ditandai langsung di HTML tiap halaman (class="active"),
// skrip ini hanya menangani buka/tutup sidebar di mode mobile.

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const sidebar = document.querySelector('.sidebar');
  if (!menuToggle || !sidebar) return;

  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

  document.addEventListener('click', (e) => {
    const isMobile = window.innerWidth <= 900;
    if (isMobile && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
});
