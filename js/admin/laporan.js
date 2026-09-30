import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // ELEMENT HTML
  // =========================================================

  const statCards = document.querySelectorAll(".stat-card");

  const transaksiValue =
    statCards[0]?.querySelector(".value");

  const dikembalikanValue =
    statCards[1]?.querySelector(".value");

  const rusakValue =
    statCards[2]?.querySelector(".value");

  const pegawaiValue =
    statCards[3]?.querySelector(".value");

  const transaksiDelta =
    statCards[0]?.querySelector(".delta");

  const dikembalikanDelta =
    statCards[1]?.querySelector(".delta");

  const rusakDelta =
    statCards[2]?.querySelector(".delta");

  const pegawaiDelta =
    statCards[3]?.querySelector(".delta");

  // Select lama dari HTML
  const oldMonthSelect =
    document.querySelector(".page-head select");

  const tableBody =
    document.querySelector(".print-table tbody");

  const tableTitle =
    document.querySelector(".card h3");

  const btnCetak =
    document.getElementById("btn-cetak-laporan") ||
    document.querySelector(".page-head .btn.btn-gold");

  // =========================================================
  // VARIABEL DROPDOWN
  // =========================================================

  let monthSelect = null;
  let yearSelect = null;

  // =========================================================
  // DATA LAPORAN
  // =========================================================

  let dataLaporan = [];

  let periodeLaporan = {
    bulan: "",
    tahun: "",
  };

  // =========================================================
  // NAMA BULAN
  // =========================================================

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

  // =========================================================
  // BUAT DROPDOWN BULAN + TAHUN
  // =========================================================

  function isiDropdownPeriode() {
    if (!oldMonthSelect) {
      return;
    }

    // Ambil parent select lama
    const parent =
      oldMonthSelect.parentElement;

    if (!parent) {
      return;
    }

    // -------------------------------------------------------
    // Buat container baru
    // -------------------------------------------------------

    const wrapper =
      document.createElement("div");

    wrapper.style.display = "flex";
    wrapper.style.gap = "0.5rem";
    wrapper.style.alignItems = "center";

    // -------------------------------------------------------
    // Dropdown BULAN
    // -------------------------------------------------------

    monthSelect =
      document.createElement("select");

    monthSelect.className =
      "input";

    monthSelect.style.width =
      "150px";

    monthSelect.setAttribute(
      "aria-label",
      "Pilih bulan laporan",
    );

    namaBulan.forEach(
      (nama, index) => {
        const option =
          document.createElement("option");

        option.value =
          String(index + 1).padStart(
            2,
            "0",
          );

        option.textContent =
          nama;

        monthSelect.appendChild(
          option,
        );
      },
    );

    // -------------------------------------------------------
    // Dropdown TAHUN
    // -------------------------------------------------------

    yearSelect =
      document.createElement("select");

    yearSelect.className =
      "input";

    yearSelect.style.width =
      "120px";

    yearSelect.setAttribute(
      "aria-label",
      "Pilih tahun laporan",
    );

    const tahunSekarang =
      new Date().getFullYear();

    // Tampilkan tahun dari 2020 sampai
    // 1 tahun ke depan.
    //
    // Contoh:
    // 2020
    // 2021
    // 2022
    // ...
    // 2026
    // 2027

    const tahunMulai = 2020;
    const tahunAkhir =
      tahunSekarang + 1;

    for (
      let tahun = tahunAkhir;
      tahun >= tahunMulai;
      tahun--
    ) {
      const option =
        document.createElement("option");

      option.value =
        String(tahun);

      option.textContent =
        String(tahun);

      yearSelect.appendChild(
        option,
      );
    }

    // -------------------------------------------------------
    // Set periode awal = bulan sekarang
    // -------------------------------------------------------

    const bulanSekarang =
      String(
        new Date().getMonth() + 1,
      ).padStart(2, "0");

    monthSelect.value =
      bulanSekarang;

    yearSelect.value =
      String(tahunSekarang);

    // -------------------------------------------------------
    // Masukkan dropdown baru
    // -------------------------------------------------------

    wrapper.appendChild(
      monthSelect,
    );

    wrapper.appendChild(
      yearSelect,
    );

    parent.replaceChild(
      wrapper,
      oldMonthSelect,
    );
  }

  // =========================================================
  // FORMAT TANGGAL
  // =========================================================

  function formatTanggal(tanggal) {
    if (!tanggal) {
      return "—";
    }

    const date =
      new Date(
        `${tanggal}T00:00:00`,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  }

  // =========================================================
  // ESCAPE HTML
  // =========================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll(
        "&",
        "&amp;",
      )
      .replaceAll(
        "<",
        "&lt;",
      )
      .replaceAll(
        ">",
        "&gt;",
      )
      .replaceAll(
        '"',
        "&quot;",
      )
      .replaceAll(
        "'",
        "&#039;",
      );
  }

  // =========================================================
  // LABEL KONDISI
  // =========================================================

  function formatKondisi(kondisi) {
    if (!kondisi) {
      return "";
    }

    const value =
      String(kondisi)
        .trim()
        .toLowerCase();

    const labels = {
      baik: "Baik",
      rusak: "Rusak",
      hilang: "Hilang",
      tidak_lengkap:
        "Tidak Lengkap",
    };

    return (
      labels[value] ||
      kondisi
    );
  }

  // =========================================================
  // STATUS TRANSAKSI
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
  // LOAD LAPORAN
  // =========================================================

  async function loadReport() {
    if (
      !monthSelect ||
      !yearSelect
    ) {
      return;
    }

    const bulan =
      monthSelect.value;

    const tahun =
      yearSelect.value;

    if (
      !bulan ||
      !tahun
    ) {
      return;
    }

    // -------------------------------------------------------
    // PERIODE TERPILIH
    // -------------------------------------------------------

    periodeLaporan.bulan =
      namaBulan[
        Number(bulan) - 1
      ];

    periodeLaporan.tahun =
      tahun;

    // -------------------------------------------------------
    // TANGGAL AWAL
    // -------------------------------------------------------

    const tanggalAwal =
      `${tahun}-${bulan}-01`;

    // -------------------------------------------------------
    // TANGGAL BULAN BERIKUTNYA
    // -------------------------------------------------------

    const tanggalBerikutnya =
      new Date(
        Number(tahun),
        Number(bulan),
        1,
      );

    const tahunBerikutnya =
      tanggalBerikutnya.getFullYear();

    const bulanBerikutnya =
      String(
        tanggalBerikutnya.getMonth() + 1,
      ).padStart(
        2,
        "0",
      );

    const tanggalAkhir =
      `${tahunBerikutnya}-${bulanBerikutnya}-01`;

    // =======================================================
    // LOADING
    // =======================================================

    if (transaksiValue) {
      transaksiValue.textContent =
        "...";
    }

    if (dikembalikanValue) {
      dikembalikanValue.textContent =
        "...";
    }

    if (rusakValue) {
      rusakValue.textContent =
        "...";
    }

    if (pegawaiValue) {
      pegawaiValue.textContent =
        "...";
    }

    if (tableTitle) {
      tableTitle.textContent =
        `Rincian Transaksi — ${periodeLaporan.bulan} ${tahun}`;
    }

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="text-align:center; padding:2rem;"
          >
            Memuat data...
          </td>
        </tr>
      `;
    }

    // =======================================================
    // 1. AMBIL PEMINJAMAN
    // =======================================================

    const {
      data: peminjaman,
      error: peminjamanError,
    } = await supabase
      .from("peminjaman")
      .select("*")
      .in(
        "status",
        [
          "dipinjam",
          "dikembalikan",
        ],
      )
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
    // 2. AMBIL PROFILES
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
        (item) =>
          item.id,
      );

    let dataDetail = [];

    if (
      idPeminjaman.length > 0
    ) {
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
        dataDetail =
          detail || [];
      }
    }

    // =======================================================
    // 4. UNIT PEMINJAMAN
    // =======================================================

    const idDetail =
      dataDetail.map(
        (item) =>
          item.id,
      );

    let dataUnitPeminjaman = [];

    if (
      idDetail.length > 0
    ) {
      const {
        data: unitPeminjaman,
        error: unitPeminjamanError,
      } = await supabase
        .from("unit_peminjaman")
        .select("*")
        .in(
          "detail_peminjaman_id",
          idDetail,
        );

      if (
        unitPeminjamanError
      ) {
        console.error(
          "Gagal mengambil unit peminjaman:",
          unitPeminjamanError,
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
        (item) =>
          item.id,
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

      if (
        pengembalianError
      ) {
        console.error(
          "Gagal mengambil detail pengembalian:",
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

    if (
      idInventaris.length > 0
    ) {
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

          // -------------------------------------------------
          // BARANG
          // -------------------------------------------------

          const daftarBarang =
            detailTransaksi
              .map(
                (detail) => {
                  const barang =
                    dataInventaris.find(
                      (item) =>
                        item.id ===
                        detail.inventaris_id,
                    );

                  const namaBarang =
                    barang?.nama_barang ||
                    "-";

                  const unitUntukDetail =
                    dataUnitPeminjaman.filter(
                      (unit) =>
                        unit.detail_peminjaman_id ===
                        detail.id,
                    );

                  const jumlahUnit =
                    unitUntukDetail.length >
                    0
                      ? unitUntukDetail.length
                      : Number(
                          detail.jumlah ||
                            1,
                        );

                  return jumlahUnit > 1
                    ? `${namaBarang} (${jumlahUnit})`
                    : namaBarang;
                },
              )
              .join(", ");

          // -------------------------------------------------
          // KONDISI
          // -------------------------------------------------

          const daftarKondisi =
            detailTransaksi
              .map(
                (detail) => {
                  const unitUntukDetail =
                    dataUnitPeminjaman.filter(
                      (unit) =>
                        unit.detail_peminjaman_id ===
                        detail.id,
                    );

                  if (
                    unitUntukDetail.length ===
                    0
                  ) {
                    if (
                      peminjamanItem.status ===
                      "dikembalikan"
                    ) {
                      return "Dikembalikan";
                    }

                    return "Dipinjam";
                  }

                  const kondisiList =
                    [];

                  unitUntukDetail.forEach(
                    (unit) => {
                      const pengembalian =
                        dataPengembalian.find(
                          (item) =>
                            item.unit_peminjaman_id ===
                            unit.id,
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
                        unit.kondisi_saat_pinjam
                      ) {
                        kondisiList.push(
                          formatKondisi(
                            unit.kondisi_saat_pinjam,
                          ),
                        );
                      } else {
                        kondisiList.push(
                          "Baik",
                        );
                      }
                    },
                  );

                  const hitungKondisi =
                    {};

                  kondisiList.forEach(
                    (kondisi) => {
                      hitungKondisi[
                        kondisi
                      ] =
                        (
                          hitungKondisi[
                            kondisi
                          ] || 0
                        ) + 1;
                    },
                  );

                  return Object.entries(
                    hitungKondisi,
                  )
                    .map(
                      ([
                        kondisi,
                        jumlah,
                      ]) =>
                        jumlah > 1
                          ? `${kondisi} (${jumlah})`
                          : kondisi,
                    )
                    .join(", ");
                },
              )
              .join("; ");

          return {
            id:
              peminjamanItem.id,

            nomor_bast:
              peminjamanItem.nomor_bast ||
              "-",

            nama_pegawai:
              pegawai?.nama ||
              "-",

            barang:
              daftarBarang ||
              "-",

            tanggal_pinjam:
              peminjamanItem.tanggal_pinjam,

            tanggal_kembali:
              peminjamanItem.tanggal_kembali,

            kondisi:
              daftarKondisi ||
              "-",

            status:
              peminjamanItem.status ||
              "-",
          };
        },
      );

    // =======================================================
    // 8. HITUNG TRANSAKSI
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
    // 9. HITUNG RUSAK / HILANG
    // =======================================================

    let jumlahRusakHilang =
      0;

    dataPengembalian.forEach(
      (pengembalian) => {
        const kondisi =
          String(
            pengembalian.kondisi ||
              "",
          )
            .trim()
            .toLowerCase();

        if (
          kondisi === "rusak" ||
          kondisi === "hilang"
        ) {
          jumlahRusakHilang++;
        }
      },
    );

    // =======================================================
    // 10. HITUNG PEGAWAI BARU
    // =======================================================

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

          const mulai =
            new Date(
              `${tanggalAwal}T00:00:00`,
            );

          const selesai =
            new Date(
              `${tanggalAkhir}T00:00:00`,
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

    if (transaksiValue) {
      transaksiValue.textContent =
        jumlahTransaksi;
    }

    if (dikembalikanValue) {
      dikembalikanValue.textContent =
        jumlahDikembalikan;
    }

    if (rusakValue) {
      rusakValue.textContent =
        jumlahRusakHilang;
    }

    if (pegawaiValue) {
      pegawaiValue.textContent =
        jumlahPegawaiBaru;
    }

    // =======================================================
    // 12. KETERANGAN STATISTIK
    // =======================================================

    if (transaksiDelta) {
      transaksiDelta.textContent =
        `Bulan ${periodeLaporan.bulan} ${tahun}`;
    }

    if (dikembalikanDelta) {
      dikembalikanDelta.textContent =
        `${jumlahMasihDipinjam} masih dipinjam`;
    }

    if (rusakDelta) {
      rusakDelta.textContent =
        jumlahRusakHilang > 0
          ? "Perlu tindak lanjut"
          : "Tidak ada kerusakan";
    }

    if (pegawaiDelta) {
      pegawaiDelta.textContent =
        "Terdaftar bulan ini";
    }

    // =======================================================
    // 13. JUDUL TABEL
    // =======================================================

    if (tableTitle) {
      tableTitle.textContent =
        `Rincian Transaksi — ${periodeLaporan.bulan} ${tahun}`;
    }

    // =======================================================
    // 14. RENDER TABEL
    // =======================================================

    renderTable();
  }

  // =========================================================
  // RENDER TABLE
  // =========================================================

  function renderTable() {
    if (!tableBody) {
      return;
    }

    if (
      !dataLaporan ||
      dataLaporan.length === 0
    ) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="text-align:center; padding:2rem;"
          >
            Belum ada transaksi pada bulan ini.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML = "";

    dataLaporan.forEach(
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

        tableBody.appendChild(
          tr,
        );
      },
    );
  }

  // =========================================================
  // CETAK LAPORAN
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

    const namaBulanCetak =
      periodeLaporan.bulan ||
      "Laporan";

    const tahunCetak =
      periodeLaporan.tahun ||
      new Date().getFullYear();

    // =======================================================
    // BARIS TABEL
    // =======================================================

    const rows =
      dataLaporan
        .map(
          (item, index) => {
            return `
              <tr>
                <td class="center">
                  ${index + 1}
                </td>

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
                  ${escapeHtml(
                    formatTanggal(
                      item.tanggal_pinjam,
                    ),
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    formatTanggal(
                      item.tanggal_kembali,
                    ),
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    item.kondisi,
                  )}
                </td>
              </tr>
            `;
          },
        )
        .join("");

    // =======================================================
    // OPEN PRINT WINDOW
    // =======================================================

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800",
      );

    if (!printWindow) {
      window.showToast?.(
        "Popup diblokir browser. Izinkan popup untuk mencetak laporan.",
        "error",
      );

      return;
    }

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>

      <html lang="id">

      <head>
        <meta charset="UTF-8">

        <title>
          Laporan Peminjaman
          ${escapeHtml(
            namaBulanCetak,
          )}
          ${escapeHtml(
            tahunCetak,
          )}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 30px;
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #111;
            background: #fff;

            font-size: 12px;
          }

          .print-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }

          .print-header {
            text-align: center;
            margin-bottom: 24px;
          }

          .print-header h1 {
            margin:
              0 0 6px;

            font-size: 20px;
            font-weight: 700;
          }

          .print-header h2 {
            margin: 0;

            font-size: 15px;
            font-weight: 600;
          }

          .print-header p {
            margin:
              8px 0 0;

            font-size: 12px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border:
              1px solid #222;

            padding:
              8px 7px;

            vertical-align: top;

            word-wrap:
              break-word;
          }

          th {
            text-align: center;
            font-weight: 700;
            background: #f2f2f2;
          }

          .center {
            text-align: center;
          }

          .footer {
            margin-top: 20px;
            font-size: 11px;
            text-align: right;
          }

          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          @media print {
            body {
              padding: 0;
            }

            .print-container {
              max-width: none;
            }
          }
        </style>
      </head>

      <body>

        <div class="print-container">

          <div class="print-header">

            <h1>
              LAPORAN PEMINJAMAN BARANG
            </h1>

            <h2>
              ${escapeHtml(
                namaBulanCetak,
              )}
              ${escapeHtml(
                tahunCetak,
              )}
            </h2>

            <p>
              Rincian Transaksi Peminjaman
            </p>

          </div>

          <table>

            <thead>
              <tr>
                <th style="width: 5%;">
                  No
                </th>

                <th style="width: 17%;">
                  No. BAST
                </th>

                <th style="width: 14%;">
                  Pegawai
                </th>

                <th style="width: 24%;">
                  Barang
                </th>

                <th style="width: 11%;">
                  Tgl Pinjam
                </th>

                <th style="width: 11%;">
                  Tgl Kembali
                </th>

                <th style="width: 18%;">
                  Kondisi
                </th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

          <div class="footer">
            Dicetak pada
            ${escapeHtml(
              new Date().toLocaleDateString(
                "id-ID",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                },
              ),
            )}
          </div>

        </div>

      </body>

      </html>
    `);

    printWindow.document.close();

    // =======================================================
    // PRINT
    // =======================================================

    printWindow.onload = () => {
      printWindow.focus();

      printWindow.print();

      printWindow.onafterprint =
        () => {
          printWindow.close();
        };
    };
  }

  // =========================================================
  // EVENT DROPDOWN BULAN
  // =========================================================

  // =========================================================
  // EVENT DROPDOWN TAHUN
  // =========================================================

  // =========================================================
  // EVENT CETAK
  // =========================================================

  btnCetak?.addEventListener(
    "click",
    cetakLaporan,
  );

  // =========================================================
  // ERROR
  // =========================================================

  function tampilkanError() {
    if (transaksiValue) {
      transaksiValue.textContent =
        "—";
    }

    if (dikembalikanValue) {
      dikembalikanValue.textContent =
        "—";
    }

    if (rusakValue) {
      rusakValue.textContent =
        "—";
    }

    if (pegawaiValue) {
      pegawaiValue.textContent =
        "—";
    }

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="text-align:center; padding:2rem;"
          >
            Gagal mengambil data laporan.
            Cek Console untuk melihat error.
          </td>
        </tr>
      `;
    }
  }

  // =========================================================
  // MULAI
  // =========================================================

  isiDropdownPeriode();

  // Event harus dipasang setelah dropdown dibuat
  monthSelect?.addEventListener(
    "change",
    loadReport,
  );

  yearSelect?.addEventListener(
    "change",
    loadReport,
  );

  await loadReport();
});