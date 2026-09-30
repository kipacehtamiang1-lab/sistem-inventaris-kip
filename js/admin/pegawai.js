import { supabase } from '../supabase.js';

const DELETE_ICON = `
<svg viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="1.8"
     width="16"
     height="16">
  <path d="M4 7h16"/>
  <path d="M10 11v6M14 11v6"/>
  <path d="M6 7l1 13h10l1-13"/>
  <path d="M9 7V4h6v3"/>
</svg>`;

const EDIT_ICON = `
<svg viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="1.8"
     width="16"
     height="16">
  <path d="M12 20h9"/>
  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
</svg>`;


/* =========================================================
   DATA
========================================================= */

let semuaPegawaiAktif = [];
let semuaPegawaiPending = [];


/* =========================================================
   HELPER
========================================================= */

function escapeHtml(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}


function inisial(nama) {
  return (nama || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}


function formatTanggal(iso) {
  if (!iso) return '-';

  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}


/* =========================================================
   ELEMENT
========================================================= */

const cards = document.querySelectorAll('.card.table-card');

const pendingCard = cards[0];
const aktifCard = cards[1];

const pendingTbody = pendingCard?.querySelector('tbody');
const pendingTitle = pendingCard?.querySelector('h3');

const aktifTbody = document.querySelector('#tabel-pegawai tbody');
const aktifTitle = aktifCard?.querySelector('h3');

const editModal = document.getElementById('modal-edit-pegawai');

const searchInput = document.querySelector(
  '[data-table-search="tabel-pegawai"]'
);


/* =========================================================
   RENDER PENDING
========================================================= */

function renderPendingRow(p) {
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>
      <span class="avatar-sm">${inisial(p.nama)}</span>
      ${escapeHtml(p.nama)}
    </td>

    <td class="muted nowrap">
      ${escapeHtml(p.nip)}
    </td>

    <td>
      ${escapeHtml(p.jabatan)}
    </td>

    <td class="muted">
      ${escapeHtml(p.email)}
    </td>

    <td class="muted nowrap">
      ${formatTanggal(p.created_at)}
    </td>

    <td>
      <div class="row-actions">

        <button
          class="btn btn-gold btn-sm"
          data-confirm-id="${p.id}">
          Konfirmasi
        </button>

        <button
          class="btn btn-icon"
          title="Hapus pendaftaran"
          data-confirm-delete="modal-confirm-delete"
          data-delete-id="${p.id}"
          data-delete-label="pendaftaran ${escapeHtml(p.nama)}">
          ${DELETE_ICON}
        </button>

      </div>
    </td>
  `;

  return tr;
}


/* =========================================================
   RENDER AKTIF
========================================================= */

function renderAktifRow(p) {

  const editJson = JSON.stringify({
    nama: p.nama,
    nip: p.nip || '',
    jabatan: p.jabatan || '',
    email: p.email || ''
  }).replace(/"/g, '&quot;');

  const tr = document.createElement('tr');

  tr.dataset.nama = String(p.nama || '').toLowerCase();
  tr.dataset.nip = String(p.nip || '').toLowerCase();

  tr.innerHTML = `
    <td>
      <span class="avatar-sm">${inisial(p.nama)}</span>
      ${escapeHtml(p.nama)}
    </td>

    <td class="muted nowrap">
      ${escapeHtml(p.nip)}
    </td>

    <td>
      ${escapeHtml(p.jabatan)}
    </td>

    <td class="muted">
      ${escapeHtml(p.email)}
    </td>

    <td>
      <span class="badge badge-ok">Aktif</span>
    </td>

    <td>
      <div class="row-actions">

        <button
          class="btn btn-icon"
          title="Ubah data pegawai"
          data-edit='${editJson}'
          data-edit-id="${p.id}"
          data-modal-open="modal-edit-pegawai">
          ${EDIT_ICON}
        </button>

        <button
          class="btn btn-icon"
          title="Hapus pegawai"
          data-confirm-delete="modal-confirm-delete"
          data-delete-id="${p.id}"
          data-delete-label="${escapeHtml(p.nama)}">
          ${DELETE_ICON}
        </button>

      </div>
    </td>
  `;

  return tr;
}


/* =========================================================
   RENDER TABEL AKTIF
========================================================= */

function renderPegawaiAktif(data) {

  aktifTbody.innerHTML = '';

  if (!data.length) {

    aktifTbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="muted"
          style="text-align:center; padding:1.5rem;">
          Tidak ada pegawai yang sesuai.
        </td>
      </tr>
    `;

    updateFooter(0, 0);
    return;
  }

  data.forEach((p) => {
    aktifTbody.appendChild(
      renderAktifRow(p)
    );
  });

  updateFooter(data.length, semuaPegawaiAktif.length);
}


/* =========================================================
   FOOTER
========================================================= */

function updateFooter(ditampilkan, total) {

  const footerText = aktifCard?.querySelector('.table-foot span');

  if (!footerText) return;

  footerText.textContent =
    `Menampilkan ${ditampilkan} dari ${total} pegawai`;
}


/* =========================================================
   LOAD DATA
========================================================= */

async function muatSemua() {

  const [
    { data: pending, error: e1 },
    { data: aktif, error: e2 }
  ] = await Promise.all([

    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pending')
      .order('created_at', {
        ascending: true
      }),

    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pegawai')
      .order('nama', {
        ascending: true
      })

  ]);


  if (e1 || e2) {

    console.error(
      'Error memuat pegawai:',
      e1 || e2
    );

    window.showToast?.(
      'Gagal memuat data pegawai.',
      'error'
    );

    return;
  }


  semuaPegawaiPending = pending || [];
  semuaPegawaiAktif = aktif || [];


  /* ===============================
     PENDING
  =============================== */

  pendingTitle.textContent =
    `${semuaPegawaiPending.length} akun menunggu konfirmasi`;

  pendingTbody.innerHTML = '';

  if (semuaPegawaiPending.length === 0) {

    pendingTbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="muted"
          style="text-align:center; padding:1.5rem;">
          Tidak ada pendaftaran baru.
        </td>
      </tr>
    `;

  } else {

    semuaPegawaiPending.forEach((p) => {

      pendingTbody.appendChild(
        renderPendingRow(p)
      );

    });

  }


  /* ===============================
     AKTIF
  =============================== */

  aktifTitle.textContent =
    `${semuaPegawaiAktif.length} Pegawai Aktif`;

  renderPegawaiAktif(
    semuaPegawaiAktif
  );
}


/* =========================================================
   SEARCH PEGAWAI
========================================================= */

searchInput?.addEventListener('input', () => {

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();


  /* Jika kosong, tampilkan semua */

  if (!keyword) {

    renderPegawaiAktif(
      semuaPegawaiAktif
    );

    return;
  }


  const hasil = semuaPegawaiAktif.filter((p) => {

    const nama =
      String(p.nama || '')
        .toLowerCase();

    const nip =
      String(p.nip || '')
        .toLowerCase();

    const jabatan =
      String(p.jabatan || '')
        .toLowerCase();

    const email =
      String(p.email || '')
        .toLowerCase();


    return (
      nama.includes(keyword) ||
      nip.includes(keyword) ||
      jabatan.includes(keyword) ||
      email.includes(keyword)
    );

  });


  renderPegawaiAktif(hasil);
});


/* =========================================================
   KONFIRMASI AKUN PENDING
========================================================= */

pendingTbody?.addEventListener(
  'click',
  async (e) => {

    const btn =
      e.target.closest('[data-confirm-id]');

    if (!btn) return;


    const id =
      btn.getAttribute('data-confirm-id');

    if (!id) return;


    btn.disabled = true;
    btn.textContent = 'Memproses…';


    const { error } =
      await supabase
        .from('profiles')
        .update({
          role: 'pegawai'
        })
        .eq('id', id);


    if (error) {

      console.error(
        'Gagal konfirmasi:',
        error
      );

      window.showToast?.(
        'Gagal mengonfirmasi akun.',
        'error'
      );

      btn.disabled = false;
      btn.textContent = 'Konfirmasi';

      return;
    }


    window.showToast?.(
      'Akun pegawai berhasil dikonfirmasi.',
      'success'
    );


    await muatSemua();
  }
);


/* =========================================================
   EDIT PEGAWAI
========================================================= */

editModal?.addEventListener(
  'modal:submit',
  async (e) => {

    const {
      editId,
      submitBtn
    } = e.detail || {};


    if (!editId) return;


    const nama =
      document
        .getElementById('f-nama')
        ?.value
        .trim() || '';

    const nip =
      document
        .getElementById('f-nip')
        ?.value
        .trim() || '';

    const jabatan =
      document
        .getElementById('f-jabatan')
        ?.value
        .trim() || '';

    const email =
      document
        .getElementById('f-email')
        ?.value
        .trim() || '';


    if (!nama) {

      window.showToast?.(
        'Nama wajib diisi.',
        'error'
      );

      return;
    }


    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan…';
    }


    const { error } =
      await supabase
        .from('profiles')
        .update({
          nama,
          nip,
          jabatan,
          email
        })
        .eq('id', editId);


    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan Perubahan';
    }


    if (error) {

      console.error(
        'Gagal update pegawai:',
        error
      );

      window.showToast?.(
        'Gagal menyimpan perubahan.',
        'error'
      );

      return;
    }


    editModal.classList.remove('open');


    window.showToast?.(
      'Data pegawai berhasil diperbarui.',
      'success'
    );


    await muatSemua();
  }
);


/* =========================================================
   HAPUS PEGAWAI
========================================================= */

document
  .getElementById('modal-confirm-delete')
  ?.addEventListener(
    'confirm-delete:yes',
    async (e) => {

      const {
        id,
        row
      } = e.detail || {};


      if (!id) {

        console.error(
          'ID pegawai tidak ditemukan.'
        );

        window.showToast?.(
          'ID pegawai tidak ditemukan.',
          'error'
        );

        return;
      }


      const modal =
        document.getElementById(
          'modal-confirm-delete'
        );


      const confirmButton =
        modal?.querySelector(
          '[data-confirm-yes]'
        );


      if (confirmButton) {

        confirmButton.disabled = true;
        confirmButton.textContent =
          'Menghapus…';
      }


      /*
       * Cek apakah pegawai sudah mempunyai
       * riwayat peminjaman.
       *
       * Kita tidak boleh menghapus profiles
       * jika masih direferensikan oleh tabel
       * peminjaman.
       */

      const {
        count,
        error: cekError
      } = await supabase
        .from('peminjaman')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('pegawai_id', id);


      if (cekError) {

        console.error(
          'Gagal mengecek riwayat pegawai:',
          cekError
        );

        if (confirmButton) {
          confirmButton.disabled = false;
          confirmButton.textContent =
            'Ya, Hapus';
        }

        window.showToast?.(
          'Gagal mengecek riwayat transaksi pegawai.',
          'error'
        );

        return;
      }


      /*
       * Jika sudah punya transaksi,
       * jangan hapus karena akan merusak
       * hubungan dengan riwayat peminjaman.
       */

      if ((count || 0) > 0) {

        if (modal) {
          modal.classList.remove('open');
        }

        if (confirmButton) {
          confirmButton.disabled = false;
          confirmButton.textContent =
            'Ya, Hapus';
        }


        window.showToast?.(
          'Pegawai tidak dapat dihapus karena sudah memiliki riwayat peminjaman.',
          'error'
        );

        return;
      }


     

      const {
        error
      } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);


      if (confirmButton) {

        confirmButton.disabled = false;
        confirmButton.textContent =
          'Ya, Hapus';
      }


      if (error) {

        console.error(
          'Gagal menghapus pegawai:',
          error
        );

        if (modal) {
          modal.classList.remove('open');
        }

       

        let pesan =
          'Gagal menghapus data pegawai.';

        if (
          error.message &&
          error.message.includes('foreign key')
        ) {
          pesan =
            'Pegawai tidak dapat dihapus karena masih digunakan oleh data lain.';
        }


        window.showToast?.(
          pesan,
          'error'
        );

        return;
      }


      if (modal) {
        modal.classList.remove('open');
      }


      row?.remove();


      window.showToast?.(
        'Data pegawai berhasil dihapus.',
        'success'
      );


      

      await muatSemua();
    }
  );


/* =========================================================
   LOAD AWAL
========================================================= */

muatSemua();