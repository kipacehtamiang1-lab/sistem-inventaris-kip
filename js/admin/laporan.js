import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // ELEMENT
  // =========================================================

  const monthSelect = document.getElementById(
    "filter-bulan-laporan",
  );

  const yearSelect = document.getElementById(
    "filter-tahun-laporan",
  );

  const btnCetak = document.getElementById(
    "btn-cetak-laporan",
  );

  const statTransaksi = document.getElementById(
    "stat-transaksi",
  );

  const statTransaksiInfo = document.getElementById(
    "stat-transaksi-info",
  );

  const statDikembalikan = document.getElementById(
    "stat-dikembalikan",
  );

  const statDikembalikanInfo = document.getElementById(
    "stat-dikembalikan-info",
  );

  const statRusak = document.getElementById(
    "stat-rusak",
  );

  const statRusakInfo = document.getElementById(
    "stat-rusak-info",
  );

  const statPegawai = document.getElementById(
    "stat-pegawai",
  );

  const statPegawaiInfo = document.getElementById(
    "stat-pegawai-info",
  );

  const tableTitle = document.getElementById(
    "judul-tabel-laporan",
  );

  const tableBody = document.getElementById(
    "tabel-laporan-body",
  );

  const canvasAktivitas = document.getElementById(
    "grafik-aktivitas",
  );

  const canvasKondisi = document.getElementById(
    "grafik-kondisi",
  );

  // =========================================================
  // PAGINATION ELEMENT
  // =========================================================

  const paginationDari = document.getElementById(
    "pagination-dari",
  );

  const paginationSampai = document.getElementById(
    "pagination-sampai",
  );

  const paginationTotal = document.getElementById(
    "pagination-total",
  );

  const paginationPageSize = document.getElementById(
    "pagination-page-size",
  );

  const paginationPrev = document.getElementById(
    "pagination-prev",
  );

  const paginationNext = document.getElementById(
    "pagination-next",
  );

  const paginationPages = document.getElementById(
    "pagination-pages",
  );

  // =========================================================
  // VARIABEL
  // =========================================================

  let grafikAktivitas = null;
  let grafikKondisi = null;

  let dataLaporan = [];

  let halamanSaatIni = 1;

  let jumlahPerHalaman = Number(
    paginationPageSize?.value || 10,
  );

  let periode = {
    bulan: "",
    tahun: "",
  };

  const namaBulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const namaBulanSingkat = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  // =========================================================
  // ESCAPE HTML
  // =========================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================================================
  // FORMAT TANGGAL
  // =========================================================

  function formatTanggal(tanggal) {
    if (!tanggal) {
      return "—";
    }

    const date = new Date(`${tanggal}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // =========================================================
  // FORMAT KONDISI
  // =========================================================

  function formatKondisi(kondisi) {
    if (!kondisi) {
      return "";
    }

    const value = String(kondisi)
      .trim()
      .toLowerCase();

    if (value.includes("rusak")) {
      return "Rusak";
    }

    if (value.includes("hilang")) {
      return "Hilang";
    }

    if (value.includes("tidak_lengkap")) {
      return "Tidak Lengkap";
    }

    if (value.includes("tidak lengkap")) {
      return "Tidak Lengkap";
    }

    if (value.includes("baik")) {
      return "Baik";
    }

    return kondisi;
  }

  // =========================================================
  // FORMAT STATUS
  // =========================================================

  function formatStatus(status) {
    if (status === "dipinjam") {
      return "Dipinjam";
    }

    if (status === "dikembalikan") {
      return "Dikembalikan";
    }

    if (status === "menunggu") {
      return "Menunggu";
    }

    if (status === "disetujui") {
      return "Disetujui";
    }

    if (status === "ditolak") {
      return "Ditolak";
    }

    return status || "-";
  }

  // =========================================================
  // SETUP DROPDOWN
  // =========================================================

  function setupDropdown() {
    const sekarang = new Date();

    const bulanSekarang =
      sekarang.getMonth() + 1;

    const tahunSekarang =
      sekarang.getFullYear();

    monthSelect.innerHTML = "";

    namaBulan.forEach((nama, index) => {
      const option =
        document.createElement("option");

      option.value = String(index + 1)
        .padStart(2, "0");

      option.textContent = nama;

      monthSelect.appendChild(option);
    });

    monthSelect.value = String(
      bulanSekarang,
    ).padStart(2, "0");

    yearSelect.innerHTML = "";

    for (
      let tahun = tahunSekarang + 1;
      tahun >= 2020;
      tahun--
    ) {
      const option =
        document.createElement("option");

      option.value = String(tahun);
      option.textContent = String(tahun);

      yearSelect.appendChild(option);
    }

    yearSelect.value =
      String(tahunSekarang);
  }

  // =========================================================
  // RANGE TANGGAL
  // =========================================================

  function getRangeTanggal(
    bulan,
    tahun,
  ) {
    const bulanNumber =
      Number(bulan);

    const tanggalAwal =
      `${tahun}-${bulan}-01`;

    const tanggalBerikutnya =
      new Date(
        Number(tahun),
        bulanNumber,
        1,
      );

    const tahunBerikutnya =
      tanggalBerikutnya.getFullYear();

    const bulanBerikutnya =
      String(
        tanggalBerikutnya.getMonth() + 1,
      ).padStart(2, "0");

    const tanggalAkhir =
      `${tahunBerikutnya}-${bulanBerikutnya}-01`;

    return {
      tanggalAwal,
      tanggalAkhir,
    };
  }

  // =========================================================
  // PAGINATION
  // =========================================================

  function getTotalHalaman() {
    if (!dataLaporan.length) {
      return 1;
    }

    return Math.ceil(
      dataLaporan.length /
        jumlahPerHalaman,
    );
  }

  function renderPagination() {
    if (!paginationDari) {
      return;
    }

    const totalData =
      dataLaporan.length;

    const totalHalaman =
      getTotalHalaman();

    if (halamanSaatIni > totalHalaman) {
      halamanSaatIni = totalHalaman;
    }

    if (halamanSaatIni < 1) {
      halamanSaatIni = 1;
    }

    if (totalData === 0) {
      paginationDari.textContent = "0";
      paginationSampai.textContent = "0";
      paginationTotal.textContent = "0";

      paginationPrev.disabled = true;
      paginationNext.disabled = true;

      paginationPages.innerHTML = "";

      return;
    }

    const mulai =
      (halamanSaatIni - 1) *
        jumlahPerHalaman +
      1;

    const sampai = Math.min(
      halamanSaatIni *
        jumlahPerHalaman,
      totalData,
    );

    paginationDari.textContent =
      mulai;

    paginationSampai.textContent =
      sampai;

    paginationTotal.textContent =
      totalData;

    paginationPrev.disabled =
      halamanSaatIni === 1;

    paginationNext.disabled =
      halamanSaatIni === totalHalaman;

    paginationPages.innerHTML = "";

    // -------------------------------------------------------
    // Buat nomor halaman
    // -------------------------------------------------------

    const maxButton = 5;

    let startPage = Math.max(
      1,
      halamanSaatIni -
        Math.floor(maxButton / 2),
    );

    let endPage = Math.min(
      totalHalaman,
      startPage + maxButton - 1,
    );

    if (
      endPage - startPage + 1 <
      maxButton
    ) {
      startPage = Math.max(
        1,
        endPage - maxButton + 1,
      );
    }

    // Tombol halaman pertama
    if (startPage > 1) {
      buatTombolHalaman(1);

      if (startPage > 2) {
        const dots =
          document.createElement("span");

        dots.textContent = "...";
        dots.style.padding = "0 0.2rem";
        dots.style.color =
          "var(--ink-500)";

        paginationPages.appendChild(
          dots,
        );
      }
    }

    for (
      let nomor = startPage;
      nomor <= endPage;
      nomor++
    ) {
      buatTombolHalaman(nomor);
    }

    // Tombol halaman terakhir
    if (endPage < totalHalaman) {
      if (endPage < totalHalaman - 1) {
        const dots =
          document.createElement("span");

        dots.textContent = "...";
        dots.style.padding = "0 0.2rem";
        dots.style.color =
          "var(--ink-500)";

        paginationPages.appendChild(
          dots,
        );
      }

      buatTombolHalaman(
        totalHalaman,
      );
    }
  }

  function buatTombolHalaman(nomor) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent = nomor;

    if (
      nomor === halamanSaatIni
    ) {
      button.classList.add("active");
      button.setAttribute(
        "aria-current",
        "page",
      );
    }

    button.addEventListener(
      "click",
      () => {
        halamanSaatIni = nomor;

        renderTable();
      },
    );

    paginationPages.appendChild(
      button,
    );
  }

  // =========================================================
  // LOAD DATA UTAMA
  // =========================================================

  async function loadReport() {
    const bulan = monthSelect.value;
    const tahun = yearSelect.value;

    if (!bulan || !tahun) {
      return;
    }

    // Reset halaman setiap kali periode berubah
    halamanSaatIni = 1;

    periode.bulan =
      namaBulan[Number(bulan) - 1];

    periode.tahun = tahun;

    const {
      tanggalAwal,
      tanggalAkhir,
    } = getRangeTanggal(
      bulan,
      tahun,
    );

    // -------------------------------------------------------
    // LOADING
    // -------------------------------------------------------

    statTransaksi.textContent = "...";
    statDikembalikan.textContent = "...";
    statRusak.textContent = "...";
    statPegawai.textContent = "...";

    statTransaksiInfo.textContent =
      "Memuat data...";

    statDikembalikanInfo.textContent =
      "Memuat data...";

    statRusakInfo.textContent =
      "Memuat data...";

    statPegawaiInfo.textContent =
      "Memuat data...";

    tableTitle.textContent =
      `Rincian Transaksi — ${periode.bulan} ${tahun}`;

    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="laporan-empty">
          Memuat data laporan...
        </td>
      </tr>
    `;

    renderPagination();

    // =======================================================
    // 1. PEMINJAMAN
    // =======================================================

    const {
      data: peminjaman,
      error: peminjamanError,
    } = await supabase
      .from("peminjaman")
      .select("*")
      .in("status", [
        "dipinjam",
        "dikembalikan",
      ])
      .gte(
        "tanggal_pinjam",
        tanggalAwal,
      )
      .lt(
        "tanggal_pinjam",
        tanggalAkhir,
      )
      .order(
        "tanggal_pinjam",
        {
          ascending: false,
        },
      );

    if (peminjamanError) {
      console.error(
        "Gagal mengambil peminjaman:",
        peminjamanError,
      );

      tampilkanError();
      return;
    }

    const dataPeminjaman =
      peminjaman || [];

    // =======================================================
    // 2. PROFILES
    // =======================================================

    const {
      data: profiles,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, nama, role, created_at",
      );

    if (profilesError) {
      console.error(
        "Gagal mengambil profiles:",
        profilesError,
      );
    }

    const dataProfiles =
      profiles || [];

    // =======================================================
    // 3. DETAIL PEMINJAMAN
    // =======================================================

    const idPeminjaman =
      dataPeminjaman.map(
        (item) => item.id,
      );

    let dataDetail = [];

    if (idPeminjaman.length > 0) {
      const {
        data: detail,
        error: detailError,
      } = await supabase
        .from("detail_peminjaman")
        .select("*")
        .in(
          "peminjaman_id",
          idPeminjaman,
        );

      if (detailError) {
        console.error(
          "Gagal mengambil detail peminjaman:",
          detailError,
        );
      } else {
        dataDetail = detail || [];
      }
    }

    // =======================================================
    // 4. UNIT PEMINJAMAN
    // =======================================================

    const idDetail =
      dataDetail.map(
        (item) => item.id,
      );

    let dataUnitPeminjaman = [];

    if (idDetail.length > 0) {
      const {
        data: unitPeminjaman,
        error: unitError,
      } = await supabase
        .from("unit_peminjaman")
        .select("*")
        .in(
          "detail_peminjaman_id",
          idDetail,
        );

      if (unitError) {
        console.error(
          "Gagal mengambil unit peminjaman:",
          unitError,
        );
      } else {
        dataUnitPeminjaman =
          unitPeminjaman || [];
      }
    }

    // =======================================================
    // 5. DETAIL PENGEMBALIAN
    // =======================================================

    const idUnitPeminjaman =
      dataUnitPeminjaman.map(
        (item) => item.id,
      );

    let dataPengembalian = [];

    if (
      idUnitPeminjaman.length > 0
    ) {
      const {
        data: pengembalian,
        error: pengembalianError,
      } = await supabase
        .from("detail_pengembalian")
        .select("*")
        .in(
          "unit_peminjaman_id",
          idUnitPeminjaman,
        );

      if (pengembalianError) {
        console.error(
          "Gagal mengambil pengembalian:",
          pengembalianError,
        );
      } else {
        dataPengembalian =
          pengembalian || [];
      }
    }

    // =======================================================
    // 6. INVENTARIS
    // =======================================================

    const idInventaris = [
      ...new Set(
        dataDetail.map(
          (item) =>
            item.inventaris_id,
        ),
      ),
    ];

    let dataInventaris = [];

    if (idInventaris.length > 0) {
      const {
        data: inventaris,
        error: inventarisError,
      } = await supabase
        .from("inventaris")
        .select(
          "id, nama_barang",
        )
        .in(
          "id",
          idInventaris,
        );

      if (inventarisError) {
        console.error(
          "Gagal mengambil inventaris:",
          inventarisError,
        );
      } else {
        dataInventaris =
          inventaris || [];
      }
    }

    // =======================================================
    // 7. GABUNGKAN DATA
    // =======================================================

    dataLaporan =
      dataPeminjaman.map(
        (peminjamanItem) => {
          const pegawai =
            dataProfiles.find(
              (profile) =>
                profile.id ===
                peminjamanItem.pegawai_id,
            );

          const detailTransaksi =
            dataDetail.filter(
              (detail) =>
                detail.peminjaman_id ===
                peminjamanItem.id,
            );

          const daftarBarang =
            detailTransaksi
              .map((detail) => {
                const barang =
                  dataInventaris.find(
                    (item) =>
                      item.id ===
                      detail.inventaris_id,
                  );

                const namaBarang =
                  barang?.nama_barang ||
                  "-";

                const unit =
                  dataUnitPeminjaman.filter(
                    (item) =>
                      item.detail_peminjaman_id ===
                      detail.id,
                  );

                const jumlah =
                  unit.length > 0
                    ? unit.length
                    : Number(
                        detail.jumlah || 1,
                      );

                return jumlah > 1
                  ? `${namaBarang} (${jumlah})`
                  : namaBarang;
              })
              .join(", ");

          const daftarKondisi =
            detailTransaksi
              .map((detail) => {
                const unit =
                  dataUnitPeminjaman.filter(
                    (item) =>
                      item.detail_peminjaman_id ===
                      detail.id,
                  );

                if (unit.length === 0) {
                  return formatStatus(
                    peminjamanItem.status,
                  );
                }

                const kondisiList = [];

                unit.forEach((unitItem) => {
                  const pengembalian =
                    dataPengembalian.find(
                      (item) =>
                        item.unit_peminjaman_id ===
                        unitItem.id,
                    );

                  if (
                    pengembalian?.kondisi
                  ) {
                    kondisiList.push(
                      formatKondisi(
                        pengembalian.kondisi,
                      ),
                    );
                  } else if (
                    unitItem.kondisi_saat_pinjam
                  ) {
                    kondisiList.push(
                      formatKondisi(
                        unitItem.kondisi_saat_pinjam,
                      ),
                    );
                  } else {
                    kondisiList.push(
                      "Baik",
                    );
                  }
                });

                const hitung = {};

                kondisiList.forEach(
                  (kondisi) => {
                    hitung[kondisi] =
                      (hitung[kondisi] || 0) +
                      1;
                  },
                );

                return Object.entries(
                  hitung,
                )
                  .map(
                    ([kondisi, jumlah]) =>
                      jumlah > 1
                        ? `${kondisi} (${jumlah})`
                        : kondisi,
                  )
                  .join(", ");
              })
              .join("; ");

          return {
            id: peminjamanItem.id,

            nomor_bast:
              peminjamanItem.nomor_bast ||
              "-",

            nama_pegawai:
              pegawai?.nama || "-",

            barang:
              daftarBarang || "-",

            tanggal_pinjam:
              peminjamanItem.tanggal_pinjam,

            tanggal_kembali:
              peminjamanItem.tanggal_kembali,

            kondisi:
              daftarKondisi || "-",

            status:
              peminjamanItem.status ||
              "-",
          };
        },
      );

    // =======================================================
    // 8. STATISTIK
    // =======================================================

    const jumlahTransaksi =
      dataPeminjaman.length;

    const jumlahDikembalikan =
      dataPeminjaman.filter(
        (item) =>
          item.status ===
          "dikembalikan",
      ).length;

    const jumlahMasihDipinjam =
      dataPeminjaman.filter(
        (item) =>
          item.status ===
          "dipinjam",
      ).length;

    // =======================================================
    // 9. RUSAK / HILANG
    // =======================================================

    let jumlahRusak = 0;
    let jumlahHilang = 0;
    let jumlahBaik = 0;
    let jumlahTidakLengkap = 0;

    dataPengembalian.forEach(
      (item) => {
        const kondisi =
          formatKondisi(
            item.kondisi,
          );

        if (kondisi === "Rusak") {
          jumlahRusak++;
        } else if (
          kondisi === "Hilang"
        ) {
          jumlahHilang++;
        } else if (
          kondisi === "Tidak Lengkap"
        ) {
          jumlahTidakLengkap++;
        } else if (
          kondisi === "Baik"
        ) {
          jumlahBaik++;
        }
      },
    );

    const jumlahRusakHilang =
      jumlahRusak + jumlahHilang;

    // =======================================================
    // 10. PEGAWAI BARU
    // =======================================================

    const mulai =
      new Date(
        `${tanggalAwal}T00:00:00`,
      );

    const selesai =
      new Date(
        `${tanggalAkhir}T00:00:00`,
      );

    const jumlahPegawaiBaru =
      dataProfiles.filter(
        (profile) => {
          if (
            profile.role !==
            "pegawai"
          ) {
            return false;
          }

          if (
            !profile.created_at
          ) {
            return false;
          }

          const dibuat =
            new Date(
              profile.created_at,
            );

          return (
            dibuat >= mulai &&
            dibuat < selesai
          );
        },
      ).length;

    // =======================================================
    // 11. TAMPILKAN STATISTIK
    // =======================================================

    statTransaksi.textContent =
      jumlahTransaksi;

    statTransaksiInfo.textContent =
      `${periode.bulan} ${tahun}`;

    statDikembalikan.textContent =
      jumlahDikembalikan;

    statDikembalikanInfo.textContent =
      `${jumlahMasihDipinjam} masih dipinjam`;

    statRusak.textContent =
      jumlahRusakHilang;

    statRusakInfo.textContent =
      jumlahRusakHilang > 0
        ? `${jumlahRusak} rusak · ${jumlahHilang} hilang`
        : "Tidak ada kerusakan";

    statPegawai.textContent =
      jumlahPegawaiBaru;

    statPegawaiInfo.textContent =
      "Terdaftar bulan ini";

    // =======================================================
    // 12. RENDER TABEL + PAGINATION
    // =======================================================

    renderTable();

    // =======================================================
    // 13. GRAFIK BULANAN
    // =======================================================

    await loadGrafikTahunan(
      tahun,
    );

    // =======================================================
    // 14. GRAFIK KONDISI
    // =======================================================

    renderGrafikKondisi({
      baik: jumlahBaik,
      rusak: jumlahRusak,
      hilang: jumlahHilang,
      tidakLengkap:
        jumlahTidakLengkap,
    });
  }

  // =========================================================
  // GRAFIK AKTIVITAS TAHUNAN
  // =========================================================

  async function loadGrafikTahunan(
    tahun,
  ) {
    const awalTahun =
      `${tahun}-01-01`;

    const akhirTahun =
      `${Number(tahun) + 1}-01-01`;

    const {
      data,
      error,
    } = await supabase
      .from("peminjaman")
      .select(
        "id, tanggal_pinjam, tanggal_kembali, status",
      )
      .gte(
        "tanggal_pinjam",
        awalTahun,
      )
      .lt(
        "tanggal_pinjam",
        akhirTahun,
      );

    if (error) {
      console.error(
        "Gagal mengambil data grafik:",
        error,
      );

      renderGrafikAktivitas(
        Array(12).fill(0),
        Array(12).fill(0),
      );

      return;
    }

    const peminjamanPerBulan =
      Array(12).fill(0);

    const pengembalianPerBulan =
      Array(12).fill(0);

    (data || []).forEach(
      (item) => {
        if (item.tanggal_pinjam) {
          const tanggal =
            new Date(
              `${item.tanggal_pinjam}T00:00:00`,
            );

          const bulan =
            tanggal.getMonth();

          peminjamanPerBulan[
            bulan
          ]++;
        }

        if (
          item.status ===
            "dikembalikan" &&
          item.tanggal_kembali
        ) {
          const tanggalKembali =
            new Date(
              `${item.tanggal_kembali}T00:00:00`,
            );

          const bulanKembali =
            tanggalKembali.getMonth();

          pengembalianPerBulan[
            bulanKembali
          ]++;
        }
      },
    );

    renderGrafikAktivitas(
      peminjamanPerBulan,
      pengembalianPerBulan,
    );
  }

  // =========================================================
  // RENDER GRAFIK AKTIVITAS
  // =========================================================

  function renderGrafikAktivitas(
    dataPeminjaman,
    dataPengembalian,
  ) {
    if (!canvasAktivitas) {
      return;
    }

    if (grafikAktivitas) {
      grafikAktivitas.destroy();
    }

    grafikAktivitas =
      new Chart(
        canvasAktivitas,
        {
          type: "line",

          data: {
            labels:
              namaBulanSingkat,

            datasets: [
              {
                label:
                  "Peminjaman",

                data:
                  dataPeminjaman,

                borderColor:
                  "#3b82f6",

                backgroundColor:
                  "rgba(59, 130, 246, 0.10)",

                borderWidth: 2.5,

                pointRadius: 3,

                pointHoverRadius: 5,

                tension: 0.35,

                fill: true,
              },

              {
                label:
                  "Pengembalian",

                data:
                  dataPengembalian,

                borderColor:
                  "#ef476f",

                backgroundColor:
                  "rgba(239, 71, 111, 0.08)",

                borderWidth: 2.5,

                pointRadius: 3,

                pointHoverRadius: 5,

                tension: 0.35,

                fill: true,
              },
            ],
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            interaction: {
              intersect: false,
              mode: "index",
            },

            plugins: {
              legend: {
                position: "top",

                align: "start",

                labels: {
                  usePointStyle: true,

                  boxWidth: 8,

                  padding: 18,
                },
              },

              tooltip: {
                backgroundColor:
                  "#222",

                padding: 10,

                displayColors: true,
              },
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  precision: 0,
                },

                title: {
                  display: true,

                  text:
                    "Jumlah Transaksi",
                },

                grid: {
                  color:
                    "rgba(0,0,0,.07)",
                },
              },

              x: {
                title: {
                  display: true,

                  text: "Bulan",
                },

                grid: {
                  display: false,
                },
              },
            },
          },
        },
      );
  }

  // =========================================================
  // GRAFIK KONDISI
  // =========================================================

  function renderGrafikKondisi(
    data,
  ) {
    if (!canvasKondisi) {
      return;
    }

    if (grafikKondisi) {
      grafikKondisi.destroy();
    }

    const total =
      data.baik +
      data.rusak +
      data.hilang +
      data.tidakLengkap;

    if (total === 0) {
      grafikKondisi =
        new Chart(
          canvasKondisi,
          {
            type: "doughnut",

            data: {
              labels: [
                "Belum ada data",
              ],

              datasets: [
                {
                  data: [1],

                  backgroundColor: [
                    "#e5e7eb",
                  ],

                  borderWidth: 0,
                },
              ],
            },

            options: {
              responsive: true,

              maintainAspectRatio: false,

              cutout: "68%",

              plugins: {
                legend: {
                  display: false,
                },

                tooltip: {
                  enabled: false,
                },
              },
            },
          },
        );

      return;
    }

    grafikKondisi =
      new Chart(
        canvasKondisi,
        {
          type: "doughnut",

          data: {
            labels: [
              "Baik",
              "Rusak",
              "Hilang",
              "Tidak Lengkap",
            ],

            datasets: [
              {
                data: [
                  data.baik,
                  data.rusak,
                  data.hilang,
                  data.tidakLengkap,
                ],

                backgroundColor: [
                  "#22c55e",
                  "#ef4444",
                  "#6b7280",
                  "#f59e0b",
                ],

                borderWidth: 3,

                borderColor: "#fff",
              },
            ],
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            cutout: "65%",

            plugins: {
              legend: {
                position: "bottom",

                labels: {
                  usePointStyle: true,

                  padding: 16,

                  boxWidth: 8,
                },
              },

              tooltip: {
                callbacks: {
                  label: function (
                    context,
                  ) {
                    const value =
                      context.raw || 0;

                    const persentase =
                      (
                        (value / total) *
                        100
                      ).toFixed(1);

                    return ` ${context.label}: ${value} (${persentase}%)`;
                  },
                },
              },
            },
          },
        },
      );
  }

  // =========================================================
  // RENDER TABLE
  // =========================================================

  function renderTable() {
    if (
      !dataLaporan ||
      dataLaporan.length === 0
    ) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="laporan-empty"
          >
            Belum ada transaksi pada bulan ini.
          </td>
        </tr>
      `;

      renderPagination();

      return;
    }

    const totalHalaman =
      getTotalHalaman();

    if (
      halamanSaatIni > totalHalaman
    ) {
      halamanSaatIni = totalHalaman;
    }

    const mulai =
      (halamanSaatIni - 1) *
      jumlahPerHalaman;

    const akhir =
      mulai + jumlahPerHalaman;

    const dataHalaman =
      dataLaporan.slice(
        mulai,
        akhir,
      );

    tableBody.innerHTML = "";

    dataHalaman.forEach(
      (item) => {
        const tr =
          document.createElement(
            "tr",
          );

        tr.innerHTML = `
          <td>
            ${escapeHtml(
              item.nomor_bast,
            )}
          </td>

          <td>
            ${escapeHtml(
              item.nama_pegawai,
            )}
          </td>

          <td>
            ${escapeHtml(
              item.barang,
            )}
          </td>

          <td>
            ${formatTanggal(
              item.tanggal_pinjam,
            )}
          </td>

          <td>
            ${formatTanggal(
              item.tanggal_kembali,
            )}
          </td>

          <td>
            ${escapeHtml(
              item.kondisi,
            )}
          </td>
        `;

        tableBody.appendChild(tr);
      },
    );

    renderPagination();
  }

  // =========================================================
  // CETAK
  // =========================================================

  function cetakLaporan() {
    if (
      !dataLaporan ||
      dataLaporan.length === 0
    ) {
      window.showToast?.(
        "Tidak ada data laporan untuk dicetak.",
        "error",
      );

      return;
    }

    const rows =
      dataLaporan
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.nomor_bast)}</td>
              <td>${escapeHtml(item.nama_pegawai)}</td>
              <td>${escapeHtml(item.barang)}</td>
              <td>${escapeHtml(formatTanggal(item.tanggal_pinjam))}</td>
              <td>${escapeHtml(formatTanggal(item.tanggal_kembali))}</td>
              <td>${escapeHtml(item.kondisi)}</td>
            </tr>
          `,
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800",
      );

    if (!printWindow) {
      window.showToast?.(
        "Popup diblokir browser.",
        "error",
      );

      return;
    }

    printWindow.document.write(`
      <!doctype html>

      <html lang="id">

      <head>

        <meta charset="UTF-8">

        <title>
          Laporan ${escapeHtml(periode.bulan)}
          ${escapeHtml(periode.tahun)}
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 25px;
            color: #111;
          }

          .header {
            text-align: center;
            margin-bottom: 25px;
          }

          .header h1 {
            margin: 0 0 5px;
            font-size: 20px;
          }

          .header p {
            margin: 0;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            border: 1px solid #222;
            padding: 7px;
            font-size: 11px;
            vertical-align: top;
          }

          th {
            background: #f2f2f2;
            text-align: center;
          }

          .footer {
            margin-top: 20px;
            text-align: right;
            font-size: 10px;
          }

          @page {
            size: A4 landscape;
            margin: 12mm;
          }

        </style>

      </head>

      <body>

        <div class="header">

          <h1>
            LAPORAN PEMINJAMAN BARANG
          </h1>

          <p>
            ${escapeHtml(periode.bulan)}
            ${escapeHtml(periode.tahun)}
          </p>

        </div>

        <table>

          <thead>

            <tr>
              <th>No</th>
              <th>No. BAST</th>
              <th>Pegawai</th>
              <th>Barang</th>
              <th>Tgl Pinjam</th>
              <th>Tgl Kembali</th>
              <th>Kondisi</th>
            </tr>

          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

        <div class="footer">
          Dicetak pada
          ${new Date().toLocaleDateString(
            "id-ID",
            {
              day: "2-digit",
              month: "long",
              year: "numeric",
            },
          )}
        </div>

      </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();

      printWindow.print();

      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }

  // =========================================================
  // ERROR
  // =========================================================

  function tampilkanError() {
    statTransaksi.textContent = "—";
    statDikembalikan.textContent = "—";
    statRusak.textContent = "—";
    statPegawai.textContent = "—";

    statTransaksiInfo.textContent =
      "Gagal mengambil data";

    statDikembalikanInfo.textContent =
      "Gagal mengambil data";

    statRusakInfo.textContent =
      "Gagal mengambil data";

    statPegawaiInfo.textContent =
      "Gagal mengambil data";

    dataLaporan = [];
    halamanSaatIni = 1;

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="laporan-empty"
        >
          Gagal mengambil data laporan.
          Silakan cek Console browser.
        </td>
      </tr>
    `;

    renderPagination();

    renderGrafikAktivitas(
      Array(12).fill(0),
      Array(12).fill(0),
    );

    renderGrafikKondisi({
      baik: 0,
      rusak: 0,
      hilang: 0,
      tidakLengkap: 0,
    });
  }

  // =========================================================
  // EVENT
  // =========================================================

  monthSelect.addEventListener(
    "change",
    loadReport,
  );

  yearSelect.addEventListener(
    "change",
    loadReport,
  );

  btnCetak?.addEventListener(
    "click",
    cetakLaporan,
  );

  paginationPrev?.addEventListener(
    "click",
    () => {
      if (halamanSaatIni > 1) {
        halamanSaatIni--;
        renderTable();
      }
    },
  );

  paginationNext?.addEventListener(
    "click",
    () => {
      if (
        halamanSaatIni <
        getTotalHalaman()
      ) {
        halamanSaatIni++;
        renderTable();
      }
    },
  );

  paginationPageSize?.addEventListener(
    "change",
    () => {
      jumlahPerHalaman =
        Number(
          paginationPageSize.value,
        ) || 10;

      halamanSaatIni = 1;

      renderTable();
    },
  );

  // =========================================================
  // MULAI
  // =========================================================

  setupDropdown();

  await loadReport();
});