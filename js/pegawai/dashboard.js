// pegawai/dashboard.js — Dashboard Pegawai
// "Barang Tersedia" ditampilkan dengan pagination.
// "Sedang Saya Pinjam" tetap menampilkan pinjaman pegawai yang login.

import { supabase, getCurrentProfile } from '../supabase.js';

const PAGE_SIZE_TERSEDIA = 5;

let semuaBarangTersedia = [];
let halamanTersedia = 1;

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


/* =========================================================
   BARANG TERSEDIA — PAGINATION
   ========================================================= */

function renderBarangTersedia() {
  const tabel = document.getElementById('tabel-tersedia');
  const footerText = document.getElementById('footer-tersedia-text');
  const btnPrev = document.getElementById('btn-prev-tersedia');
  const btnNext = document.getElementById('btn-next-tersedia');

  if (!tabel) return;

  const totalData = semuaBarangTersedia.length;

  if (totalData === 0) {
    tabel.innerHTML = `
      <tr>
        <td
          colspan="2"
          class="muted"
          style="text-align:center; padding:1rem;"
        >
          Belum ada barang tersedia.
        </td>
      </tr>
    `;

    if (footerText) {
      footerText.textContent = 'Menampilkan 0 dari 0 barang';
    }

    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;

    return;
  }

  const totalHalaman = Math.ceil(totalData / PAGE_SIZE_TERSEDIA);

  if (halamanTersedia > totalHalaman) {
    halamanTersedia = totalHalaman;
  }

  if (halamanTersedia < 1) {
    halamanTersedia = 1;
  }

  const mulai = (halamanTersedia - 1) * PAGE_SIZE_TERSEDIA;
  const akhir = mulai + PAGE_SIZE_TERSEDIA;

  const dataHalaman = semuaBarangTersedia.slice(mulai, akhir);

  tabel.innerHTML = dataHalaman
    .map((i) => `
      <tr>
        <td class="strong">
          ${escapeHtml(i.nama_barang)}
          ${i.merk ? ' ' + escapeHtml(i.merk) : ''}
        </td>

        <td>
          ${i.tersedia}
        </td>
      </tr>
    `)
    .join('');

  const tampilMulai = mulai + 1;
  const tampilAkhir = Math.min(akhir, totalData);

  if (footerText) {
    footerText.textContent =
      `Menampilkan ${tampilMulai}–${tampilAkhir} dari ${totalData} barang`;
  }

  if (btnPrev) {
    btnPrev.disabled = halamanTersedia <= 1;
  }

  if (btnNext) {
    btnNext.disabled = halamanTersedia >= totalHalaman;
  }
}


function setupPaginationTersedia() {
  const btnPrev = document.getElementById('btn-prev-tersedia');
  const btnNext = document.getElementById('btn-next-tersedia');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (halamanTersedia > 1) {
        halamanTersedia--;
        renderBarangTersedia();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const totalHalaman = Math.ceil(
        semuaBarangTersedia.length / PAGE_SIZE_TERSEDIA
      );

      if (halamanTersedia < totalHalaman) {
        halamanTersedia++;
        renderBarangTersedia();
      }
    });
  }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function muatDashboard() {

  const profile = await getCurrentProfile();

  if (profile) {
    document.getElementById('teks-sambutan').textContent =
      `Selamat datang, ${profile.nama}`;
  }


  /* =======================================================
     DATA INVENTARIS
     ======================================================= */

  const { data: inv, error: errorInventaris } = await supabase
    .from('inventaris')
    .select('nama_barang, merk, total, tersedia')
    .order('nama_barang');


  if (errorInventaris) {
    console.error('Gagal memuat inventaris:', errorInventaris);

    semuaBarangTersedia = [];
    renderBarangTersedia();
  } else {

    const dataInventaris = inv || [];

    const totalInventaris = dataInventaris.reduce(
      (s, i) => s + Number(i.total || 0),
      0
    );

    const totalTersedia = dataInventaris.reduce(
      (s, i) => s + Number(i.tersedia || 0),
      0
    );

    document.getElementById('stat-total').textContent =
      totalInventaris;

    document.getElementById('stat-tersedia').textContent =
      totalTersedia;

    document.getElementById('stat-dipinjam').textContent =
      totalInventaris - totalTersedia;


    // Hanya barang yang tersedia > 0
    semuaBarangTersedia = dataInventaris.filter(
      (i) => Number(i.tersedia || 0) > 0
    );

    // Pastikan urutan berdasarkan nama barang
    semuaBarangTersedia.sort((a, b) =>
      String(a.nama_barang || '').localeCompare(
        String(b.nama_barang || ''),
        'id',
        { sensitivity: 'base' }
      )
    );

    halamanTersedia = 1;

    renderBarangTersedia();
  }


  /* =======================================================
     PINJAMAN SAYA
     ======================================================= */

  const {
    data: pinjaman,
    error
  } = await supabase
    .from('peminjaman')
    .select(`
      nomor_bast,
      detail_peminjaman (
        jumlah,
        inventaris (
          nama_barang,
          merk
        )
      )
    `)
    .eq('status', 'dipinjam')
    .order('created_at', { ascending: false });


  const tabelPinjaman =
    document.getElementById('tabel-pinjaman-saya');


  if (error) {

    console.error(error);

    tabelPinjaman.innerHTML = `
      <tr>
        <td
          colspan="3"
          class="muted"
          style="text-align:center; padding:1rem;"
        >
          Gagal memuat data.
        </td>
      </tr>
    `;

    return;
  }


  const baris = [];

  (pinjaman || []).forEach((p) => {

    (p.detail_peminjaman || []).forEach((d) => {

      if (!d.inventaris) return;

      baris.push({
        nama:
          `${d.inventaris.nama_barang}${
            d.inventaris.merk
              ? ' ' + d.inventaris.merk
              : ''
          }`,

        jumlah: d.jumlah,

        nomor: p.nomor_bast
      });

    });

  });


  tabelPinjaman.innerHTML = baris.length === 0

    ? `
      <tr>
        <td
          colspan="3"
          class="muted"
          style="text-align:center; padding:1rem;"
        >
          Tidak ada barang yang sedang dipinjam.
        </td>
      </tr>
    `

    : baris
        .map(
          (b) => `
            <tr>
              <td class="strong">
                ${escapeHtml(b.nama)}
              </td>

              <td>
                ${b.jumlah}
              </td>

              <td class="muted nowrap">
                ${escapeHtml(b.nomor)}
              </td>
            </tr>
          `
        )
        .join('');
}


/* =========================================================
   JALANKAN
   ========================================================= */

setupPaginationTersedia();
muatDashboard();