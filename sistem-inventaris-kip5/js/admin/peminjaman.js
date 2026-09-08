// =========================================================
// ADMIN - PEMINJAMAN
// =========================================================

import { supabase } from "../supabase.js";
import { cetakBastDariTransaksi } from "./bast-generator.js";

// =========================================================
// ICON
// =========================================================

const VIEW_ICON = `
<svg viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="1.8"
     width="16"
     height="16">
  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
`;

const PRINT_ICON = `
<svg viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="1.8"
     width="16"
     height="16">
  <path d="M6 9V3h12v6"/>
  <rect x="6" y="13" width="12" height="8"/>
  <path d="M6 17H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/>
</svg>
`;

// =========================================================
// HELPER
// =========================================================

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]
  );
}

function initials(value) {
  return (value || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function formatTanggal(value) {
  if (!value) return "-";

  try {
    return new Date(
      value + "T00:00:00"
    ).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatTanggalWaktu(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(
      "id-ID",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return value;
  }
}

function showToast(message, type = "error") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}

// =========================================================
// ELEMENT
// =========================================================

const modal =
  document.getElementById(
    "modal-peminjaman-baru"
  );

const pegawaiSelect =
  document.getElementById(
    "f-pegawai"
  );

const barisBarangList =
  document.getElementById(
    "baris-barang-list"
  );

const tbody =
  document.querySelector(
    "#tabel-peminjaman tbody"
  );

const titleLabel =
  document.querySelector(
    ".table-card-head h3"
  );

// Modal Tolak

const modalTolak =
  document.getElementById(
    "modal-tolak-pengajuan"
  );

const alasanInput =
  document.getElementById(
    "f-alasan-penolakan"
  );

const btnKonfirmasiTolak =
  document.getElementById(
    "btn-konfirmasi-tolak"
  );

const btnBatalTolak =
  document.getElementById(
    "btn-batal-tolak"
  );

const btnTutupTolak =
  document.getElementById(
    "btn-tutup-tolak"
  );

// =========================================================
// STATE
// =========================================================

let daftarInventaris = [];
let pengajuanYangDitolak = null;

// =========================================================
// UNIT TERSEDIA
// =========================================================

async function getUnitTersedia(inventarisId) {
  if (!inventarisId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("unit_inventaris")
    .select(`
      id,
      kode_unit,
      kondisi,
      status,
      aktif
    `)
    .eq(
      "inventaris_id",
      inventarisId
    )
    .eq(
      "aktif",
      true
    )
    .eq(
      "status",
      "tersedia"
    )
    .eq(
      "kondisi",
      "baik"
    )
    .order(
      "kode_unit",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}

// =========================================================
// LOAD DATA MODAL
// =========================================================

async function loadModalData() {
  try {

    // ---------------------------------------------
    // PEGAWAI AKTIF
    // ---------------------------------------------

    const {
      data: pegawai,
      error: pegawaiError,
    } = await supabase
      .from("profiles")
      .select(
        "id,nama"
      )
      .eq(
        "role",
        "pegawai"
      )
      .eq(
        "aktif",
        true
      )
      .order(
        "nama",
        {
          ascending: true,
        }
      );

    if (pegawaiError) {
      throw pegawaiError;
    }

    // ---------------------------------------------
    // INVENTARIS AKTIF
    // ---------------------------------------------

    const {
      data: inventaris,
      error: inventarisError,
    } = await supabase
      .from("inventaris")
      .select(`
        id,
        nama_barang,
        aktif
      `)
      .eq(
        "aktif",
        true
      )
      .order(
        "nama_barang",
        {
          ascending: true,
        }
      );

    if (inventarisError) {
      console.error(
        "Error inventaris:",
        inventarisError
      );

      throw inventarisError;
    }

    // ---------------------------------------------
    // RENDER PEGAWAI
    // ---------------------------------------------

    if (pegawaiSelect) {
      pegawaiSelect.innerHTML =
        `
        <option value="">
          Pilih pegawai…
        </option>
        ` +
        (pegawai || [])
          .map(
            (item) => `
              <option value="${escapeHtml(
                item.id
              )}">
                ${escapeHtml(
                  item.nama
                )}
              </option>
            `
          )
          .join("");
    }

    // ---------------------------------------------
    // SIMPAN INVENTARIS
    // ---------------------------------------------

    daftarInventaris =
      inventaris || [];

    resetBarisBarang();

  } catch (error) {

    console.error(
      "Gagal memuat data:",
      error
    );

    showToast(
      error?.message ||
        "Gagal memuat data pegawai/inventaris."
    );
  }
}

// =========================================================
// BUAT BARIS BARANG
// =========================================================

function buatBarisBarang() {
  if (!barisBarangList) {
    return;
  }

  const row =
    document.createElement(
      "div"
    );

  row.className =
    "form-grid-2 baris-barang-row";

  row.style.marginBottom =
    ".6rem";

  row.style.alignItems =
    "center";

  row.innerHTML = `
    <div>

      <select
        class="input f-barang-select"
      >

        <option value="">
          Pilih barang…
        </option>

        ${daftarInventaris
          .map(
            (item) => `
              <option
                value="${escapeHtml(
                  item.id
                )}"
              >
                ${escapeHtml(
                  item.nama_barang
                )}
              </option>
            `
          )
          .join("")}

      </select>

      <div
        class="muted f-unit-info"
        style="
          font-size:.72rem;
          margin-top:.25rem;
        "
      ></div>

    </div>

    <div
      style="
        display:flex;
        gap:.5rem;
      "
    >

      <input
        class="input f-barang-jumlah"
        type="number"
        min="1"
        placeholder="Jumlah"
      >

      <button
        type="button"
        class="btn btn-icon btn-hapus-baris"
        title="Hapus baris"
      >
        ×
      </button>

    </div>
  `;

  const select =
    row.querySelector(
      ".f-barang-select"
    );

  const jumlah =
    row.querySelector(
      ".f-barang-jumlah"
    );

  const hapus =
    row.querySelector(
      ".btn-hapus-baris"
    );

  // ---------------------------------------------
  // PILIH BARANG
  // ---------------------------------------------

  select?.addEventListener(
    "change",
    async () => {

      if (!select.value) {

        jumlah.value = "";

        jumlah.removeAttribute(
          "max"
        );

        jumlah.dataset.available =
          "0";

        const info =
          row.querySelector(
            ".f-unit-info"
          );

        if (info) {
          info.textContent = "";
        }

        return;
      }

      try {

        const units =
          await getUnitTersedia(
            select.value
          );

        jumlah.max =
          String(
            units.length
          );

        jumlah.dataset.available =
          String(
            units.length
          );

        const info =
          row.querySelector(
            ".f-unit-info"
          );

        if (info) {

          if (units.length > 0) {

            info.textContent =
              `${units.length} unit tersedia`;

          } else {

            info.textContent =
              "Tidak ada unit tersedia";

          }
        }

      } catch (error) {

        console.error(
          "Gagal cek unit:",
          error
        );

        const info =
          row.querySelector(
            ".f-unit-info"
          );

        if (info) {
          info.textContent =
            "Gagal mengecek stok";
        }
      }
    }
  );

  // ---------------------------------------------
  // JUMLAH
  // ---------------------------------------------

  jumlah?.addEventListener(
    "input",
    () => {

      const tersedia =
        Number(
          jumlah.dataset.available ||
            0
        );

      const nilai =
        Number(
          jumlah.value ||
            0
        );

      if (
        tersedia > 0 &&
        nilai > tersedia
      ) {

        jumlah.value =
          String(
            tersedia
          );

      }
    }
  );

  // ---------------------------------------------
  // HAPUS BARIS
  // ---------------------------------------------

  hapus?.addEventListener(
    "click",
    () => {

      const jumlahBaris =
        barisBarangList.querySelectorAll(
          ".baris-barang-row"
        ).length;

      if (
        jumlahBaris <= 1
      ) {
        return;
      }

      row.remove();
    }
  );

  barisBarangList.appendChild(
    row
  );
}

// =========================================================
// RESET BARANG
// =========================================================

function resetBarisBarang() {
  if (!barisBarangList) {
    return;
  }

  barisBarangList.innerHTML =
    "";

  buatBarisBarang();
}

// =========================================================
// TOMBOL TAMBAH BARIS
// =========================================================

document
  .getElementById(
    "btn-tambah-baris"
  )
  ?.addEventListener(
    "click",
    () => {
      buatBarisBarang();
    }
  );

// =========================================================
// BUKA MODAL PEMINJAMAN
// =========================================================

document
  .querySelector(
    '[data-modal-open="modal-peminjaman-baru"]'
  )
  ?.addEventListener(
    "click",
    () => {

      resetBarisBarang();

      const tanggal =
        document.getElementById(
          "f-tanggal"
        );

      if (
        tanggal &&
        !tanggal.value
      ) {

        const now =
          new Date();

        const yyyy =
          now.getFullYear();

        const mm =
          String(
            now.getMonth() + 1
          ).padStart(
            2,
            "0"
          );

        const dd =
          String(
            now.getDate()
          ).padStart(
            2,
            "0"
          );

        tanggal.value =
          `${yyyy}-${mm}-${dd}`;
      }
    }
  );

// =========================================================
// STATUS BADGE
// =========================================================

function statusBadge(status) {

  if (
    status === "menunggu"
  ) {
    return `
      <span class="badge badge-warn">
        Menunggu Persetujuan
      </span>
    `;
  }

  if (
    status === "ditolak"
  ) {
    return `
      <span class="badge badge-warn">
        Ditolak
      </span>
    `;
  }

  if (
    status === "dikembalikan"
  ) {
    return `
      <span class="badge badge-ok">
        Dikembalikan
      </span>
    `;
  }

  if (
    status === "disetujui"
  ) {
    return `
      <span class="badge badge-info">
        Disetujui
      </span>
    `;
  }

  return `
    <span class="badge badge-info">
      Dipinjam
    </span>
  `;
}

// =========================================================
// RENDER ROW
// =========================================================

function renderRow(item) {

  const detail =
    item.detail_peminjaman ||
    [];

  const barang =
    detail
      .map(
        (d) => {

          const nama =
            d.inventaris
              ?.nama_barang ||
            "-";

          return `
            ${escapeHtml(
              nama
            )}
            (${d.jumlah || 0})
          `;
        }
      )
      .join(", ");

  let aksi = `
    <button
      class="btn btn-icon"
      title="Lihat Detail"
      data-view-id="${escapeHtml(
        item.id
      )}"
    >
      ${VIEW_ICON}
    </button>
  `;

  if (
    item.status ===
    "menunggu"
  ) {

    aksi = `
      <button
        class="btn btn-sm btn-primary"
        data-setujui-id="${escapeHtml(
          item.id
        )}"
      >
        Setujui
      </button>

      <button
        class="btn btn-sm btn-ghost"
        data-tolak-id="${escapeHtml(
          item.id
        )}"
      >
        Tolak
      </button>

      <button
        class="btn btn-icon"
        title="Lihat Detail"
        data-view-id="${escapeHtml(
          item.id
        )}"
      >
        ${VIEW_ICON}
      </button>
    `;

  } else {

    aksi += `
      <button
        class="btn btn-icon"
        title="Cetak BAST"
        data-cetak-id="${escapeHtml(
          item.id
        )}"
      >
        ${PRINT_ICON}
      </button>
    `;
  }

  const tr =
    document.createElement(
      "tr"
    );

  tr.innerHTML = `

    <td class="strong nowrap">
      ${escapeHtml(
        item.nomor_bast ||
          "-"
      )}
    </td>

    <td>

      <span class="avatar-sm">
        ${initials(
          item.pegawai?.nama
        )}
      </span>

      ${escapeHtml(
        item.pegawai?.nama ||
          "-"
      )}

    </td>

    <td>
      ${barang || "-"}
    </td>

    <td class="muted nowrap">
      ${formatTanggal(
        item.tanggal_pinjam
      )}
    </td>

    <td class="muted">

      ${escapeHtml(
        item.keperluan ||
          "-"
      )}

      ${
        item.status ===
          "ditolak" &&
        item.alasan_penolakan
          ? `
            <div
              style="
                margin-top:.35rem;
                font-size:.75rem;
              "
            >

              <strong>
                Alasan:
              </strong>

              ${escapeHtml(
                item.alasan_penolakan
              )}

            </div>
          `
          : ""
      }

    </td>

    <td>
      ${statusBadge(
        item.status
      )}
    </td>

    <td>

      <div class="row-actions">
        ${aksi}
      </div>

    </td>

  `;

  return tr;
}

// =========================================================
// LOAD TRANSAKSI
// =========================================================

async function loadTransactions() {

  if (!tbody) {
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="7"
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

    // ---------------------------------------------
    // 1. PEMINJAMAN
    // ---------------------------------------------

    const {
      data: peminjaman,
      error: peminjamanError,
    } = await supabase
      .from("peminjaman")
      .select(`
        id,
        nomor_bast,
        pegawai_id,
        tanggal_pinjam,
        keperluan,
        status,
        alasan_penolakan,
        created_at
      `)
      .in(
        "status",
        [
          "menunggu",
          "disetujui",
          "dipinjam"
        ]
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (peminjamanError) {
      throw peminjamanError;
    }

    const dataPeminjaman =
      peminjaman || [];

    // ---------------------------------------------
    // 2. PROFILES
    // ---------------------------------------------

    const pegawaiIds = [
      ...new Set(
        dataPeminjaman
          .map(
            (item) =>
              item.pegawai_id
          )
          .filter(Boolean)
      ),
    ];

    let dataProfiles = [];

    if (
      pegawaiIds.length
    ) {

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
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

      dataProfiles =
        data || [];
    }

    // ---------------------------------------------
    // 3. DETAIL PEMINJAMAN
    // ---------------------------------------------

    const peminjamanIds =
      dataPeminjaman.map(
        (item) => item.id
      );

    let dataDetail = [];

    if (
      peminjamanIds.length
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

      dataDetail =
        data || [];
    }

    // ---------------------------------------------
    // 4. INVENTARIS
    // ---------------------------------------------

    const inventarisIds = [
      ...new Set(
        dataDetail
          .map(
            (item) =>
              item.inventaris_id
          )
          .filter(Boolean)
      ),
    ];

    let dataInventaris = [];

    if (
      inventarisIds.length
    ) {

      const {
        data,
        error,
      } = await supabase
        .from("inventaris")
        .select(`
          id,
          nama_barang,
          aktif
        `)
        .in(
          "id",
          inventarisIds
        );

      if (error) {
        throw error;
      }

      dataInventaris =
        data || [];
    }

    // ---------------------------------------------
    // MAP PROFILE
    // ---------------------------------------------

    const profileMap =
      new Map();

    dataProfiles.forEach(
      (profile) => {

        profileMap.set(
          profile.id,
          profile
        );

      }
    );

    // ---------------------------------------------
    // MAP INVENTARIS
    // ---------------------------------------------

    const inventarisMap =
      new Map();

    dataInventaris.forEach(
      (item) => {

        inventarisMap.set(
          item.id,
          item
        );

      }
    );

    // ---------------------------------------------
    // MAP DETAIL
    // ---------------------------------------------

    const detailMap =
      new Map();

    dataDetail.forEach(
      (detail) => {

        if (
          !detailMap.has(
            detail.peminjaman_id
          )
        ) {

          detailMap.set(
            detail.peminjaman_id,
            []
          );
        }

        detailMap
          .get(
            detail.peminjaman_id
          )
          .push({
            ...detail,
            inventaris:
              inventarisMap.get(
                detail.inventaris_id
              ) || null,
          });

      }
    );

    // ---------------------------------------------
    // GABUNGKAN
    // ---------------------------------------------

    const rows =
      dataPeminjaman.map(
        (item) => ({

          ...item,

          pegawai:
            profileMap.get(
              item.pegawai_id
            ) || null,

          detail_peminjaman:
            detailMap.get(
              item.id
            ) || [],

        })
      );

    // ---------------------------------------------
    // TRANSAKSI AKTIF
    // ---------------------------------------------

    const aktif =
      rows.length;

    if (titleLabel) {

      titleLabel.textContent =
        `${aktif} Transaksi Aktif`;

    }

    // ---------------------------------------------
    // RENDER
    // ---------------------------------------------

    tbody.innerHTML =
      "";

    if (!rows.length) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="muted"
            style="
              text-align:center;
              padding:2rem;
            "
          >
            Belum ada transaksi
            peminjaman.
          </td>
        </tr>
      `;

      return;
    }

    rows.forEach(
      (item) => {

        tbody.appendChild(
          renderRow(item)
        );

      }
    );

  } catch (error) {

    console.error(
      "Gagal memuat data:",
      error
    );

    tbody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="muted"
          style="
            text-align:center;
            padding:2rem;
          "
        >
          Gagal memuat data.
        </td>
      </tr>
    `;
  }
}

// =========================================================
// PEMINJAMAN BARU
// RPC ATOMIC
// =========================================================

async function buatPeminjamanBaru(event) {

  const submitBtn =
    event?.detail?.submitBtn;

  const pegawaiId =
    pegawaiSelect?.value;

  const tanggalPinjam =
    document.getElementById(
      "f-tanggal"
    )?.value;

  const keperluan =
    document
      .getElementById(
        "f-keperluan"
      )
      ?.value
      ?.trim() || "";

  if (!pegawaiId) {

    showToast(
      "Pilih pegawai peminjam."
    );

    return;
  }

  if (!tanggalPinjam) {

    showToast(
      "Tanggal peminjaman wajib diisi."
    );

    return;
  }

  if (!barisBarangList) {

    showToast(
      "Form barang tidak ditemukan."
    );

    return;
  }

  // ---------------------------------------------
  // AMBIL BARIS
  // ---------------------------------------------

  const rows = [
    ...barisBarangList.querySelectorAll(
      ".baris-barang-row"
    ),
  ]
    .map(
      (row) => {

        const inventarisId =
          row.querySelector(
            ".f-barang-select"
          )?.value || "";

        const jumlah =
          parseInt(
            row.querySelector(
              ".f-barang-jumlah"
            )?.value || "0",
            10
          ) || 0;

        return {
          inventaris_id:
            inventarisId,
          jumlah:
            jumlah,
        };
      }
    )
    .filter(
      (item) =>
        item.inventaris_id &&
        item.jumlah > 0
    );

  if (!rows.length) {

    showToast(
      "Pilih minimal satu barang."
    );

    return;
  }

  // ---------------------------------------------
  // CEK BARANG DUPLIKAT
  // ---------------------------------------------

  const sudahDipilih =
    new Set();

  for (
    const item of rows
  ) {

    if (
      sudahDipilih.has(
        item.inventaris_id
      )
    ) {

      showToast(
        "Barang yang sama tidak boleh dimasukkan dua kali."
      );

      return;
    }

    sudahDipilih.add(
      item.inventaris_id
    );
  }

  if (submitBtn) {

    submitBtn.disabled =
      true;

    submitBtn.textContent =
      "Menyimpan…";
  }

  try {

    // -------------------------------------------
    // CEK STOK
    // -------------------------------------------

    for (
      const item of rows
    ) {

      const units =
        await getUnitTersedia(
          item.inventaris_id
        );

      if (
        units.length <
        item.jumlah
      ) {

        throw new Error(
          `Stok unit tidak mencukupi. Tersedia ${units.length}, diminta ${item.jumlah}.`
        );
      }
    }

    // -------------------------------------------
    // RPC ATOMIC
    // -------------------------------------------

    const {
      data,
      error,
    } = await supabase.rpc(
      "proses_peminjaman_unit",
      {
        p_pegawai_id:
          pegawaiId,

        p_tanggal_pinjam:
          tanggalPinjam,

        p_keperluan:
          keperluan,

        p_items:
          rows,
      }
    );

    if (error) {
      throw error;
    }

    if (
      !data ||
      data.success !== true
    ) {

      throw new Error(
        data?.message ||
          "Peminjaman gagal disimpan."
      );
    }

    // -------------------------------------------
    // BERHASIL
    // -------------------------------------------

    if (modal) {

      modal.classList.remove(
        "open"
      );
    }

    showToast(
      `Peminjaman berhasil disimpan. Nomor BAST: ${
        data.nomor_bast || "-"
      }`,
      "success"
    );

    await loadTransactions();

    await loadModalData();

  } catch (error) {

    console.error(
      "Gagal menyimpan peminjaman:",
      error
    );

    showToast(
      error?.message ||
        "Gagal menyimpan peminjaman."
    );

  } finally {

    if (submitBtn) {

      submitBtn.disabled =
        false;

      submitBtn.textContent =
        "Simpan & Buat BAST";
    }
  }
}

// =========================================================
// SUBMIT MODAL
// =========================================================

modal?.addEventListener(
  "modal:submit",
  buatPeminjamanBaru
);

// =========================================================
// SETUJUI PENGAJUAN
// =========================================================

async function setujuiPengajuan(id) {

  try {

    // ---------------------------------------------
    // AMBIL PEMINJAMAN
    // ---------------------------------------------

    const {
      data: peminjaman,
      error: peminjamanError,
    } = await supabase
      .from("peminjaman")
      .select(`
        id,
        status
      `)
      .eq(
        "id",
        id
      )
      .single();

    if (peminjamanError) {
      throw peminjamanError;
    }

    if (
      !peminjaman ||
      peminjaman.status !==
        "menunggu"
    ) {

      throw new Error(
        "Pengajuan ini sudah diproses atau tidak ditemukan."
      );
    }

    // ---------------------------------------------
    // DETAIL
    // ---------------------------------------------

    const {
      data: details,
      error: detailError,
    } = await supabase
      .from(
        "detail_peminjaman"
      )
      .select(`
        id,
        inventaris_id,
        jumlah
      `)
      .eq(
        "peminjaman_id",
        id
      );

    if (detailError) {
      throw detailError;
    }

    if (
      !details ||
      !details.length
    ) {

      throw new Error(
        "Detail barang pengajuan tidak ditemukan."
      );
    }

    // ---------------------------------------------
    // SIAPKAN ALOKASI
    // ---------------------------------------------

    const allocations =
      [];

    for (
      const detail of details
    ) {

      const units =
        await getUnitTersedia(
          detail.inventaris_id
        );

      if (
        units.length <
        detail.jumlah
      ) {

        throw new Error(
          `Unit tersedia tidak mencukupi. Diminta ${detail.jumlah}, tersedia ${units.length}.`
        );
      }

      allocations.push({

        detail:
          detail,

        units:
          units.slice(
            0,
            detail.jumlah
          ),

      });
    }

    // ---------------------------------------------
    // NOMOR BAST
    // ---------------------------------------------

    const {
      data: nomorBast,
      error: nomorError,
    } = await supabase.rpc(
      "generate_nomor_bast"
    );

    if (nomorError) {
      throw nomorError;
    }

    if (!nomorBast) {

      throw new Error(
        "Nomor BAST gagal dibuat."
      );
    }

    // ---------------------------------------------
    // INSERT UNIT PEMINJAMAN
    // ---------------------------------------------

    for (
      const allocation of allocations
    ) {

      const dataUnit =
        allocation.units.map(
          (unit) => ({

            detail_peminjaman_id:
              allocation
                .detail
                .id,

            unit_inventaris_id:
              unit.id,

            kondisi_saat_pinjam:
              unit.kondisi ||
              "baik",

          })
        );

      const {
        error:
          unitError,
      } = await supabase
        .from(
          "unit_peminjaman"
        )
        .insert(
          dataUnit
        );

      if (unitError) {
        throw unitError;
      }

      // -------------------------------------------
      // UPDATE UNIT
      // -------------------------------------------

      const unitIds =
        allocation.units.map(
          (unit) =>
            unit.id
        );

      const {
        error:
          updateUnitError,
      } = await supabase
        .from(
          "unit_inventaris"
        )
        .update({
          status:
            "dipinjam",
        })
        .in(
          "id",
          unitIds
        )
        .eq(
          "aktif",
          true
        );

      if (
        updateUnitError
      ) {
        throw updateUnitError;
      }
    }

    // ---------------------------------------------
    // USER ADMIN
    // ---------------------------------------------

    let adminId =
      null;

    try {

      const {
        data,
      } =
        await supabase.auth.getUser();

      adminId =
        data?.user?.id ||
        null;

    } catch {

      adminId =
        null;
    }

    // ---------------------------------------------
    // UPDATE PEMINJAMAN
    // ---------------------------------------------

    const updateData = {

      nomor_bast:
        nomorBast,

      status:
        "dipinjam",

      alasan_penolakan:
        null,

      approved_at:
        new Date().toISOString(),

    };

    if (adminId) {

      updateData.approved_by =
        adminId;
    }

    const {
      error: updateError,
    } = await supabase
      .from("peminjaman")
      .update(
        updateData
      )
      .eq(
        "id",
        id
      )
      .eq(
        "status",
        "menunggu"
      );

    if (updateError) {
      throw updateError;
    }

    showToast(
      `Pengajuan disetujui. Nomor BAST: ${nomorBast}`,
      "success"
    );

    await loadTransactions();

    await loadModalData();

  } catch (error) {

    console.error(
      "Gagal menyetujui pengajuan:",
      error
    );

    showToast(
      error?.message ||
        "Gagal menyetujui pengajuan."
    );
  }
}

// =========================================================
// BUKA MODAL TOLAK
// =========================================================

function bukaModalTolak(id) {

  pengajuanYangDitolak =
    id;

  if (alasanInput) {

    alasanInput.value =
      "";
  }

  modalTolak?.classList.add(
    "open"
  );

  setTimeout(
    () => {
      alasanInput?.focus();
    },
    100
  );
}

// =========================================================
// TUTUP MODAL TOLAK
// =========================================================

function tutupModalTolak() {

  pengajuanYangDitolak =
    null;

  if (alasanInput) {

    alasanInput.value =
      "";
  }

  modalTolak?.classList.remove(
    "open"
  );
}

btnBatalTolak?.addEventListener(
  "click",
  tutupModalTolak
);

btnTutupTolak?.addEventListener(
  "click",
  tutupModalTolak
);

modalTolak?.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      modalTolak
    ) {

      tutupModalTolak();
    }
  }
);

// =========================================================
// KONFIRMASI TOLAK
// =========================================================

btnKonfirmasiTolak?.addEventListener(
  "click",
  async () => {

    if (
      !pengajuanYangDitolak
    ) {
      return;
    }

    const alasan =
      alasanInput?.value
        ?.trim();

    if (!alasan) {

      showToast(
        "Alasan penolakan wajib diisi."
      );

      return;
    }

    btnKonfirmasiTolak.disabled =
      true;

    try {

      const {
        error,
      } = await supabase
        .from("peminjaman")
        .update({

          status:
            "ditolak",

          alasan_penolakan:
            alasan,

        })
        .eq(
          "id",
          pengajuanYangDitolak
        )
        .eq(
          "status",
          "menunggu"
        );

      if (error) {
        throw error;
      }

      showToast(
        "Pengajuan berhasil ditolak.",
        "success"
      );

      tutupModalTolak();

      await loadTransactions();

    } catch (error) {

      console.error(
        "Gagal menolak pengajuan:",
        error
      );

      showToast(
        error?.message ||
          "Gagal menolak pengajuan."
      );

    } finally {

      btnKonfirmasiTolak.disabled =
        false;
    }
  }
);

// =========================================================
// MODAL DETAIL
// DIBUAT OTOMATIS
// TIDAK PERLU TAMBAH HTML
// =========================================================

function buatModalDetail() {

  let modalDetail =
    document.getElementById(
      "modal-detail-peminjaman"
    );

  if (modalDetail) {
    return modalDetail;
  }

  modalDetail =
    document.createElement(
      "div"
    );

  modalDetail.id =
    "modal-detail-peminjaman";

  modalDetail.className =
    "modal-overlay";

  modalDetail.innerHTML = `
    <div
      class="modal-box"
      style="
        width:min(900px,94vw);
        max-height:90vh;
        overflow:auto;
      "
    >

      <div class="modal-head">

        <h3
          id="detail-peminjaman-title"
        >
          Detail Peminjaman
        </h3>

        <button
          type="button"
          class="modal-close"
          id="btn-tutup-detail"
        >
          &times;
        </button>

      </div>

      <div
        class="modal-body"
        id="detail-peminjaman-body"
      >
        Memuat detail…
      </div>

      <div class="modal-foot">

        <button
          type="button"
          class="btn btn-ghost"
          id="btn-tutup-detail-2"
        >
          Tutup
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    modalDetail
  );

  function tutup() {

    modalDetail.classList.remove(
      "open"
    );
  }

  modalDetail
    .querySelector(
      "#btn-tutup-detail"
    )
    ?.addEventListener(
      "click",
      tutup
    );

  modalDetail
    .querySelector(
      "#btn-tutup-detail-2"
    )
    ?.addEventListener(
      "click",
      tutup
    );

  modalDetail.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        modalDetail
      ) {

        tutup();
      }
    }
  );

  return modalDetail;
}

// =========================================================
// LIHAT DETAIL
// =========================================================

async function lihatDetail(
  peminjamanId
) {

  if (!peminjamanId) {
    return;
  }

  const modalDetail =
    buatModalDetail();

  const title =
    modalDetail.querySelector(
      "#detail-peminjaman-title"
    );

  const body =
    modalDetail.querySelector(
      "#detail-peminjaman-body"
    );

  if (title) {

    title.textContent =
      "Detail Peminjaman";
  }

  if (body) {

    body.innerHTML = `
      <div
        style="
          text-align:center;
          padding:2rem;
        "
      >
        Memuat detail…
      </div>
    `;
  }

  modalDetail.classList.add(
    "open"
  );

  try {

    // ---------------------------------------------
    // PEMINJAMAN
    // ---------------------------------------------

    const {
      data: peminjaman,
      error:
        peminjamanError,
    } = await supabase
      .from("peminjaman")
      .select(`
        id,
        nomor_bast,
        pegawai_id,
        tanggal_pinjam,
        keperluan,
        status,
        alasan_penolakan,
        created_at,
        approved_at
      `)
      .eq(
        "id",
        peminjamanId
      )
      .single();

    if (peminjamanError) {
      throw peminjamanError;
    }

    // ---------------------------------------------
    // PROFILE
    // ---------------------------------------------

    let profile =
      null;

    if (
      peminjaman.pegawai_id
    ) {

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "id,nama"
        )
        .eq(
          "id",
          peminjaman.pegawai_id
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      profile =
        data;
    }

    // ---------------------------------------------
    // DETAIL
    // ---------------------------------------------

    const {
      data: details,
      error: detailError,
    } = await supabase
      .from(
        "detail_peminjaman"
      )
      .select(`
        id,
        inventaris_id,
        jumlah
      `)
      .eq(
        "peminjaman_id",
        peminjamanId
      );

    if (detailError) {
      throw detailError;
    }

    const detailRows =
      details || [];

    // ---------------------------------------------
    // INVENTARIS
    // ---------------------------------------------

    const inventarisIds = [
      ...new Set(
        detailRows
          .map(
            (item) =>
              item.inventaris_id
          )
          .filter(Boolean)
      ),
    ];

    let inventarisRows =
      [];

    if (
      inventarisIds.length
    ) {

      const {
        data,
        error,
      } = await supabase
        .from("inventaris")
        .select(`
          id,
          nama_barang,
          aktif
        `)
        .in(
          "id",
          inventarisIds
        );

      if (error) {
        throw error;
      }

      inventarisRows =
        data || [];
    }

    const inventarisMap =
      new Map();

    inventarisRows.forEach(
      (item) => {

        inventarisMap.set(
          item.id,
          item
        );
      }
    );

    // ---------------------------------------------
    // UNIT PEMINJAMAN
    // ---------------------------------------------

    const detailIds =
      detailRows.map(
        (item) =>
          item.id
      );

    let unitPeminjamanRows =
      [];

    if (
      detailIds.length
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

      unitPeminjamanRows =
        data || [];
    }

    // ---------------------------------------------
    // UNIT INVENTARIS
    // ---------------------------------------------

    const unitIds = [
      ...new Set(
        unitPeminjamanRows
          .map(
            (item) =>
              item.unit_inventaris_id
          )
          .filter(Boolean)
      ),
    ];

    let unitRows =
      [];

    if (
      unitIds.length
    ) {

      const {
        data,
        error,
      } = await supabase
        .from(
          "unit_inventaris"
        )
        .select(`
          id,
          kode_unit,
          kondisi,
          status,
          aktif
        `)
        .in(
          "id",
          unitIds
        );

      if (error) {
        throw error;
      }

      unitRows =
        data || [];
    }

    const unitMap =
      new Map();

    unitRows.forEach(
      (unit) => {

        unitMap.set(
          unit.id,
          unit
        );
      }
    );

    // ---------------------------------------------
    // UNIT BERDASARKAN DETAIL
    // ---------------------------------------------

    const unitByDetail =
      new Map();

    unitPeminjamanRows.forEach(
      (item) => {

        if (
          !unitByDetail.has(
            item.detail_peminjaman_id
          )
        ) {

          unitByDetail.set(
            item.detail_peminjaman_id,
            []
          );
        }

        unitByDetail
          .get(
            item.detail_peminjaman_id
          )
          .push({

            ...item,

            unit:
              unitMap.get(
                item.unit_inventaris_id
              ) || null,

          });

      }
    );

    // ---------------------------------------------
    // TITLE
    // ---------------------------------------------

    if (title) {

      title.textContent =
        `Detail Peminjaman — ${
          peminjaman.nomor_bast ||
          "-"
        }`;
    }

    // ---------------------------------------------
    // BARANG
    // ---------------------------------------------

    const barangHTML =
      detailRows
        .map(
          (
            detail,
            index
          ) => {

            const barang =
              inventarisMap.get(
                detail.inventaris_id
              );

            const units =
              unitByDetail.get(
                detail.id
              ) || [];

            return `
              <div
                style="
                  border:1px solid #e5e7eb;
                  border-radius:10px;
                  padding:1rem;
                  margin-bottom:1rem;
                "
              >

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:1rem;
                    margin-bottom:.75rem;
                  "
                >

                  <div>

                    <strong>
                      ${escapeHtml(
                        barang
                          ?.nama_barang ||
                          "Barang"
                      )}
                    </strong>

                  </div>

                  <span
                    class="badge badge-info"
                  >
                    Jumlah:
                    ${detail.jumlah || 0}
                  </span>

                </div>

                ${
                  units.length
                    ? `

                      <div
                        style="
                          display:grid;
                          gap:.5rem;
                        "
                      >

                        ${units
                          .map(
                            (item) => `

                              <div
                                style="
                                  display:flex;
                                  justify-content:space-between;
                                  align-items:center;
                                  padding:.6rem .75rem;
                                  border-radius:8px;
                                  background:#f8fafc;
                                "
                              >

                                <div>

                                  <strong>
                                    ${escapeHtml(
                                      item
                                        .unit
                                        ?.kode_unit ||
                                        "-"
                                    )}
                                  </strong>

                                  <div
                                    class="muted"
                                    style="
                                      font-size:.75rem;
                                    "
                                  >
                                    Kondisi saat pinjam:
                                    ${escapeHtml(
                                      item
                                        .kondisi_saat_pinjam ||
                                        "baik"
                                    )}
                                  </div>

                                </div>

                                <span class="badge">
                                  ${escapeHtml(
                                    item
                                      .unit
                                      ?.status ||
                                      "-"
                                  )}
                                </span>

                              </div>

                            `
                          )
                          .join("")}

                      </div>

                    `
                    : `

                      <div class="muted">
                        Belum ada unit fisik
                        yang dialokasikan.
                      </div>

                    `
                }

              </div>
            `;
          }
        )
        .join("");

    // ---------------------------------------------
    // ALASAN DITOLAK
    // ---------------------------------------------

    const alasanHTML =
      peminjaman.status ===
        "ditolak" &&
      peminjaman.alasan_penolakan
        ? `

          <div
            style="
              margin-top:1rem;
              padding:1rem;
              border-radius:10px;
              background:#fff7ed;
            "
          >

            <strong>
              Alasan Penolakan
            </strong>

            <div
              style="
                margin-top:.35rem;
              "
            >
              ${escapeHtml(
                peminjaman
                  .alasan_penolakan
              )}
            </div>

          </div>

        `
        : "";

    // ---------------------------------------------
    // RENDER DETAIL
    // ---------------------------------------------

    if (body) {

      body.innerHTML = `

        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(200px,1fr));
            gap:1rem;
            margin-bottom:1.25rem;
          "
        >

          <div>

            <div
              class="muted"
              style="font-size:.75rem;"
            >
              Nomor BAST
            </div>

            <strong>
              ${escapeHtml(
                peminjaman
                  .nomor_bast ||
                  "-"
              )}
            </strong>

          </div>

          <div>

            <div
              class="muted"
              style="font-size:.75rem;"
            >
              Pegawai
            </div>

            <strong>
              ${escapeHtml(
                profile?.nama ||
                  "-"
              )}
            </strong>

          </div>

          <div>

            <div
              class="muted"
              style="font-size:.75rem;"
            >
              Tanggal Pinjam
            </div>

            <strong>
              ${formatTanggal(
                peminjaman
                  .tanggal_pinjam
              )}
            </strong>

          </div>

          <div>

            <div
              class="muted"
              style="font-size:.75rem;"
            >
              Status
            </div>

            ${statusBadge(
              peminjaman.status
            )}

          </div>

          <div>

            <div
              class="muted"
              style="font-size:.75rem;"
            >
              Keperluan
            </div>

            <strong>
              ${escapeHtml(
                peminjaman
                  .keperluan ||
                  "-"
              )}
            </strong>

          </div>

          <div>

            <div
              class="muted"
              style="font-size:.75rem;"
            >
              Dibuat
            </div>

            <strong>
              ${formatTanggalWaktu(
                peminjaman
                  .created_at
              )}
            </strong>

          </div>

        </div>

        <h4
          style="
            margin:0 0 .75rem;
          "
        >
          Barang yang Dipinjam
        </h4>

        ${
          barangHTML ||
          `
            <div class="muted">
              Tidak ada detail barang.
            </div>
          `
        }

        ${alasanHTML}

      `;
    }

  } catch (error) {

    console.error(
      "Gagal memuat detail:",
      error
    );

    if (body) {

      body.innerHTML = `
        <div
          style="
            text-align:center;
            padding:2rem;
          "
        >

          <strong>
            Gagal memuat detail.
          </strong>

          <div
            class="muted"
            style="
              margin-top:.5rem;
            "
          >
            ${escapeHtml(
              error?.message ||
                "Terjadi kesalahan."
            )}
          </div>

        </div>
      `;
    }
  }
}

// =========================================================
// EVENT TABEL
// =========================================================

tbody?.addEventListener(
  "click",
  async (event) => {

    // ---------------------------------------------
    // CETAK BAST
    // ---------------------------------------------

    const btnCetak =
      event.target.closest(
        "[data-cetak-id]"
      );

    if (btnCetak) {

      try {

        await cetakBastDariTransaksi(
          btnCetak.dataset
            .cetakId
        );

      } catch (error) {

        console.error(
          "Gagal cetak BAST:",
          error
        );

        showToast(
          error?.message ||
            "Gagal mencetak BAST."
        );
      }

      return;
    }

    // ---------------------------------------------
    // SETUJUI
    // ---------------------------------------------

    const btnSetujui =
      event.target.closest(
        "[data-setujui-id]"
      );

    if (btnSetujui) {

      const yakin =
        confirm(
          "Setujui pengajuan ini?\n\n" +
          "Unit tersedia akan digunakan untuk peminjaman."
        );

      if (!yakin) {
        return;
      }

      btnSetujui.disabled =
        true;

      try {

        await setujuiPengajuan(
          btnSetujui.dataset
            .setujuiId
        );

      } finally {

        btnSetujui.disabled =
          false;
      }

      return;
    }

    // ---------------------------------------------
    // TOLAK
    // ---------------------------------------------

    const btnTolak =
      event.target.closest(
        "[data-tolak-id]"
      );

    if (btnTolak) {

      bukaModalTolak(
        btnTolak.dataset
          .tolakId
      );

      return;
    }

    // ---------------------------------------------
    // LIHAT DETAIL
    // ---------------------------------------------

    const btnView =
      event.target.closest(
        "[data-view-id]"
      );

    if (btnView) {

      await lihatDetail(
        btnView.dataset
          .viewId
      );

      return;
    }
  }
);

// =========================================================
// INITIAL
// =========================================================

loadModalData();
loadTransactions();