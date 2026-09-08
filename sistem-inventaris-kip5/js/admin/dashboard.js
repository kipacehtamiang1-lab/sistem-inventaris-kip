// admin/dashboard.js
// Mengambil statistik dashboard langsung dari Supabase

import { supabase } from '../supabase.js';


// ========================================
// HELPER
// ========================================

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
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

  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
}


// ========================================
// FUNGSI UTAMA DASHBOARD
// ========================================

async function muatDashboard() {

  console.log('Memuat data dashboard...');

  try {

    // ========================================
    // 1. AMBIL DATA INVENTARIS
    // ========================================

    const invRes = await supabase
      .from('inventaris')
      .select('total, tersedia');

    if (invRes.error) {
      console.error('ERROR INVENTARIS:', invRes.error);
    }

    console.log('Data inventaris:', invRes.data);


    // ========================================
    // 2. AMBIL JUMLAH PEGAWAI AKTIF
    // ========================================

    const pegawaiAktifRes = await supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('role', 'pegawai');

    if (pegawaiAktifRes.error) {
      console.error(
        'ERROR PEGAWAI AKTIF:',
        pegawaiAktifRes.error
      );
    }

    console.log(
      'Jumlah pegawai:',
      pegawaiAktifRes.count
    );


    // ========================================
    // 3. AMBIL JUMLAH AKUN PENDING
    // ========================================

    const pendingRes = await supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('role', 'pending');

    if (pendingRes.error) {
      console.error(
        'ERROR PENDING:',
        pendingRes.error
      );
    }

    console.log(
      'Jumlah pending:',
      pendingRes.count
    );


    // ========================================
    // 4. AMBIL DATA PEMINJAMAN TERBARU
    // ========================================

    const peminjamanRes = await supabase
      .from('peminjaman')
      .select(`
        id,
        tanggal_pinjam,
        status,

        pegawai:profiles!peminjaman_pegawai_id_fkey (
          nama
        ),

        detail_peminjaman (
          inventaris (
            nama_barang
          )
        )
      `)
      .order('created_at', {
        ascending: false
      })
      .limit(5);


    if (peminjamanRes.error) {
      console.error(
        'ERROR PEMINJAMAN:',
        peminjamanRes.error
      );
    }

    console.log(
      'Data peminjaman:',
      peminjamanRes.data
    );


    // ========================================
    // CEK DATA INVENTARIS
    // ========================================

    const inventaris = invRes.data || [];

    let totalInventaris = 0;
    let totalTersedia = 0;


    inventaris.forEach((item) => {

      totalInventaris += Number(item.total || 0);

      totalTersedia += Number(item.tersedia || 0);

    });


    // Barang yang sedang dipinjam
    const totalDipinjam =
      totalInventaris - totalTersedia;


    // ========================================
    // DATA PEGAWAI
    // ========================================

    const jumlahPegawai =
      pegawaiAktifRes.count || 0;


    // ========================================
    // DATA PENDING
    // ========================================

    const jumlahPending =
      pendingRes.count || 0;


    // ========================================
    // DATA PEMINJAMAN
    // ========================================

    const transaksi =
      peminjamanRes.data || [];


    const transaksiAktif =
      transaksi.filter(
        (t) => t.status !== 'dikembalikan'
      ).length;


    // ========================================
    // DEBUG
    // ========================================

    console.log('==============================');
    console.log('STATISTIK DASHBOARD');
    console.log('Total inventaris:', totalInventaris);
    console.log('Barang tersedia:', totalTersedia);
    console.log('Sedang dipinjam:', totalDipinjam);
    console.log('Total pegawai:', jumlahPegawai);
    console.log('Pending:', jumlahPending);
    console.log('Transaksi aktif:', transaksiAktif);
    console.log('==============================');


    // ========================================
    // 5. TAMPILKAN KE CARD
    // ========================================

    const statTotal =
      document.getElementById(
        'stat-total-inventaris'
      );

    const statTersedia =
      document.getElementById(
        'stat-tersedia'
      );

    const statDipinjam =
      document.getElementById(
        'stat-dipinjam'
      );

    const statPegawai =
      document.getElementById(
        'stat-pegawai'
      );

    const deltaTransaksi =
      document.getElementById(
        'delta-transaksi-aktif'
      );

    const deltaPending =
      document.getElementById(
        'delta-pending'
      );

    const teksPending =
      document.getElementById(
        'teks-pending-konfirmasi'
      );


    // ========================================
    // MASUKKAN ANGKA
    // ========================================

    if (statTotal) {
      statTotal.textContent =
        totalInventaris;
    }

    if (statTersedia) {
      statTersedia.textContent =
        totalTersedia;
    }

    if (statDipinjam) {
      statDipinjam.textContent =
        totalDipinjam;
    }

    if (statPegawai) {
      statPegawai.textContent =
        jumlahPegawai;
    }

    if (deltaTransaksi) {
      deltaTransaksi.textContent =
        `Dari ${transaksiAktif} transaksi aktif`;
    }

    if (deltaPending) {
      deltaPending.textContent =
        `${jumlahPending} menunggu konfirmasi`;
    }

    if (teksPending) {
      teksPending.textContent =
        `${jumlahPending} akun Pegawai menunggu konfirmasi`;
    }


    // ========================================
    // 6. TABEL TRANSAKSI TERBARU
    // ========================================

    const tbody =
      document.getElementById(
        'tabel-transaksi-terbaru'
      );


    if (tbody) {

      if (transaksi.length === 0) {

        tbody.innerHTML = `
          <tr>
            <td
              colspan="4"
              class="muted"
              style="
                text-align:center;
                padding:1.5rem;
              "
            >
              Belum ada transaksi.
            </td>
          </tr>
        `;

      } else {

        tbody.innerHTML =
          transaksi.map((t) => {

            const barang =
              (t.detail_peminjaman || [])
                .map(
                  (d) =>
                    d.inventaris?.nama_barang || '-'
                )
                .join(', ');


            const badge =
              t.status === 'dikembalikan'

                ? `
                  <span class="badge badge-ok">
                    Dikembalikan
                  </span>
                `

                : `
                  <span class="badge badge-info">
                    Dipinjam
                  </span>
                `;


            return `
              <tr>

                <td>
                  <span class="avatar-sm">
                    ${inisial(t.pegawai?.nama)}
                  </span>

                  ${escapeHtml(
                    t.pegawai?.nama || '-'
                  )}
                </td>

                <td class="strong">
                  ${escapeHtml(barang)}
                </td>

                <td class="muted nowrap">
                  ${formatTanggal(
                    t.tanggal_pinjam
                  )}
                </td>

                <td>
                  ${badge}
                </td>

              </tr>
            `;

          }).join('');
      }
    }


    // ========================================
    // 7. BARANG BERMASALAH
    // ========================================
    // SEKARANG MENGAMBIL DATA DARI
    // UNIT_INVENTARIS (KONDISI TERKINI)
    //
    // BUKAN dari:
    // detail_peminjaman.kondisi_saat_kembali
    //
    // Jadi kerusakan lama tidak akan muncul lagi
    // kalau unit tersebut sudah diperbaiki.
    // ========================================

    const unitRes =
      await supabase
        .from('unit_inventaris')
        .select(`
          id,
          kondisi,
          status,
          inventaris (
            nama_barang
          )
        `);


    if (unitRes.error) {

      console.error(
        'ERROR UNIT INVENTARIS:',
        unitRes.error
      );

    }


    const semuaUnit =
      unitRes.data || [];


    // ========================================
    // CARI UNIT YANG SAAT INI BERMASALAH
    // ========================================

    const unitBermasalah =
      semuaUnit.filter((unit) => {

        return (
          unit.status === 'rusak' ||
          unit.status === 'hilang' ||
          unit.kondisi === 'rusak' ||
          unit.kondisi === 'hilang' ||
          unit.kondisi === 'tidak_lengkap'
        );

      });


    // ========================================
    // KELOMPOKKAN BERDASARKAN NAMA BARANG
    // ========================================

    const kelompokBermasalah = {};


    unitBermasalah.forEach((unit) => {

      const namaBarang =
        unit.inventaris?.nama_barang || '-';


      if (!kelompokBermasalah[namaBarang]) {

        kelompokBermasalah[namaBarang] = {
          baik: 0,
          rusak: 0,
          hilang: 0,
          tidak_lengkap: 0
        };

      }


      // Tentukan kondisi berdasarkan
      // kondisi fisik terbaru.
      //
      // Jika kondisi kosong tetapi status rusak/hilang,
      // tetap dihitung sesuai status.

      if (
        unit.kondisi === 'rusak' ||
        unit.status === 'rusak'
      ) {

        kelompokBermasalah[namaBarang].rusak++;

      } else if (
        unit.kondisi === 'hilang' ||
        unit.status === 'hilang'
      ) {

        kelompokBermasalah[namaBarang].hilang++;

      } else if (
        unit.kondisi === 'tidak_lengkap'
      ) {

        kelompokBermasalah[namaBarang]
          .tidak_lengkap++;

      }

    });


    // ========================================
    // AMBIL BARANG BERMASALAH PERTAMA
    // ========================================

    const daftarBermasalah =
      Object.entries(kelompokBermasalah);


    const blok =
      document.getElementById(
        'blok-barang-bermasalah'
      );


    if (blok) {

      if (daftarBermasalah.length > 0) {

        const [
          namaBarang,
          jumlahKondisi
        ] = daftarBermasalah[0];


        // ========================================
        // BUAT TEKS KONDISI
        // ========================================

        const kondisiText = [];


        if (jumlahKondisi.rusak > 0) {

          kondisiText.push(
            `Rusak: ${jumlahKondisi.rusak}`
          );

        }


        if (jumlahKondisi.hilang > 0) {

          kondisiText.push(
            `Hilang: ${jumlahKondisi.hilang}`
          );

        }


        if (jumlahKondisi.tidak_lengkap > 0) {

          kondisiText.push(
            `Tidak Lengkap: ${jumlahKondisi.tidak_lengkap}`
          );

        }


        const teksKondisi =
          kondisiText.join('; ');


        // ========================================
        // TAMPILKAN KE DASHBOARD
        // ========================================

        blok.innerHTML = `
          <div
            style="
              display:flex;
              gap:.9rem;
              padding:.8rem 0;
            "
          >

            <div
              class="icon-badge"
              style="
                background:var(--bad-bg);
                color:var(--bad-fg);
                flex-shrink:0;
              "
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                width="18"
                height="18"
              >
                <path d="M4 4h11l5 5v11H4z"/>
                <path d="M15 4v5h5"/>
              </svg>

            </div>

            <div>

              <p
                style="
                  font-weight:700;
                  font-size:.88rem;
                "
              >
                ${escapeHtml(
                  namaBarang
                )}
                —
                ${escapeHtml(
                  teksKondisi
                )}
              </p>

              <p
                style="
                  font-size:.8rem;
                  color:var(--ink-500);
                  margin-top:.2rem;
                "
              >
                Perlu ditindaklanjuti di halaman
                Manajemen Inventaris.
              </p>

            </div>

          </div>
        `;

      } else {

        // Tidak ada barang bermasalah
        blok.innerHTML = '';

      }

    }


    console.log(
      'Data unit bermasalah saat ini:',
      unitBermasalah
    );

    console.log(
      'Dashboard berhasil dimuat.'
    );


  } catch (error) {

    console.error(
      'ERROR DASHBOARD:',
      error
    );

  }

}


// ========================================
// JALANKAN DASHBOARD
// ========================================

muatDashboard();