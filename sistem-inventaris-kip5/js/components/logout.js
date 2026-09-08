// components/logout.js — tombol keluar (dropdown profil admin & menu pegawai)

document.addEventListener('DOMContentLoaded', () => {
  // Klik avatar admin (.profile-chip) → toggle dropdown, bukan langsung logout
  document.querySelectorAll('[data-profile-toggle]').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      chip.classList.toggle('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.profile-chip.open').forEach((c) => c.classList.remove('open'));
  });

  // Tombol/link dengan data-logout (dropdown admin, navbar & menu mobile pegawai)
  // yang benar-benar memproses keluar dari sesi.
  document.querySelectorAll('[data-logout]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmLogout = window.confirm('Keluar dari SIPIN?');
      if (!confirmLogout) return;

      const { supabase } = await import('../supabase.js');
      await supabase.auth.signOut();

      const inSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/pegawai/');
      window.location.href = inSubfolder ? '../login.html' : 'login.html';
    });
  });
});
