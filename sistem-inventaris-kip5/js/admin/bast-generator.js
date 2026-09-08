// js/admin/bast-generator.js
//
// INI BUKAN SURAT YANG DIGAMBAR ULANG DENGAN HTML/CSS.
// Modul ini mengambil templates/bast-template.docx (file Word ASLI hasil
// revisi/ACC pembimbing lapangan, sudah disisipi placeholder {{...}}),
// mengisi placeholder-nya dengan data transaksi, lalu menghasilkan file
// .docx baru untuk diunduh. Layout, font (Arial), margin, kop surat
// (di header Word, bukan body), posisi tanda tangan — semuanya tetap
// format Word asli, karena yang diproses adalah dokumen aslinya sendiri.
//
// Library yang dipakai — PizZip (buka file .docx sebagai arsip zip) dan
// Docxtemplater (mesin pengisi placeholder) — di-vendor lokal di /vendor
// (lihat <script> di admin/peminjaman.html dan admin/bast.html), bukan
// lewat CDN, supaya tidak butuh koneksi luar.
//
// PENTING: import ke supabase.js SENGAJA tidak diletakkan di level atas
// file ini, tapi dynamic import di dalam cetakBastDariTransaksi() saja.
// Ini supaya cetakBastDemo() tetap bisa jalan walau Supabase belum
// dikonfigurasi/tidak bisa diakses — kalau supabase.js diimpor statis
// di atas dan gagal dimuat, SELURUH modul ini ikut gagal dimuat.

import { tanggalKeTerbilang, angkaKeTerbilang, kapital } from './terbilang.js';

const TEMPLATE_PATH = '../templates/bast-template.docx';

/**
 * Inti proses: terima data yang SUDAH lengkap (semua placeholder terisi),
 * isi ke template docx asli, lalu trigger unduhan .docx.
 */
async function renderDanUnduh(data, namaFile) {
  if (!window.PizZip || !window.docxtemplater) {
    window.showToast?.('Library pengisi dokumen belum termuat. Muat ulang halaman.', 'error');
    console.error('PizZip / docxtemplater tidak ditemukan di window. Cek tag <script> vendor.');
    return;
  }

  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) {
    window.showToast?.('Template BAST tidak ditemukan di templates/bast-template.docx', 'error');
    return;
  }
  const templateBuffer = await response.arrayBuffer();

  const zip = new window.PizZip(templateBuffer);
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });

  try {
    doc.render(data);
  } catch (err) {
    console.error('Gagal mengisi template BAST:', err, err?.properties?.errors);
    window.showToast?.('Gagal mengisi template BAST — cek console untuk detail.', 'error');
    return;
  }

  const outBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(outBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  window.showToast?.('BAST berhasil dibuat dan diunduh (.docx).', 'success');
}

/**
 * Susun {{deskripsi_barang}} — potongan kalimat "3 (tiga) unit Laptop".
 * Dikelompokkan berdasarkan `nama_barang` (kategori umum, mis. "Laptop"),
 * BUKAN nama lengkap+merk — persis seperti contoh dari pembimbing: 3 unit
 * laptop dengan merk berbeda (HP, ASUS, Zyrex) tetap ditulis "3 (tiga)
 * unit Laptop" di kalimat pembuka, walau di tabel tetap dirinci per merk.
 *
 * Kalau dalam satu transaksi ada lebih dari satu KATEGORI barang berbeda
 * (mis. Laptop + Kursi sekaligus), template resmi belum pernah menulis
 * kalimat untuk kasus itu — dipakai fallback generik di bawah, tapi
 * sebaiknya dikonfirmasi lagi ke pembimbing kalau kasus ini benar-benar
 * terjadi.
 */
function susunDeskripsiBarang(items) {
  const jenisUnik = new Set(items.map((i) => i.nama_barang));
  if (jenisUnik.size === 1) {
    const jumlah = items.reduce((sum, i) => sum + i.jumlah, 0);
    return `${jumlah} (${kapital(angkaKeTerbilang(jumlah))}) unit ${items[0].nama_barang}`;
  }
  const totalUnit = items.reduce((sum, i) => sum + i.jumlah, 0);
  return `${totalUnit} (${kapital(angkaKeTerbilang(totalUnit))}) unit barang sebagaimana rincian di bawah`;
}

/**
 * ALUR NYATA: ambil data transaksi dari Supabase berdasarkan ID peminjaman,
 * lalu buat BAST. Dipanggil tombol "Cetak BAST" setelah backend Supabase aktif.
 *
 * {{tujuan}} diambil dari peminjaman.keperluan — kalimat bebas yang diisi
 * Admin saat mencatat transaksi (mis. "sebagai operasional kedinasan pada
 * KIP Kabupaten Aceh Tamiang pasca banjir tahun 2025"). Beda dari versi
 * sebelumnya, sekarang kalimat ini IKUT TERCETAK di BAST, jadi Admin perlu
 * mengisinya dengan kalimat resmi yang pantas, bukan catatan singkat.
 */
export async function cetakBastDariTransaksi(peminjamanId) {
  const { supabase } = await import('../supabase.js');

  const { data: p, error } = await supabase
    .from('peminjaman')
    .select(`
      id, nomor_bast, tanggal_pinjam, keperluan,
      pegawai:profiles!peminjaman_pegawai_id_fkey ( nama, nip, jabatan, alamat ),
      detail_peminjaman (
        jumlah, kondisi_saat_pinjam,
        inventaris ( nama_barang, merk, spesifikasi, tahun_perolehan, charger )
      )
    `)
    .eq('id', peminjamanId)
    .single();

  if (error || !p) {
    console.error(error);
    window.showToast?.('Transaksi tidak ditemukan.', 'error');
    return;
  }

  const { data: setting, error: settingError } = await supabase
    .from('pengaturan_bast')
    .select('*')
    .eq('id', 1)
    .single();

  if (settingError || !setting) {
    window.showToast?.('Pengaturan BAST (Pihak Pertama/Mengetahui) belum diisi.', 'error');
    return;
  }

  const { hari, tanggal_terbilang, bulan_terbilang, tahun_terbilang } = tanggalKeTerbilang(p.tanggal_pinjam);

  const items = p.detail_peminjaman.map((d) => ({
    nama_barang: d.inventaris.nama_barang,
    jumlah: d.jumlah,
    merk: d.inventaris.merk,
    spesifikasi: d.inventaris.spesifikasi,
    tahun_perolehan: d.inventaris.tahun_perolehan,
    charger: d.inventaris.charger,
  }));

  const barang = items.map((it, i) => ({
    no: i + 1,
    nama_barang_merk: [it.nama_barang, it.merk].filter(Boolean).join(' '),
    spesifikasi: it.spesifikasi || '-',
    perolehan: it.tahun_perolehan ? `Tahun ${it.tahun_perolehan}` : '-',
    charger: it.charger || '-',
  }));

  const data = {
    telepon: setting.telepon,
    email: setting.email,
    nomor_bast: p.nomor_bast,
    hari, tanggal_terbilang, bulan_terbilang, tahun_terbilang,
    nama_pihak_pertama: setting.p1_nama,
    jabatan_pihak_pertama: setting.p1_jabatan,
    alamat_pihak_pertama: setting.p1_alamat,
    nip_pihak_pertama: setting.p1_nip,
    nama_pihak_kedua: p.pegawai.nama,
    jabatan_pihak_kedua: p.pegawai.jabatan,
    alamat_pihak_kedua: p.pegawai.alamat,
    nip_pihak_kedua: p.pegawai.nip,
    deskripsi_barang: susunDeskripsiBarang(items),
    tujuan: p.keperluan || '',
    kondisi_barang: p.detail_peminjaman[0]?.kondisi_saat_pinjam || 'baik (hidup)',
    jabatan_pengesah_1: setting.p3_jabatan_1,
    jabatan_pengesah_2: setting.p3_jabatan_2,
    nama_pengesah: setting.p3_nama,
    nip_pengesah: setting.p3_nip,
    barang,
  };

  await renderDanUnduh(data, `BAST_${p.nomor_bast.replace(/\//g, '-')}.docx`);
}

/**
 * ALUR DEMO: dipakai selama Supabase belum tersambung — data contoh persis
 * seperti contoh BAST yang sudah di-ACC pembimbing (3 unit laptop, Fakhruddin
 * ke Hendri, pasca banjir 2025).
 */
export async function cetakBastDemo() {
  const data = {
    telepon: '(0641) 333356, 333358',
    email: 'acehtamiangkpu@gmail.com',
    nomor_bast: '045/RT.01.2-BAST/1116/1/2026',
    hari: 'selasa',
    tanggal_terbilang: 'empat belas',
    bulan_terbilang: 'juli',
    tahun_terbilang: 'dua ribu dua puluh enam',
    nama_pihak_pertama: 'Fakhruddin',
    jabatan_pihak_pertama: 'Kasubbag Keuangan, Umum, dan Logistik pada Sekretariat KIP Kabupaten Aceh Tamiang',
    alamat_pihak_pertama: 'Komisi Independen Pemilihan Kabupaten Aceh Tamiang',
    nip_pihak_pertama: '198602172010121003',
    nama_pihak_kedua: 'Hendri',
    jabatan_pihak_kedua: 'Pengurus/Pengelola Barang pada Sekretariat KIP Aceh',
    alamat_pihak_kedua: 'Komisi Independen Pemilihan Aceh',
    nip_pihak_kedua: '198209132010011012',
    deskripsi_barang: '3 (tiga) unit Laptop',
    tujuan: 'sebagai operasional kedinasan pada KIP Kabupaten Aceh Tamiang pasca banjir tahun 2025',
    kondisi_barang: 'baik (hidup)',
    jabatan_pengesah_1: 'Sekretaris KIP Aceh Tamiang',
    jabatan_pengesah_2: 'Selaku Kuasa Pengguna Anggaran',
    nama_pengesah: 'Achmad Yuhardha',
    nip_pengesah: '197406031993111001',
    barang: [
      { no: 1, nama_barang_merk: 'Laptop HP 14s-cf2xxxF.69', spesifikasi: 'Intel Core i7-10510U RAM 8 GB', perolehan: 'Tahun 2019', charger: 'Ada' },
      { no: 2, nama_barang_merk: 'Laptop ASUS P1412CEA.208', spesifikasi: 'Gen Intel Core i7-1165G7 RAM 8 GB', perolehan: 'Tahun 2022', charger: 'Ada' },
      { no: 3, nama_barang_merk: 'Laptop Zyrex Cruiser 20V1.3', spesifikasi: 'Gen Intel Core i7-1165G7 RAM 8 GB', perolehan: 'Tahun 2022', charger: 'Ada' },
    ],
  };

  await renderDanUnduh(data, `BAST_${data.nomor_bast.replace(/\//g, '-')}.docx`);
}
