// components/navbar.js — perilaku navbar Pegawai (menu mobile dropdown)

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.pegawai-nav [data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  if (!menuToggle || !mobileMenu) return;

  menuToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
});
