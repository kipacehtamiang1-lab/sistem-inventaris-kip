// components/modal.js

document.addEventListener('DOMContentLoaded', () => {

  // Buka modal — menggunakan event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-open]');
    if (!btn) return;

    const modal = document.getElementById(
      btn.getAttribute('data-modal-open')
    );

    if (!modal) return;

    const editData = btn.getAttribute('data-edit');
    const titleEl = modal.querySelector('[data-modal-title]');
    const submitBtn = modal.querySelector('[data-modal-submit]');

    if (editData) {
      // Mode Edit
      try {
        const values = JSON.parse(
          editData.replace(/&quot;/g, '"')
        );

        Object.entries(values).forEach(([key, val]) => {
          const input = modal.querySelector(`#f-${key}`);
          if (input) input.value = val;
        });

      } catch (err) {
        console.error('Gagal membaca data-edit:', err);
      }

      modal.dataset.editId =
        btn.getAttribute('data-edit-id') || '';

      if (titleEl) {
        titleEl.textContent = titleEl.textContent.replace(
          'Tambah',
          'Ubah'
        );
      }

      if (submitBtn) {
        submitBtn.textContent = 'Simpan Perubahan';
      }

    } else {
      // Mode Tambah
      modal.querySelectorAll(
        '.modal-body input, .modal-body textarea, .modal-body select'
      ).forEach((el) => {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      });

      delete modal.dataset.editId;

      if (titleEl) {
        titleEl.textContent = titleEl.textContent.replace(
          'Ubah',
          'Tambah'
        );
      }

      if (submitBtn) {
        submitBtn.textContent =
          submitBtn.dataset.addLabel ||
          'Simpan Barang';
      }
    }

    modal.classList.add('open');
  });


  // Tombol tutup modal
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-close]');
    if (!btn) return;

    btn.closest('.modal-overlay')?.classList.remove('open');
  });


  // Tombol Simpan
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-submit]');
    if (!btn) return;

    const modal = btn.closest('.modal-overlay');
    if (!modal) return;

    modal.dispatchEvent(
      new CustomEvent('modal:submit', {
        detail: {
          editId: modal.dataset.editId || null,
          submitBtn: btn
        }
      })
    );
  });


  // Klik luar modal
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });


  // Tombol Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document
        .querySelectorAll('.modal-overlay.open')
        .forEach((m) => m.classList.remove('open'));
    }
  });

});