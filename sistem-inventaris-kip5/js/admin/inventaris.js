// ============================================================
// ADMIN - MANAJEMEN INVENTARIS
// Inventaris berbasis unit fisik.
//
// inventaris       = master / jenis barang
// unit_inventaris  = setiap unit fisik
//
// Status unit:
// tersedia / dipinjam / rusak / hilang
//
// Kondisi unit:
// baik / rusak / hilang / tidak_lengkap
//
// Barang master:
// aktif = true  -> tampil dan bisa digunakan
// aktif = false -> nonaktif, tetapi riwayat tetap aman
//
// UNIT:
// aktif = true  -> unit aktif dan dihitung
// aktif = false -> unit nonaktif, tetapi riwayat tetap aman
// ============================================================

import { supabase } from "../supabase.js";


// ============================================================
// ICON
// ============================================================

const EDIT_ICON = `
<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  width="16"
  height="16"
>
  <path d="M12 20h9"/>
  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
</svg>
`;

const DELETE_ICON = `
<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  width="16"
  height="16"
>
  <path d="M4 7h16"/>
  <path d="M10 11v6"/>
  <path d="M14 11v6"/>
  <path d="M6 7l1 13h10l1-13"/>
  <path d="M9 7V4h6v3"/>
</svg>
`;


// ============================================================
// ELEMENT
// ============================================================

const tbody =
  document.querySelector("#tabel-inventaris tbody");

const countLabel =
  document.querySelector(".table-card-head h3");

const tableFoot =
  document.querySelector(".table-foot span");

const tableFootContainer =
  document.querySelector(".table-foot");

const modal =
  document.getElementById("modal-tambah-barang");

const filterStatus =
  document.querySelector("#filter-status-inventaris");

const modalHapus =
  document.getElementById("modal-confirm-delete");


// ============================================================
// STATE
// ============================================================

let daftarInventaris = [];
let daftarUnit = [];

let editIdAktif = null;
let recoveryModal = null;


// ============================================================
// PAGINATION
// ============================================================

const PAGE_SIZE = 5;

let currentPage = 1;


// ============================================================
// HELPER
// ============================================================

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]
  );
}


function kondisiLabel(kondisi) {
  return ({
    baik: "Baik",
    rusak: "Rusak",
    hilang: "Hilang",
    tidak_lengkap: "Tidak Lengkap",
  })[kondisi] || kondisi || "-";
}


function statusLabel(status) {
  return ({
    tersedia: "Tersedia",
    dipinjam: "Dipinjam",
    rusak: "Rusak",
    hilang: "Hilang",
  })[status] || status || "-";
}


function badge(text, cls = "") {
  return `
    <span class="badge ${cls}">
      ${escapeHtml(text)}
    </span>
  `;
}


// ============================================================
// PAGINATION CONTROL
// ============================================================

function ensurePaginationControls() {

  if (!tableFootContainer) {
    return;
  }


  let controls =
    tableFootContainer.querySelector(
      ".inventaris-pagination"
    );


  if (!controls) {

    controls =
      document.createElement("div");

    controls.className =
      "inventaris-pagination";

    controls.style.display =
      "flex";

    controls.style.gap =
      ".4rem";

    controls.style.alignItems =
      "center";


    const oldButtons =
      tableFootContainer.querySelectorAll(
        "button"
      );


    if (oldButtons.length >= 2) {

      oldButtons[0].id =
        "btn-prev-inventaris";

      oldButtons[0].textContent =
        "Sebelumnya";


      oldButtons[1].id =
        "btn-next-inventaris";

      oldButtons[1].textContent =
        "Berikutnya";


      controls.appendChild(
        oldButtons[0]
      );

      controls.appendChild(
        oldButtons[1]
      );

    } else {

      const prev =
        document.createElement(
          "button"
        );

      prev.className =
        "btn btn-ghost btn-sm";

      prev.id =
        "btn-prev-inventaris";

      prev.textContent =
        "Sebelumnya";


      const next =
        document.createElement(
          "button"
        );

      next.className =
        "btn btn-ghost btn-sm";

      next.id =
        "btn-next-inventaris";

      next.textContent =
        "Berikutnya";


      controls.appendChild(prev);
      controls.appendChild(next);
    }


    tableFootContainer.appendChild(
      controls
    );
  }


  return {
    prev:
      document.getElementById(
        "btn-prev-inventaris"
      ),

    next:
      document.getElementById(
        "btn-next-inventaris"
      ),
  };
}


// ============================================================
// DATA HASIL FILTER
// ============================================================

function getFilteredItems() {

  const searchInput =
    document.querySelector(
      '[data-table-search="tabel-inventaris"]'
    );


  const keyword =
    searchInput?.value
      ?.trim()
      .toLowerCase() || "";


  const pilihan =
    filterStatus?.value ||
    "semua";


  return daftarInventaris.filter(
    item => {

      const info =
        ringkasanUnit(item.id);


      const searchText =
        [
          item.kode,
          item.nama_barang,
          item.merk,
          item.tahun_perolehan,
          item.spesifikasi,
        ]
          .map(
            value =>
              String(
                value ?? ""
              ).toLowerCase()
          )
          .join(" ");


      const textOk =
        !keyword ||
        searchText.includes(
          keyword
        );


      if (!textOk) {
        return false;
      }


      if (
        pilihan ===
        "semua"
      ) {
        return true;
      }


      if (
        pilihan ===
        "tersedia"
      ) {
        return info.tersedia > 0;
      }


      if (
        pilihan ===
        "dipinjam"
      ) {
        return info.dipinjam > 0;
      }


      if (
        pilihan ===
        "rusak"
      ) {
        return info.rusak > 0;
      }


      if (
        pilihan ===
        "hilang"
      ) {
        return info.hilang > 0;
      }


      if (
        pilihan ===
        "tidak_lengkap"
      ) {
        return info.tidak_lengkap > 0;
      }


      return true;
    }
  );
}


// ============================================================
// RENDER PAGINATION
// ============================================================

function renderPagination(
  totalItems
) {

  const controls =
    ensurePaginationControls();


  if (!controls) {
    return;
  }


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalItems /
        PAGE_SIZE
      )
    );


  if (
    currentPage >
    totalPages
  ) {
    currentPage =
      totalPages;
  }


  if (currentPage < 1) {
    currentPage = 1;
  }


  if (controls.prev) {

    controls.prev.disabled =
      currentPage <= 1;
  }


  if (controls.next) {

    controls.next.disabled =
      currentPage >=
      totalPages;
  }


  if (
    totalItems === 0
  ) {

    if (tableFoot) {

      tableFoot.textContent =
        "Tidak ada barang";
    }

    return;
  }


  const start =
    (
      (currentPage - 1) *
      PAGE_SIZE
    ) + 1;


  const end =
    Math.min(
      currentPage *
      PAGE_SIZE,
      totalItems
    );


  if (tableFoot) {

    tableFoot.textContent =
      `Menampilkan ${start}–${end} dari ${totalItems} barang`;
  }
}


// ============================================================
// RENDER TABLE
// ============================================================

function renderTable() {

  if (!tbody) {
    return;
  }


  const filteredItems =
    getFilteredItems();


  const totalItems =
    filteredItems.length;


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalItems /
        PAGE_SIZE
      )
    );


  if (
    currentPage >
    totalPages
  ) {
    currentPage =
      totalPages;
  }


  if (
    currentPage < 1
  ) {
    currentPage = 1;
  }


  const startIndex =
    (
      currentPage - 1
    ) *
    PAGE_SIZE;


  const pageItems =
    filteredItems.slice(
      startIndex,
      startIndex +
        PAGE_SIZE
    );


  tbody.innerHTML = "";


  if (!pageItems.length) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="muted"
          style="
            text-align:center;
            padding:2rem
          "
        >
          Tidak ada barang yang sesuai dengan pencarian/filter.
        </td>
      </tr>
    `;

  } else {

    pageItems.forEach(
      item => {

        tbody.appendChild(
          renderRow(item)
        );
      }
    );
  }


  renderPagination(
    totalItems
  );
}


// ============================================================
// RINGKASAN UNIT
// ============================================================
// Hanya unit aktif yang dihitung.
//
// Unit aktif=false tetap ada di database untuk menjaga
// riwayat transaksi, tetapi tidak dihitung sebagai stok aktif.
// ============================================================

function ringkasanUnit(
  inventarisId
) {

  const units =
    daftarUnit.filter(
      unit =>
        unit.inventaris_id ===
          inventarisId &&
        unit.aktif !== false
    );


  return {

    total:
      units.length,

    tersedia:
      units.filter(
        unit =>
          unit.status ===
            "tersedia" &&
          unit.kondisi ===
            "baik"
      ).length,

    dipinjam:
      units.filter(
        unit =>
          unit.status ===
          "dipinjam"
      ).length,

    rusak:
      units.filter(
        unit =>
          unit.status ===
            "rusak" ||
          unit.kondisi ===
            "rusak"
      ).length,

    hilang:
      units.filter(
        unit =>
          unit.status ===
            "hilang" ||
          unit.kondisi ===
            "hilang"
      ).length,

    tidak_lengkap:
      units.filter(
        unit =>
          unit.kondisi ===
          "tidak_lengkap"
      ).length,

    units,
  };
}


// ============================================================
// SEMUA UNIT BERDASARKAN INVENTARIS
// ============================================================

function semuaUnitInventaris(
  inventarisId
) {

  return daftarUnit
    .filter(
      unit =>
        unit.inventaris_id ===
        inventarisId
    )
    .sort(
      (a, b) =>
        String(
          a.kode_unit || ""
        ).localeCompare(
          String(
            b.kode_unit || ""
          )
        )
    );
}


// ============================================================
// STATUS DISPLAY
// ============================================================

function renderStatus(
  info
) {

  const out = [];


  if (info.tersedia) {

    out.push(
      badge(
        `🟢 Tersedia: ${info.tersedia}`,
        "badge-ok"
      )
    );
  }


  if (info.dipinjam) {

    out.push(
      badge(
        `🔵 Dipinjam: ${info.dipinjam}`,
        "badge-info"
      )
    );
  }


  if (info.rusak) {

    out.push(
      badge(
        `🔴 Rusak: ${info.rusak}`,
        "badge-warn"
      )
    );
  }


  if (info.hilang) {

    out.push(
      badge(
        `⚫ Hilang: ${info.hilang}`,
        "badge-bad"
      )
    );
  }


  if (info.tidak_lengkap) {

    out.push(
      badge(
        `🟠 Tidak Lengkap: ${info.tidak_lengkap}`,
        "badge-warn"
      )
    );
  }


  if (!out.length) {

    out.push(
      badge(
        "Belum ada unit",
        "badge-bad"
      )
    );
  }


  return `
    <div
      style="
        display:flex;
        flex-wrap:wrap;
        gap:.35rem
      "
    >
      ${out.join("")}
    </div>
  `;
}


// ============================================================
// UNIT BERMASALAH
// ============================================================

function problematicUnits(
  info
) {

  return info.units.filter(
    unit =>
      [
        "rusak",
        "hilang",
      ].includes(
        unit.status
      ) ||
      [
        "rusak",
        "hilang",
        "tidak_lengkap",
      ].includes(
        unit.kondisi
      )
  );
}


// ============================================================
// RENDER ROW
// ============================================================

function renderRow(
  item
) {

  const info =
    ringkasanUnit(
      item.id
    );


  const editJson =
    JSON.stringify({

      kode:
        item.kode || "",

      nama:
        item.nama_barang || "",

      merk:
        item.merk || "",

      tahun:
        item.tahun_perolehan || "",

      jumlah:
        info.total ||
        Number(item.total) ||
        0,

      spesifikasi:
        item.spesifikasi || "",

      charger:
        item.charger || "",

    }).replace(
      /"/g,
      "&quot;"
    );


  const tr =
    document.createElement(
      "tr"
    );


  // ==========================================================
  // DATA FILTER
  // ==========================================================

  tr.dataset.statusTersedia =
    info.tersedia > 0
      ? "tersedia"
      : "";

  tr.dataset.statusDipinjam =
    info.dipinjam > 0
      ? "dipinjam"
      : "";

  tr.dataset.statusRusak =
    info.rusak > 0
      ? "rusak"
      : "";

  tr.dataset.statusHilang =
    info.hilang > 0
      ? "hilang"
      : "";

  tr.dataset.statusTidak_lengkap =
    info.tidak_lengkap > 0
      ? "tidak_lengkap"
      : "";


  const pUnits =
    problematicUnits(
      info
    );


  // ==========================================================
  // HTML ROW
  // ==========================================================

  tr.innerHTML = `

    <td class="strong nowrap">
      ${escapeHtml(
        item.kode
      )}
    </td>

    <td>
      ${escapeHtml(
        item.nama_barang
      )}
    </td>

    <td class="muted">
      ${escapeHtml(
        item.merk
      )}
    </td>

    <td class="muted nowrap">
      ${escapeHtml(
        item.tahun_perolehan
      )}
    </td>

    <td>
      ${info.total}
    </td>

    <td>
      ${info.tersedia}
    </td>

    <td>
      ${info.dipinjam}
    </td>

    <td>
      ${renderStatus(
        info
      )}
    </td>

    <td>

      <div class="row-actions">

        <!-- DETAIL UNIT -->

        <button
          class="btn btn-icon"
          data-detail-unit="${item.id}"
          title="Lihat unit"
        >
          ▦
        </button>


        <!-- EDIT -->

        <button
          class="btn btn-icon"
          data-edit='${editJson}'
          data-edit-id="${item.id}"
          data-modal-open="modal-tambah-barang"
          title="Ubah"
        >
          ${EDIT_ICON}
        </button>


        <!-- PULIHKAN -->

        ${
          pUnits.length
            ? `
              <button
                class="btn btn-icon"
                data-pulihkan-unit="${item.id}"
                title="Pulihkan unit bermasalah"
              >
                ✓
              </button>
            `
            : ""
        }


        <!-- NONAKTIFKAN -->

        <button
          class="btn btn-icon"
          data-confirm-delete="modal-confirm-delete"
          data-delete-id="${item.id}"
          data-delete-label="${escapeHtml(
            item.nama_barang
          )} (${escapeHtml(
            item.kode
          )})"
          title="Nonaktifkan"
        >
          ${DELETE_ICON}
        </button>

      </div>

    </td>
  `;


  return tr;
}


// ============================================================
// FILTER STATUS
// ============================================================

function terapkanFilterStatus() {

  currentPage = 1;

  renderTable();
}


// ============================================================
// LOAD DATA
// ============================================================

async function muatData() {

  if (!tbody) {
    return;
  }


  tbody.innerHTML = `
    <tr>
      <td
        colspan="9"
        class="muted"
        style="
          text-align:center;
          padding:2rem
        "
      >
        Memuat data…
      </td>
    </tr>
  `;


  const [
    invRes,
    unitRes,
  ] = await Promise.all([

    // ========================================================
    // HANYA BARANG MASTER AKTIF
    // ========================================================

    supabase
      .from("inventaris")
      .select("*")
      .eq(
        "aktif",
        true
      )
      .order(
        "kode",
        {
          ascending:
            true,
        }
      ),


    // ========================================================
    // SEMUA UNIT
    // ========================================================

    supabase
      .from(
        "unit_inventaris"
      )
      .select(`
        id,
        inventaris_id,
        kode_unit,
        kondisi,
        status,
        keterangan,
        aktif,
        created_at
      `)
      .order(
        "kode_unit",
        {
          ascending:
            true,
        }
      ),

  ]);


  if (
    invRes.error ||
    unitRes.error
  ) {

    console.error(
      "Gagal memuat inventaris/unit:",
      invRes.error ||
        unitRes.error
    );


    tbody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="muted"
          style="
            text-align:center;
            padding:2rem
          "
        >
          Gagal memuat data inventaris.
        </td>
      </tr>
    `;


    if (tableFoot) {

      tableFoot.textContent =
        "Gagal memuat data";
    }


    return;
  }


  daftarInventaris =
    invRes.data || [];


  daftarUnit =
    unitRes.data || [];


  // ==========================================================
  // SINKRONKAN MASTER
  // ==========================================================

  for (
    const item of daftarInventaris
  ) {

    const info =
      ringkasanUnit(
        item.id
      );


    const total =
      info.total;


    const tersedia =
      info.tersedia;


    if (
      Number(
        item.total
      ) !== total ||
      Number(
        item.tersedia
      ) !== tersedia
    ) {

      const {
        error,
      } = await supabase
        .from(
          "inventaris"
        )
        .update({
          total,
          tersedia,
        })
        .eq(
          "id",
          item.id
        );


      if (error) {

        console.error(
          "Gagal sinkron jumlah inventaris:",
          error
        );

      } else {

        item.total =
          total;

        item.tersedia =
          tersedia;
      }
    }
  }


  // ==========================================================
  // HEADER
  // ==========================================================

  if (countLabel) {

    countLabel.textContent =
      `${daftarInventaris.length} barang terdaftar`;
  }


  currentPage = 1;


  ensurePaginationControls();


  // ==========================================================
  // KOSONG
  // ==========================================================

  if (
    !daftarInventaris.length
  ) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="muted"
          style="
            text-align:center;
            padding:2rem
          "
        >
          Belum ada barang aktif.
          Klik "Tambah Barang" untuk mulai.
        </td>
      </tr>
    `;


    if (tableFoot) {

      tableFoot.textContent =
        "Belum ada barang";
    }


    const controls =
      ensurePaginationControls();


    if (controls?.prev) {
      controls.prev.disabled =
        true;
    }


    if (controls?.next) {
      controls.next.disabled =
        true;
    }


    return;
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  renderTable();
}


// ============================================================
// PAGINATION EVENT
// ============================================================

document.addEventListener(
  "click",
  e => {

    const prev =
      e.target.closest(
        "#btn-prev-inventaris"
      );


    if (prev) {

      if (
        currentPage >
        1
      ) {

        currentPage--;

        renderTable();
      }


      return;
    }


    const next =
      e.target.closest(
        "#btn-next-inventaris"
      );


    if (next) {

      const totalItems =
        getFilteredItems()
          .length;


      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalItems /
            PAGE_SIZE
          )
        );


      if (
        currentPage <
        totalPages
      ) {

        currentPage++;

        renderTable();
      }
    }
  }
);


// ============================================================
// FILTER EVENT
// ============================================================

filterStatus?.addEventListener(
  "change",
  () => {

    currentPage = 1;

    renderTable();
  }
);


// ============================================================
// SEARCH TABLE
// ============================================================

document
  .querySelectorAll(
    "[data-table-search]"
  )
  .forEach(
    input => {

      const table =
        document.getElementById(
          input.getAttribute(
            "data-table-search"
          )
        );


      if (!table) {
        return;
      }


      input.addEventListener(
        "input",
        () => {

          currentPage =
            1;

          renderTable();
        }
      );
    }
  );


// ============================================================
// RESET FORM
// ============================================================

function resetForm() {

  [
    "f-kode",
    "f-tahun",
    "f-nama",
    "f-merk",
    "f-jumlah",
    "f-spesifikasi",
  ].forEach(
    id => {

      const el =
        document.getElementById(
          id
        );


      if (el) {
        el.value = "";
      }
    }
  );


  const title =
    modal?.querySelector(
      "[data-modal-title]"
    );


  if (title) {

    title.textContent =
      "Tambah Barang";
  }


  editIdAktif = null;
}


// ============================================================
// SIMPAN / EDIT INVENTARIS
// ============================================================

modal?.addEventListener(
  "modal:submit",
  async e => {

    const {
      submitBtn,
    } = e.detail;


    const editId =
      e.detail.editId ||
      editIdAktif;


    const kode =
      document
        .getElementById(
          "f-kode"
        )
        ?.value
        .trim();


    const nama_barang =
      document
        .getElementById(
          "f-nama"
        )
        ?.value
        .trim();


    const merk =
      document
        .getElementById(
          "f-merk"
        )
        ?.value
        .trim();


    const tahun_perolehan =
      document
        .getElementById(
          "f-tahun"
        )
        ?.value
        .trim();


    const jumlah =
      parseInt(
        document
          .getElementById(
            "f-jumlah"
          )
          ?.value,
        10
      ) || 0;


    const spesifikasi =
      document
        .getElementById(
          "f-spesifikasi"
        )
        ?.value
        .trim();


    // ========================================================
    // VALIDASI
    // ========================================================

    if (
      !kode ||
      !nama_barang
    ) {

      return window.showToast?.(
        "Kode dan Nama Barang wajib diisi.",
        "error"
      );
    }


    if (
      jumlah < 1
    ) {

      return window.showToast?.(
        "Jumlah barang minimal 1.",
        "error"
      );
    }


    // ========================================================
    // DISABLE BUTTON
    // ========================================================

    submitBtn.disabled =
      true;


    const oldText =
      submitBtn.textContent;


    submitBtn.textContent =
      "Menyimpan…";


    let error = null;


    try {

      // ======================================================
      // EDIT
      // ======================================================

      if (editId) {

        const info =
          ringkasanUnit(
            editId
          );


        // ====================================================
        // UNIT TIDAK BOLEH DIKURANGI
        // ====================================================

        const unitTidakBisaDikurangi =
          info.units.filter(
            unit =>
              unit.status !==
                "tersedia" ||
              unit.kondisi !==
                "baik"
          ).length;


        if (
          jumlah <
          unitTidakBisaDikurangi
        ) {

          throw new Error(
            `Jumlah total tidak boleh kurang dari ${unitTidakBisaDikurangi} unit yang sedang dipinjam/rusak/hilang/tidak lengkap.`
          );
        }


        // ====================================================
        // UPDATE MASTER
        // ====================================================

        const {
          error:
            invError,
        } = await supabase
          .from(
            "inventaris"
          )
          .update({

            kode,

            nama_barang,

            merk,

            tahun_perolehan,

            spesifikasi,

          })
          .eq(
            "id",
            editId
          );


        if (invError) {
          throw invError;
        }


        // ====================================================
        // UNIT AKTIF SAAT INI
        // ====================================================

        const current =
          [...info.units].sort(
            (a, b) =>
              String(
                a.kode_unit ||
                  ""
              ).localeCompare(
                String(
                  b.kode_unit ||
                    ""
                )
              )
          );


        // ====================================================
        // SEMUA UNIT
        // ====================================================

        const allUnits =
          semuaUnitInventaris(
            editId
          );


        // ====================================================
        // KURANGI JUMLAH
        // ====================================================

        if (
          jumlah <
          current.length
        ) {

          const jumlahYangHarusDikurangi =
            current.length -
            jumlah;


          const nonaktifkan =
            current
              .filter(
                unit =>
                  unit.status ===
                    "tersedia" &&
                  unit.kondisi ===
                    "baik"
              )
              .slice(
                -jumlahYangHarusDikurangi
              );


          if (
            nonaktifkan.length <
            jumlahYangHarusDikurangi
          ) {

            throw new Error(
              "Jumlah unit tidak bisa dikurangi karena unit yang tersedia dan berkondisi baik tidak mencukupi."
            );
          }


          const {
            error:
              deactivateError,
          } = await supabase
            .from(
              "unit_inventaris"
            )
            .update({
              aktif:
                false,
            })
            .in(
              "id",
              nonaktifkan.map(
                unit =>
                  unit.id
              )
            );


          if (
            deactivateError
          ) {
            throw deactivateError;
          }
        }


        // ====================================================
        // TAMBAH JUMLAH
        // ====================================================

        else if (
          jumlah >
          current.length
        ) {

          let kurang =
            jumlah -
            current.length;


          // ==================================================
          // AKTIFKAN KEMBALI UNIT LAMA
          // ==================================================

          const dapatDiaktifkan =
            allUnits
              .filter(
                unit =>
                  unit.aktif ===
                    false &&
                  unit.status ===
                    "tersedia" &&
                  unit.kondisi ===
                    "baik"
              )
              .sort(
                (a, b) =>
                  String(
                    a.kode_unit ||
                      ""
                  ).localeCompare(
                    String(
                      b.kode_unit ||
                        ""
                    )
                  )
              );


          if (
            dapatDiaktifkan.length
          ) {

            const aktifkan =
              dapatDiaktifkan.slice(
                0,
                kurang
              );


            const {
              error:
                activateError,
            } = await supabase
              .from(
                "unit_inventaris"
              )
              .update({
                aktif:
                  true,
              })
              .in(
                "id",
                aktifkan.map(
                  unit =>
                    unit.id
                )
              );


            if (
              activateError
            ) {
              throw activateError;
            }


            kurang -=
              aktifkan.length;
          }


          // ==================================================
          // BUAT UNIT BARU
          // ==================================================

          if (
            kurang > 0
          ) {

            let nomorTerakhir =
              0;


            // Scan semua unit lama supaya kode unit
            // yang pernah dipakai tidak bentrok.

            allUnits.forEach(
              unit => {

                const match =
                  String(
                    unit.kode_unit ||
                      ""
                  ).match(
                    /-(\d+)$/
                  );


                if (match) {

                  nomorTerakhir =
                    Math.max(
                      nomorTerakhir,
                      parseInt(
                        match[1],
                        10
                      )
                    );
                }
              }
            );


            const rows = [];


            for (
              let i = 0;
              i < kurang;
              i++
            ) {

              nomorTerakhir++;


              rows.push({

                inventaris_id:
                  editId,

                kode_unit:
                  `${kode}-${String(
                    nomorTerakhir
                  ).padStart(
                    3,
                    "0"
                  )}`,

                kondisi:
                  "baik",

                status:
                  "tersedia",

                aktif:
                  true,

              });
            }


            const {
              error:
                addErr,
            } = await supabase
              .from(
                "unit_inventaris"
              )
              .insert(
                rows
              );


            if (addErr) {
              throw addErr;
            }
          }
        }

      }


      // ======================================================
      // TAMBAH BARANG BARU
      // ======================================================

      else {

        const {
          data: created,
          error:
            invError,
        } = await supabase
          .from(
            "inventaris"
          )
          .insert({

            kode,

            nama_barang,

            merk,

            tahun_perolehan,

            spesifikasi,

            total:
              0,

            tersedia:
              0,

            status:
              "Tersedia",

            aktif:
              true,

          })
          .select(
            "id"
          )
          .single();


        if (invError) {
          throw invError;
        }


        // ====================================================
        // BUAT UNIT BARU
        // ====================================================

        const rows =
          Array.from(
            {
              length:
                jumlah,
            },
            (_, i) => ({

              inventaris_id:
                created.id,

              kode_unit:
                `${kode}-${String(
                  i + 1
                ).padStart(
                  3,
                  "0"
                )}`,

              kondisi:
                "baik",

              status:
                "tersedia",

              aktif:
                true,

            })
          );


        const {
          error:
            unitError,
        } = await supabase
          .from(
            "unit_inventaris"
          )
          .insert(
            rows
          );


        if (unitError) {

          // Barang baru belum punya riwayat transaksi,
          // jadi aman dihapus jika pembuatan unit gagal.

          await supabase
            .from(
              "inventaris"
            )
            .delete()
            .eq(
              "id",
              created.id
            );


          throw unitError;
        }
      }

    } catch (err) {

      error = err;
    }


    // ========================================================
    // ENABLE BUTTON
    // ========================================================

    submitBtn.disabled =
      false;


    submitBtn.textContent =
      oldText;


    // ========================================================
    // ERROR
    // ========================================================

    if (error) {

      console.error(
        "Gagal menyimpan inventaris:",
        error
      );


      window.showToast?.(

        error.code ===
        "23505"

          ? "Kode barang atau kode unit sudah dipakai."

          : (
              error.message ||
              "Gagal menyimpan data."
            ),

        "error"
      );


      return;
    }


    // ========================================================
    // SUCCESS
    // ========================================================

    modal?.classList.remove(
      "open"
    );


    window.showToast?.(

      editId

        ? "Perubahan tersimpan."

        : "Barang berhasil ditambahkan.",

      "success"
    );


    await muatData();
  }
);


// ============================================================
// MODAL PEMULIHAN UNIT
// ============================================================

function ensureRecoveryModal() {

  if (recoveryModal) {
    return recoveryModal;
  }


  const wrap =
    document.createElement(
      "div"
    );


  wrap.className =
    "modal-overlay";


  wrap.id =
    "modal-pemulihan-unit";


  wrap.innerHTML = `

    <div
      class="modal-box"
      style="max-width:760px"
    >

      <div class="modal-head">

        <h3>
          Pemulihan Unit
        </h3>

        <button
          class="modal-close"
          data-close-recovery
        >
          &times;
        </button>

      </div>


      <div class="modal-body">

        <div
          id="recovery-content"
        ></div>

      </div>


      <div class="modal-foot">

        <button
          class="btn btn-ghost"
          data-close-recovery
        >
          Tutup
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    wrap
  );


  recoveryModal =
    wrap;


  wrap
    .querySelectorAll(
      "[data-close-recovery]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            wrap.classList.remove(
              "open"
            )
        );
      }
    );


  return recoveryModal;
}


// ============================================================
// TEXT PEMULIHAN
// ============================================================

function recoveryText(
  unit
) {

  if (
    unit.status ===
      "rusak" ||
    unit.kondisi ===
      "rusak"
  ) {

    return "Sudah diperbaiki";
  }


  if (
    unit.status ===
      "hilang" ||
    unit.kondisi ===
      "hilang"
  ) {

    return "Barang ditemukan";
  }


  return "Sudah dilengkapi";
}


// ============================================================
// PULIHKAN UNIT
// ============================================================

async function pulihkanUnit(
  unitId,
  mode
) {

  const unit =
    daftarUnit.find(
      u =>
        u.id ===
        unitId
    );


  if (!unit) {
    return;
  }


  // Jangan pulihkan unit nonaktif.

  if (
    unit.aktif ===
    false
  ) {

    window.showToast?.(
      "Unit ini sudah nonaktif.",
      "error"
    );

    return;
  }


  const label =
    mode ===
    "rusak"

      ? "Unit sudah diperbaiki"

      : mode ===
        "hilang"

          ? "Barang sudah ditemukan"

          : "Unit sudah dilengkapi";


  if (
    !window.confirm(
      `${unit.kode_unit}: ${label} dan siap digunakan kembali?`
    )
  ) {

    return;
  }


  const btn =
    recoveryModal?.querySelector(
      `[data-recover-id="${unitId}"]`
    );


  if (btn) {

    btn.disabled =
      true;

    btn.textContent =
      "Menyimpan…";
  }


  const {
    error,
  } = await supabase
    .from(
      "unit_inventaris"
    )
    .update({

      kondisi:
        "baik",

      status:
        "tersedia",

      keterangan:
        `${label}.`,

      aktif:
        true,

    })
    .eq(
      "id",
      unitId
    );


  if (error) {

    console.error(
      "Gagal memulihkan unit:",
      error
    );


    if (btn) {

      btn.disabled =
        false;

      btn.textContent =
        "Pulihkan";
    }


    window.showToast?.(
      "Gagal memulihkan unit.",
      "error"
    );


    return;
  }


  window.showToast?.(
    `${unit.kode_unit} berhasil dipulihkan dan sekarang tersedia.`,
    "success"
  );


  await muatData();


  bukaRecovery(
    unit.inventaris_id
  );
}


// ============================================================
// BUKA RECOVERY
// ============================================================

function bukaRecovery(
  inventarisId
) {

  const item =
    daftarInventaris.find(
      i =>
        i.id ===
        inventarisId
    );


  if (!item) {
    return;
  }


  const info =
    ringkasanUnit(
      inventarisId
    );


  const units =
    problematicUnits(
      info
    );


  const wrap =
    ensureRecoveryModal();


  const content =
    wrap.querySelector(
      "#recovery-content"
    );


  content.innerHTML = `

    <p
      style="margin-top:0"
    >

      <b>
        ${escapeHtml(
          item.nama_barang
        )}
      </b>

      —

      ${escapeHtml(
        item.kode
      )}

    </p>


    ${
      units.length

        ? `

          <div
            style="
              display:grid;
              gap:.65rem
            "
          >

            ${units
              .map(
                u => `

                  <div
                    style="
                      border:1px solid var(--border);
                      border-radius:10px;
                      padding:.75rem;
                      display:flex;
                      justify-content:space-between;
                      gap:1rem;
                      align-items:center
                    "
                  >

                    <div>

                      <b>
                        ${escapeHtml(
                          u.kode_unit
                        )}
                      </b>

                      <div class="muted">

                        Status:
                        ${escapeHtml(
                          statusLabel(
                            u.status
                          )
                        )}

                        ·

                        Kondisi:
                        ${escapeHtml(
                          kondisiLabel(
                            u.kondisi
                          )
                        )}

                      </div>

                      <small class="muted">

                        Aksi:
                        ${escapeHtml(
                          recoveryText(
                            u
                          )
                        )}

                      </small>

                    </div>


                    <button
                      class="btn btn-primary btn-sm"
                      data-recover-id="${u.id}"
                    >
                      Pulihkan
                    </button>

                  </div>

                `
              )
              .join("")}

          </div>

        `

        : `

          <p class="muted">

            Tidak ada unit yang
            perlu dipulihkan.

          </p>

        `
    }
  `;


  content
    .querySelectorAll(
      "[data-recover-id]"
    )
    .forEach(
      btn => {

        btn.addEventListener(
          "click",
          () => {

            const u =
              units.find(
                x =>
                  x.id ===
                  btn.dataset
                    .recoverId
              );


            if (!u) {
              return;
            }


            const mode =
              u.status ===
                "rusak"

                ? "rusak"

                : u.status ===
                    "hilang"

                  ? "hilang"

                  : "tidak_lengkap";


            pulihkanUnit(
              u.id,
              mode
            );
          }
        );
      }
    );


  wrap.classList.add(
    "open"
  );
}


// ============================================================
// TABLE CLICK
// ============================================================

tbody.addEventListener(
  "click",
  async e => {

    // ========================================================
    // DETAIL UNIT
    // ========================================================

    const detailBtn =
      e.target.closest(
        "[data-detail-unit]"
      );


    if (detailBtn) {

      return bukaRecovery(
        detailBtn.dataset
          .detailUnit
      );
    }


    // ========================================================
    // RECOVERY
    // ========================================================

    const recoverBtn =
      e.target.closest(
        "[data-pulihkan-unit]"
      );


    if (recoverBtn) {

      return bukaRecovery(
        recoverBtn.dataset
          .pulihkanUnit
      );
    }


    // ========================================================
    // EDIT
    // ========================================================

    const editBtn =
      e.target.closest(
        "[data-edit-id]"
      );


    if (editBtn) {

      editIdAktif =
        editBtn.dataset
          .editId;


      try {

        const data =
          JSON.parse(
            editBtn.dataset.edit
              .replace(
                /&quot;/g,
                '"'
              )
          );


        document.getElementById(
          "f-kode"
        ).value =
          data.kode ||
          "";


        document.getElementById(
          "f-nama"
        ).value =
          data.nama ||
          "";


        document.getElementById(
          "f-merk"
        ).value =
          data.merk ||
          "";


        document.getElementById(
          "f-tahun"
        ).value =
          data.tahun ||
          "";


        document.getElementById(
          "f-jumlah"
        ).value =
          data.jumlah ||
          "";


        document.getElementById(
          "f-spesifikasi"
        ).value =
          data.spesifikasi ||
          "";


        modal
          ?.querySelector(
            "[data-modal-title]"
          )
          ?.replaceChildren(
            document.createTextNode(
              "Ubah Barang"
            )
          );

      } catch (err) {

        console.error(
          "Gagal membuka data edit:",
          err
        );
      }
    }
  }
);


// ============================================================
// NONAKTIFKAN BARANG
// ============================================================

modalHapus?.addEventListener(
  "confirm-delete:yes",
  async e => {

    const {
      id,
      row,
    } = e.detail || {};


    if (!id) {
      return;
    }


    const btn =
      modalHapus.querySelector(
        "[data-confirm-yes]"
      );


    // ========================================================
    // BUTTON LOADING
    // ========================================================

    if (btn) {

      btn.disabled =
        true;

      btn.textContent =
        "Menonaktifkan…";
    }


    try {

      // ======================================================
      // CEK UNIT AKTIF
      // ======================================================

      const {
        data: units,
        error:
          unitError,
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
        .eq(
          "inventaris_id",
          id
        )
        .eq(
          "aktif",
          true
        );


      if (unitError) {
        throw unitError;
      }


      const semuaUnit =
        units || [];


      // ======================================================
      // CEK MASIH DIPINJAM
      // ======================================================

      const masihDipinjam =
        semuaUnit.filter(
          unit =>
            unit.status ===
            "dipinjam"
        );


      if (
        masihDipinjam.length >
        0
      ) {

        throw new Error(
          `Barang tidak bisa dinonaktifkan karena masih ada ${masihDipinjam.length} unit yang sedang dipinjam.`
        );
      }


      // ======================================================
      // NONAKTIFKAN MASTER
      // ======================================================

      const {
        error:
          updateError,
      } = await supabase
        .from(
          "inventaris"
        )
        .update({

          aktif:
            false,

        })
        .eq(
          "id",
          id
        );


      if (updateError) {
        throw updateError;
      }


      // ======================================================
      // TUTUP MODAL
      // ======================================================

      modalHapus?.classList.remove(
        "open"
      );


      // ======================================================
      // HAPUS DARI TAMPILAN
      // ======================================================

      row?.remove();


      // ======================================================
      // NOTIFIKASI
      // ======================================================

      window.showToast?.(
        "Barang berhasil dinonaktifkan. Riwayat transaksi tetap aman.",
        "success"
      );


      // ======================================================
      // LOAD ULANG
      // ======================================================

      await muatData();


    } catch (error) {

      console.error(
        "Gagal menonaktifkan inventaris:",
        error
      );


      window.showToast?.(
        error?.message ||
          "Gagal menonaktifkan barang.",
        "error"
      );


    } finally {

      if (btn) {

        btn.disabled =
          false;

        btn.textContent =
          "Ya, Nonaktifkan";
      }
    }
  }
);


// ============================================================
// TOMBOL TAMBAH
// ============================================================

document
  .querySelector(
    '[data-modal-open="modal-tambah-barang"]'
  )
  ?.addEventListener(
    "click",
    () => {

      editIdAktif =
        null;

      resetForm();
    }
  );


// ============================================================
// DELEGASI EDIT
// ============================================================

document.addEventListener(
  "click",
  e => {

    const edit =
      e.target.closest(
        "[data-edit-id]"
      );


    if (!edit) {
      return;
    }


    editIdAktif =
      edit.dataset.editId;
  }
);


// ============================================================
// LOAD AWAL
// ============================================================

ensurePaginationControls();

muatData();