// ======================================================
// ADMIN - RIWAYAT
// ======================================================
// Riwayat transaksi peminjaman & pengembalian
//
// Fitur:
// - Cari nama pegawai
// - Cari nama barang
// - Filter tanggal pinjam
// - Reset filter jika tersedia
// - Pagination 5 transaksi / halaman
// - Tombol Sebelumnya / Berikutnya aktif
// - Menampilkan kondisi setiap unit
// - Mendukung data transaksi lama
// ======================================================

import { supabase } from "../supabase.js";

// ======================================================
// KONFIGURASI
// ======================================================

const PAGE_SIZE = 5;

// ======================================================
// HELPER
// ======================================================

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]
  );
}

function formatTanggal(iso) {
  if (!iso) return "-";

  try {
    return new Date(
      iso + "T00:00:00"
    ).toLocaleDateString(
      "id-ID",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return iso;
  }
}

// ======================================================
// NAMA KONDISI
// ======================================================

function namaKondisi(kondisi) {
  if (!kondisi) {
    return "-";
  }

  const k =
    String(kondisi)
      .toLowerCase()
      .trim();

  if (k === "baik") {
    return "Baik";
  }

  if (k === "rusak") {
    return "Rusak";
  }

  if (k === "hilang") {
    return "Hilang";
  }

  if (k === "tidak_lengkap") {
    return "Tidak Lengkap";
  }

  return kondisi;
}

// ======================================================
// BADGE KONDISI
// ======================================================

function kondisiBadge(kondisi) {
  if (!kondisi) {
    return `
      <span class="muted">—</span>
    `;
  }

  const k =
    String(kondisi)
      .toLowerCase()
      .trim();

  const label =
    namaKondisi(k);

  if (k === "hilang") {
    return `
      <span class="badge badge-bad">
        ${escapeHtml(label)}
      </span>
    `;
  }

  if (
    k === "rusak" ||
    k === "tidak_lengkap"
  ) {
    return `
      <span class="badge badge-warn">
        ${escapeHtml(label)}
      </span>
    `;
  }

  return `
    <span class="badge badge-ok">
      ${escapeHtml(label)}
    </span>
  `;
}

// ======================================================
// STATUS BADGE
// ======================================================

function statusBadge(status) {
  if (status === "dikembalikan") {
    return `
      <span class="badge badge-ok">
        Dikembalikan
      </span>
    `;
  }

  if (status === "dipinjam") {
    return `
      <span class="badge badge-info">
        Dipinjam
      </span>
    `;
  }

  return `
    <span class="muted">—</span>
  `;
}

// ======================================================
// ELEMENT
// ======================================================

const tbody =
  document.querySelector(
    "#tabel-riwayat tbody"
  );

const searchInput =
  document.querySelector(
    '[data-table-search="tabel-riwayat"]'
  );

const tanggalInput =
  document.querySelector(
    '.table-tools input[type="date"]'
  );

const footerText =
  document.querySelector(
    "#footer-riwayat-text"
  );

const btnPrev =
  document.getElementById(
    "btn-prev-riwayat"
  );

const btnNext =
  document.getElementById(
    "btn-next-riwayat"
  );

// ======================================================
// STATE
// ======================================================

let semuaData = [];

let dataTerfilter = [];

let currentPage = 1;

// ======================================================
// RENDER KONDISI SEMUA UNIT
// ======================================================

function renderKondisiSemuaUnit(p) {

  const detail =
    Array.isArray(
      p.detail_peminjaman
    )
      ? p.detail_peminjaman
      : [];

  const hasil = [];

  detail.forEach(
    (d) => {

      const namaBarang =
        d.inventaris
          ?.nama_barang ||
        "-";

      const units =
        Array.isArray(
          d.unit_peminjaman
        )
          ? d.unit_peminjaman
          : [];

      // --------------------------------------------
      // TRANSAKSI YANG SUDAH MEMILIKI UNIT
      // --------------------------------------------

      if (units.length > 0) {

        units.forEach(
          (up) => {

            const unit =
              up.unit_inventaris;

            const pengembalian =
              up.detail_pengembalian;

            let kondisi =
              null;

            // Kondisi setelah dikembalikan
            if (
              Array.isArray(
                pengembalian
              ) &&
              pengembalian.length > 0
            ) {

              kondisi =
                pengembalian[0]
                  ?.kondisi ||
                null;
            }

            // Kalau masih dipinjam,
            // gunakan kondisi saat pinjam
            if (
              !kondisi &&
              p.status ===
                "dipinjam"
            ) {

              kondisi =
                up.kondisi_saat_pinjam ||
                null;
            }

            hasil.push({
              namaBarang,
              kodeUnit:
                unit?.kode_unit ||
                "-",
              kondisi,
            });

          }
        );

        return;
      }

      // --------------------------------------------
      // FALLBACK DATA LAMA
      // --------------------------------------------

      const kondisiLama =
        d.kondisi_saat_kembali ||
        null;

      const jumlah =
        Number(
          d.jumlah || 0
        );

      if (kondisiLama) {

        for (
          let i = 0;
          i <
          Math.max(
            jumlah,
            1
          );
          i++
        ) {

          hasil.push({
            namaBarang,
            kodeUnit: "-",
            kondisi:
              kondisiLama,
          });

        }

      } else {

        hasil.push({
          namaBarang,
          kodeUnit: "-",
          kondisi: null,
        });

      }
    }
  );

  // --------------------------------------------
  // TIDAK ADA DATA UNIT
  // --------------------------------------------

  if (
    hasil.length === 0
  ) {

    return `
      <span class="muted">
        —
      </span>
    `;
  }

  // --------------------------------------------
  // RENDER UNIT
  // --------------------------------------------

  return `
    <div class="riwayat-kondisi-list">

      ${hasil
        .map(
          (item) => {

            const kodeUnit =
              item.kodeUnit &&
              item.kodeUnit !== "-"
                ? `
                  <span class="riwayat-unit">
                    ${escapeHtml(
                      item.kodeUnit
                    )}
                  </span>
                `
                : "";

            return `
              <div class="riwayat-kondisi-item">

                ${
                  kodeUnit
                }

                ${kondisiBadge(
                  item.kondisi
                )}

              </div>
            `;
          }
        )
        .join("")}

    </div>
  `;
}

// ======================================================
// RENDER BARIS
// ======================================================

function renderRow(p) {

  const detail =
    Array.isArray(
      p.detail_peminjaman
    )
      ? p.detail_peminjaman
      : [];

  // --------------------------------------------
  // BARANG
  // --------------------------------------------

  const barang =
    detail
      .map(
        (d) =>
          d.inventaris
            ?.nama_barang
      )
      .filter(Boolean)
      .join(", ");

  // --------------------------------------------
  // KONDISI
  // --------------------------------------------

  const kondisiHtml =
    p.status ===
      "dikembalikan"
      ? renderKondisiSemuaUnit(p)
      : statusBadge(
          p.status
        );

  // --------------------------------------------
  // ROW
  // --------------------------------------------

  const tr =
    document.createElement(
      "tr"
    );

  tr.innerHTML = `

    <td class="riwayat-bast">
      ${escapeHtml(
        p.nomor_bast ||
          "-"
      )}
    </td>

    <td class="riwayat-pegawai">
      ${escapeHtml(
        p.pegawai?.nama ||
          "-"
      )}
    </td>

    <td class="riwayat-barang">
      ${escapeHtml(
        barang ||
          "-"
      )}
    </td>

    <td class="riwayat-tanggal">
      ${formatTanggal(
        p.tanggal_pinjam
      )}
    </td>

    <td class="riwayat-tanggal">
      ${
        p.status ===
        "dikembalikan"
          ? formatTanggal(
              p.tanggal_kembali
            )
          : "-"
      }
    </td>

    <td class="riwayat-kondisi">
      ${kondisiHtml}
    </td>

  `;

  return tr;
}

// ======================================================
// UPDATE PAGINATION
// ======================================================

function updatePagination() {

  const total =
    dataTerfilter.length;

  const totalPages =
    Math.max(
      Math.ceil(
        total /
          PAGE_SIZE
      ),
      1
    );

  // Kalau filter membuat
  // halaman saat ini tidak valid
  if (
    currentPage >
    totalPages
  ) {

    currentPage =
      totalPages;
  }

  // --------------------------------------------
  // DISABLE PREV
  // --------------------------------------------

  if (btnPrev) {

    btnPrev.disabled =
      currentPage <= 1;
  }

  // --------------------------------------------
  // DISABLE NEXT
  // --------------------------------------------

  if (btnNext) {

    btnNext.disabled =
      currentPage >=
      totalPages;
  }

  // --------------------------------------------
  // FOOTER TEXT
  // --------------------------------------------

  if (footerText) {

    if (total === 0) {

      footerText.textContent =
        "Menampilkan 0 dari 0 transaksi";

    } else {

      const start =
        (
          currentPage -
          1
        ) *
          PAGE_SIZE +
        1;

      const end =
        Math.min(
          currentPage *
            PAGE_SIZE,
          total
        );

      footerText.textContent =
        `Menampilkan ${start}–${end} dari ${total} transaksi`;
    }
  }
}

// ======================================================
// RENDER TABEL
// ======================================================

function renderTabel() {

  if (!tbody) {
    return;
  }

  tbody.innerHTML =
    "";

  const total =
    dataTerfilter.length;

  // --------------------------------------------
  // KOSONG
  // --------------------------------------------

  if (total === 0) {

    tbody.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="muted"
          style="
            text-align:center;
            padding:2rem;
          "
        >
          Tidak ada transaksi
          yang sesuai dengan filter.
        </td>

      </tr>
    `;

    updatePagination();

    return;
  }

  // --------------------------------------------
  // HITUNG DATA HALAMAN
  // --------------------------------------------

  const start =
    (
      currentPage -
      1
    ) *
    PAGE_SIZE;

  const end =
    start +
    PAGE_SIZE;

  const pageData =
    dataTerfilter.slice(
      start,
      end
    );

  // --------------------------------------------
  // RENDER
  // --------------------------------------------

  pageData.forEach(
    (item) => {

      tbody.appendChild(
        renderRow(item)
      );

    }
  );

  updatePagination();
}

// ======================================================
// FILTER DATA
// ======================================================

function filterData() {

  const keyword =
    (
      searchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const tanggal =
    tanggalInput?.value ||
    "";

  dataTerfilter =
    semuaData.filter(
      (p) => {

        // ------------------------------------------
        // NAMA PEGAWAI
        // ------------------------------------------

        const namaPegawai =
          (
            p.pegawai
              ?.nama ||
            ""
          )
            .toLowerCase();

        // ------------------------------------------
        // NAMA BARANG
        // ------------------------------------------

        const detail =
          Array.isArray(
            p.detail_peminjaman
          )
            ? p.detail_peminjaman
            : [];

        const namaBarang =
          detail
            .map(
              (d) =>
                d.inventaris
                  ?.nama_barang ||
                ""
            )
            .join(" ")
            .toLowerCase();

        // ------------------------------------------
        // CARI
        // ------------------------------------------

        const cocokKeyword =
          !keyword ||
          namaPegawai.includes(
            keyword
          ) ||
          namaBarang.includes(
            keyword
          );

        // ------------------------------------------
        // TANGGAL
        // ------------------------------------------

        const cocokTanggal =
          !tanggal ||
          p.tanggal_pinjam ===
            tanggal;

        return (
          cocokKeyword &&
          cocokTanggal
        );
      }
    );

  // Reset ke halaman pertama
  // setelah filter berubah

  currentPage = 1;

  renderTabel();
}

// ======================================================
// LOAD RIWAYAT
// ======================================================

async function muatRiwayat() {

  if (!tbody) {

    console.error(
      "Elemen #tabel-riwayat tbody tidak ditemukan."
    );

    return;
  }

  tbody.innerHTML = `
    <tr>

      <td
        colspan="6"
        class="muted"
        style="
          text-align:center;
          padding:2rem;
        "
      >
        Memuat data…
      </td>

    </tr>
  `;

  try {

    // ==================================================
    // 1. PEMINJAMAN
    // ==================================================

    const {
      data: peminjaman,
      error:
        peminjamanError,
    } = await supabase
      .from(
        "peminjaman"
      )
      .select(`
        id,
        nomor_bast,
        pegawai_id,
        tanggal_pinjam,
        tanggal_kembali,
        status
      `)
      .in(
        "status",
        [
          "dipinjam",
          "dikembalikan",
        ]
      )
      .order(
        "tanggal_pinjam",
        {
          ascending:
            false,
        }
      );

    if (
      peminjamanError
    ) {
      throw peminjamanError;
    }

    const rows =
      peminjaman || [];

    // ==================================================
    // 2. PEGAWAI
    // ==================================================

    const pegawaiIds = [
      ...new Set(
        rows
          .map(
            (p) =>
              p.pegawai_id
          )
          .filter(Boolean)
      ),
    ];

    const pegawaiMap =
      new Map();

    if (
      pegawaiIds.length >
      0
    ) {

      const {
        data: profiles,
        error,
      } = await supabase
        .from(
          "profiles"
        )
        .select(
          "id,nama"
        )
        .in(
          "id",
          pegawaiIds
        );

      if (error) {
        throw error;
      }

      (
        profiles || []
      ).forEach(
        (profile) => {

          pegawaiMap.set(
            profile.id,
            profile
          );

        }
      );
    }

    // ==================================================
    // 3. DETAIL PEMINJAMAN
    // ==================================================

    const peminjamanIds =
      rows.map(
        (p) => p.id
      );

    let details =
      [];

    if (
      peminjamanIds.length >
      0
    ) {

      const {
        data,
        error,
      } = await supabase
        .from(
          "detail_peminjaman"
        )
        .select(`
          id,
          peminjaman_id,
          inventaris_id,
          jumlah
        `)
        .in(
          "peminjaman_id",
          peminjamanIds
        );

      if (error) {
        throw error;
      }

      details =
        data || [];
    }

    // ==================================================
    // 4. INVENTARIS
    // ==================================================

    const inventarisIds = [
      ...new Set(
        details
          .map(
            (d) =>
              d.inventaris_id
          )
          .filter(Boolean)
      ),
    ];

    const inventarisMap =
      new Map();

    if (
      inventarisIds.length >
      0
    ) {

      const {
        data: inventaris,
        error,
      } = await supabase
        .from(
          "inventaris"
        )
        .select(`
          id,
          nama_barang
        `)
        .in(
          "id",
          inventarisIds
        );

      if (error) {
        throw error;
      }

      (
        inventaris || []
      ).forEach(
        (item) => {

          inventarisMap.set(
            item.id,
            item
          );

        }
      );
    }

    // ==================================================
    // 5. UNIT PEMINJAMAN
    // ==================================================

    const detailIds =
      details.map(
        (d) => d.id
      );

    let unitPeminjaman =
      [];

    if (
      detailIds.length >
      0
    ) {

      const {
        data,
        error,
      } = await supabase
        .from(
          "unit_peminjaman"
        )
        .select(`
          id,
          detail_peminjaman_id,
          unit_inventaris_id,
          kondisi_saat_pinjam
        `)
        .in(
          "detail_peminjaman_id",
          detailIds
        );

      if (error) {
        throw error;
      }

      unitPeminjaman =
        data || [];
    }

    // ==================================================
    // 6. UNIT INVENTARIS
    // ==================================================

    const unitIds = [
      ...new Set(
        unitPeminjaman
          .map(
            (u) =>
              u.unit_inventaris_id
          )
          .filter(Boolean)
      ),
    ];

    const unitMap =
      new Map();

    if (
      unitIds.length >
      0
    ) {

      const {
        data: units,
        error,
      } = await supabase
        .from(
          "unit_inventaris"
        )
        .select(`
          id,
          kode_unit,
          kondisi,
          status
        `)
        .in(
          "id",
          unitIds
        );

      if (error) {
        throw error;
      }

      (
        units || []
      ).forEach(
        (unit) => {

          unitMap.set(
            unit.id,
            unit
          );

        }
      );
    }

    // ==================================================
    // 7. DETAIL PENGEMBALIAN
    // ==================================================

    const unitPeminjamanIds =
      unitPeminjaman
        .map(
          (u) => u.id
        )
        .filter(Boolean);

    let detailPengembalian =
      [];

    if (
      unitPeminjamanIds.length >
      0
    ) {

      const {
        data,
        error,
      } = await supabase
        .from(
          "detail_pengembalian"
        )
        .select(`
          id,
          unit_peminjaman_id,
          kondisi,
          keterangan
        `)
        .in(
          "unit_peminjaman_id",
          unitPeminjamanIds
        );

      if (error) {
        throw error;
      }

      detailPengembalian =
        data || [];
    }

    // ==================================================
    // 8. MAP PENGEMBALIAN
    // ==================================================

    const pengembalianMap =
      new Map();

    detailPengembalian.forEach(
      (item) => {

        const arr =
          pengembalianMap.get(
            item.unit_peminjaman_id
          ) || [];

        arr.push(item);

        pengembalianMap.set(
          item.unit_peminjaman_id,
          arr
        );

      }
    );

    // ==================================================
    // 9. MAP UNIT KE DETAIL
    // ==================================================

    const unitMapByDetail =
      new Map();

    unitPeminjaman.forEach(
      (unitPinjam) => {

        const detailId =
          unitPinjam
            .detail_peminjaman_id;

        const arr =
          unitMapByDetail.get(
            detailId
          ) || [];

        arr.push({

          ...unitPinjam,

          unit_inventaris:
            unitMap.get(
              unitPinjam
                .unit_inventaris_id
            ) || null,

          detail_pengembalian:
            pengembalianMap.get(
              unitPinjam.id
            ) || [],

        });

        unitMapByDetail.set(
          detailId,
          arr
        );

      }
    );

    // ==================================================
    // 10. MAP DETAIL KE PEMINJAMAN
    // ==================================================

    const detailMap =
      new Map();

    details.forEach(
      (detail) => {

        const arr =
          detailMap.get(
            detail.peminjaman_id
          ) || [];

        arr.push({

          ...detail,

          inventaris:
            inventarisMap.get(
              detail.inventaris_id
            ) || null,

          unit_peminjaman:
            unitMapByDetail.get(
              detail.id
            ) || [],

        });

        detailMap.set(
          detail.peminjaman_id,
          arr
        );

      }
    );

    // ==================================================
    // 11. GABUNG SEMUA DATA
    // ==================================================

    semuaData =
      rows.map(
        (p) => ({

          ...p,

          pegawai:
            pegawaiMap.get(
              p.pegawai_id
            ) || null,

          detail_peminjaman:
            detailMap.get(
              p.id
            ) || [],

        })
      );

    // ==================================================
    // 12. FILTER AWAL
    // ==================================================

    dataTerfilter =
      [...semuaData];

    currentPage = 1;

    renderTabel();

  } catch (error) {

    console.error(
      "Gagal memuat riwayat:",
      error
    );

    tbody.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="muted"
          style="
            text-align:center;
            padding:2rem;
          "
        >

          <strong>
            Gagal memuat riwayat.
          </strong>

          <div
            style="
              margin-top:.5rem;
              font-size:.85rem;
            "
          >
            ${escapeHtml(
              error?.message ||
                "Terjadi kesalahan."
            )}
          </div>

        </td>

      </tr>
    `;

    if (footerText) {

      footerText.textContent =
        "Gagal memuat data";
    }
  }
}

// ======================================================
// EVENT SEARCH
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      filterData();

    }
  );
}

// ======================================================
// EVENT TANGGAL
// ======================================================

if (tanggalInput) {

  tanggalInput.addEventListener(
    "change",
    () => {

      filterData();

    }
  );
}

// ======================================================
// EVENT SEBELUMNYA
// ======================================================

btnPrev?.addEventListener(
  "click",
  () => {

    if (
      currentPage <= 1
    ) {
      return;
    }

    currentPage--;

    renderTabel();
  }
);

// ======================================================
// EVENT BERIKUTNYA
// ======================================================

btnNext?.addEventListener(
  "click",
  () => {

    const totalPages =
      Math.max(
        Math.ceil(
          dataTerfilter.length /
            PAGE_SIZE
        ),
        1
      );

    if (
      currentPage >=
      totalPages
    ) {
      return;
    }

    currentPage++;

    renderTabel();
  }
);

// ======================================================
// LOAD AWAL
// ======================================================

muatRiwayat();