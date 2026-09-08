// admin/pengaturan-bast.js — memuat & menyimpan data tetap (Pihak Pertama,
// Mengetahui/Menyetujui, kop surat) di tabel `pengaturan_bast` (selalu 1 baris, id=1).
// Data ini yang dipakai js/admin/bast-generator.js saat mengisi template BAST.

import { supabase } from '../supabase.js';

async function muatPengaturan() {
  const { data, error } = await supabase.from('pengaturan_bast').select('*').eq('id', 1).single();

  if (error || !data) {
    console.error(error);
    window.showToast?.('Gagal memuat pengaturan BAST.', 'error');
    return;
  }

  document.getElementById('f-p1-nama').value = data.p1_nama || '';
  document.getElementById('f-p1-nip').value = data.p1_nip || '';
  document.getElementById('f-p1-jabatan').value = data.p1_jabatan || '';
  document.getElementById('f-p1-alamat').value = data.p1_alamat || '';

  document.getElementById('f-p3-nama').value = data.p3_nama || '';
  document.getElementById('f-p3-nip').value = data.p3_nip || '';
  document.getElementById('f-p3-jabatan1').value = data.p3_jabatan_1 || '';
  document.getElementById('f-p3-jabatan2').value = data.p3_jabatan_2 || '';

  document.getElementById('f-telepon').value = data.telepon || '';
  document.getElementById('f-email').value = data.email || '';
}

async function simpan(btn, payload) {
  btn.disabled = true;
  const asal = btn.textContent;
  btn.textContent = 'Menyimpan…';

  const { error } = await supabase.from('pengaturan_bast').update(payload).eq('id', 1);

  btn.disabled = false;
  btn.textContent = asal;

  if (error) {
    console.error(error);
    window.showToast?.('Gagal menyimpan.', 'error');
    return;
  }
  window.showToast?.('Pengaturan tersimpan.', 'success');
}

document.getElementById('btn-simpan-p1').addEventListener('click', (e) => {
  simpan(e.target, {
    p1_nama: document.getElementById('f-p1-nama').value.trim(),
    p1_nip: document.getElementById('f-p1-nip').value.trim(),
    p1_jabatan: document.getElementById('f-p1-jabatan').value.trim(),
    p1_alamat: document.getElementById('f-p1-alamat').value.trim(),
  });
});

document.getElementById('btn-simpan-p3').addEventListener('click', (e) => {
  simpan(e.target, {
    p3_nama: document.getElementById('f-p3-nama').value.trim(),
    p3_nip: document.getElementById('f-p3-nip').value.trim(),
    p3_jabatan_1: document.getElementById('f-p3-jabatan1').value.trim(),
    p3_jabatan_2: document.getElementById('f-p3-jabatan2').value.trim(),
  });
});

document.getElementById('btn-simpan-kop').addEventListener('click', (e) => {
  simpan(e.target, {
    telepon: document.getElementById('f-telepon').value.trim(),
    email: document.getElementById('f-email').value.trim(),
  });
});

muatPengaturan();
