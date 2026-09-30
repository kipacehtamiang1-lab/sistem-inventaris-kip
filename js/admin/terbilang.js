const NAMA_HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const NAMA_BULAN = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
const BELASAN = [
  'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas',
  'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas',
];
const PULUHAN = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

/** Angka -> tulisan Indonesia (mendukung sampai jutaan, cukup untuk tanggal/tahun). */
export function angkaKeTerbilang(n) {
  n = Math.floor(n);
  if (n < 0) return 'minus ' + angkaKeTerbilang(-n);
  if (n < 10) return SATUAN[n];
  if (n < 20) return BELASAN[n - 10];
  if (n < 100) {
    const p = Math.floor(n / 10), s = n % 10;
    return (PULUHAN[p] + (s ? ' ' + SATUAN[s] : '')).trim();
  }
  if (n < 200) return ('seratus' + (n % 100 ? ' ' + angkaKeTerbilang(n % 100) : '')).trim();
  if (n < 1000) {
    const r = Math.floor(n / 100), s = n % 100;
    return (SATUAN[r] + ' ratus' + (s ? ' ' + angkaKeTerbilang(s) : '')).trim();
  }
  if (n < 2000) return ('seribu' + (n % 1000 ? ' ' + angkaKeTerbilang(n % 1000) : '')).trim();
  if (n < 1000000) {
    const r = Math.floor(n / 1000), s = n % 1000;
    return (angkaKeTerbilang(r) + ' ribu' + (s ? ' ' + angkaKeTerbilang(s) : '')).trim();
  }
  const r = Math.floor(n / 1000000), s = n % 1000000;
  return (angkaKeTerbilang(r) + ' juta' + (s ? ' ' + angkaKeTerbilang(s) : '')).trim();
}

/** Huruf pertama kapital — dipakai untuk "(Tiga)", "(Satu)" dst pada deskripsi barang. */
export function kapital(kata) {
  return kata.charAt(0).toUpperCase() + kata.slice(1);
}

/**
 * dateInput: objek Date atau string 'YYYY-MM-DD' (kolom tanggal_pinjam dari Supabase).
 * Selalu ambil tanggal transaksi peminjaman — JANGAN tanggal hari ini sistem dibuka.
 */
export function tanggalKeTerbilang(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput + 'T00:00:00');
  return {
    hari: NAMA_HARI[d.getDay()],
    tanggal_terbilang: angkaKeTerbilang(d.getDate()),
    bulan_terbilang: NAMA_BULAN[d.getMonth()],
    tahun_terbilang: angkaKeTerbilang(d.getFullYear()),
  };
}
