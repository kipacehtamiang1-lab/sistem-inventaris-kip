// components/count-up.js — animasi angka menghitung naik untuk kartu
// statistik/tile di halaman Dashboard. Dipakai hanya di admin/dashboard.html
// dan pegawai/dashboard.html.
//
// Cara pakai: tambahkan atribut data-count="184" pada elemen .value,
// skrip ini otomatis menghitung dari 0 sampai 184 saat halaman dimuat.
// Elemen .value yang TIDAK punya data-count dibiarkan apa adanya (mis.
// kartu yang isinya bukan angka murni).

document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('[data-count]');

  targets.forEach((el) => {
    const end = parseInt(el.getAttribute('data-count'), 10);
    if (Number.isNaN(end)) return;

    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic biar melambat di akhir, terasa lebih halus
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * end);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
});
