// pegawai/inventaris.js
// Daftar inventaris, pengajuan peminjaman, dan pagination.

import { supabase } from "../supabase.js";


/* =========================================================
   HELPER
   ========================================================= */

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );
}


function formatTanggal(value) {
  if (!value) return "-";

  const date = new Date(
    value.length === 10 ? `${value}T00:00:00` : value
  );

  if (Number.isNaN(date.getTime())) return escapeHtml(value);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}


function statusInventaris(item) {
  return Number(item.tersedia || 0) > 0
    ? "Tersedia"
    : "Tidak Tersedia";
}


function statusBadge(status) {
  const map = {
    "Tersedia": "badge-ok",
    "Rusak Ringan": "badge-warn",
    "Rusak Berat": "badge-bad",
    "Hilang": "badge-bad",
    "Sedang Dipinjam": "badge-info",
    "Tidak Tersedia": "badge-bad"
  };

  return `
    <span class="badge ${map[status] || "badge-info"}">
      ${escapeHtml(status)}
    </span>
  `;
}


function statusPengajuan(status) {
  const map = {
    menunggu: {
      label: "Menunggu Persetujuan",
      className: "status-menunggu",
      itemClass: "menunggu"
    },

    dipinjam: {
      label: "Disetujui",
      className: "status-disetujui",
      itemClass: "disetujui"
    },

    ditolak: {
      label: "Ditolak",
      className: "status-ditolak",
      itemClass: "ditolak"
    },

    dikembalikan: {
      label: "Dikembalikan",
      className: "status-dikembalikan",
      itemClass: "dikembalikan"
    }
  };

  return map[status] || {
    label: status || "Tidak diketahui",
    className: "status-dikembalikan",
    itemClass: "dikembalikan"
  };
}


/* =========================================================
   ELEMENT
   ========================================================= */

const tbody = document.querySelector("#tabel-inv-pegawai tbody");
const judulJumlah = document.getElementById("judul-jumlah");

const modal = document.getElementById("modal-pengajuan");
const daftarBarangPengajuan =
  document.getElementById("daftar-barang-pengajuan");

const daftarPengajuanSaya =
  document.getElementById("daftar-pengajuan-saya");

const btnAjukan =
  document.getElementById("btn-ajukan-peminjaman");

const btnTutup =
  document.getElementById("btn-tutup-modal");

const btnBatal =
  document.getElementById("btn-batal-pengajuan");

const btnTambahBarang =
  document.getElementById("btn-tambah-barang");

const btnKirim =
  document.getElementById("btn-kirim-pengajuan");

const inputTanggal =
  document.getElementById("f-tanggal-pengajuan");

const inputKeperluan =
  document.getElementById("f-keperluan-pengajuan");


/* =========================================================
   DATA + PAGINATION
   ========================================================= */

let daftarInventaris = [];

const PAGE_SIZE = 5;
let halaman = 1;
let dataTerfilter = [];


/* =========================================================
   TANGGAL HARI INI
   ========================================================= */

function tanggalHariIni() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}


/* =========================================================
   RENDER TABEL INVENTARIS
   ========================================================= */

function renderTabelInventaris() {
  if (!tbody) return;

  const footer =
    document.getElementById("footer-inv-pegawai");

  const btnPrev =
    document.getElementById("btn-prev-inv-pegawai");

  const btnNext =
    document.getElementById("btn-next-inv-pegawai");

  const total = dataTerfilter.length;

  if (total === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="muted"
          style="text-align:center; padding:35px 15px;"
        >
          ${
            daftarInventaris.length === 0
              ? "Belum ada barang inventaris."
              : "Barang yang dicari tidak ditemukan."
          }
        </td>
      </tr>
    `;

    if (footer) {
      footer.textContent =
        daftarInventaris.length === 0
          ? "Menampilkan 0 dari 0 barang"
          : "Menampilkan 0 hasil pencarian";
    }

    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;

    return;
  }


  const totalHalaman = Math.ceil(total / PAGE_SIZE);

  if (halaman > totalHalaman) halaman = totalHalaman;
  if (halaman < 1) halaman = 1;


  const mulai = (halaman - 1) * PAGE_SIZE;
  const selesai = mulai + PAGE_SIZE;

  const dataHalaman =
    dataTerfilter.slice(mulai, selesai);


  tbody.innerHTML = dataHalaman.map(item => {
    const status = statusInventaris(item);

    return `
      <tr>

        <td class="strong">
          ${escapeHtml(item.kode)}
        </td>

        <td>
          ${escapeHtml(item.nama_barang)}
        </td>

        <td class="muted">
          ${escapeHtml(item.merk || "-")}
        </td>

        <td>
          ${Number(item.total || 0)}
        </td>

        <td>
          ${Number(item.tersedia || 0)}
        </td>

        <td>
          ${statusBadge(status)}
        </td>

      </tr>
    `;
  }).join("");


  const tampilMulai = mulai + 1;
  const tampilSelesai = Math.min(selesai, total);

  if (footer) {
    footer.textContent =
      total === daftarInventaris.length
        ? `Menampilkan ${tampilMulai}–${tampilSelesai} dari ${total} barang`
        : `Menampilkan ${tampilMulai}–${tampilSelesai} dari ${total} hasil pencarian`;
  }


  if (btnPrev) {
    btnPrev.disabled = halaman <= 1;
  }

  if (btnNext) {
    btnNext.disabled = halaman >= totalHalaman;
  }
}


/* =========================================================
   PAGINATION
   ========================================================= */

function setupPagination() {
  const btnPrev =
    document.getElementById("btn-prev-inv-pegawai");

  const btnNext =
    document.getElementById("btn-next-inv-pegawai");


  btnPrev?.addEventListener("click", () => {
    if (halaman > 1) {
      halaman--;
      renderTabelInventaris();
    }
  });


  btnNext?.addEventListener("click", () => {
    const totalHalaman =
      Math.ceil(dataTerfilter.length / PAGE_SIZE);

    if (halaman < totalHalaman) {
      halaman++;
      renderTabelInventaris();
    }
  });
}


/* =========================================================
   LOAD INVENTARIS
   ========================================================= */

async function muatInventaris() {
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td
        colspan="6"
        class="muted"
        style="text-align:center; padding:35px 15px;"
      >
        Memuat data inventaris…
      </td>
    </tr>
  `;


  try {
    const {
      data: inventarisData,
      error: inventarisError
    } = await supabase
      .from("inventaris")
      .select(`
        id,
        kode,
        nama_barang,
        merk,
        total,
        tersedia,
        status,
        aktif
      `)
      .eq("aktif", true)
      .order("kode", { ascending: true });


    if (inventarisError) {
      throw inventarisError;
    }


    const {
      data: unitData,
      error: unitError
    } = await supabase
      .from("unit_inventaris")
      .select(`
        id,
        inventaris_id,
        kode_unit,
        kondisi,
        status,
        aktif
      `)
      .eq("aktif", true);


    if (unitError) {
      throw unitError;
    }


    /* =====================================================
       HITUNG STOK DARI UNIT
       ===================================================== */

    const unitMap = {};

    (unitData || []).forEach(unit => {
      if (unit.aktif === false) return;

      const id = unit.inventaris_id;

      if (!unitMap[id]) {
        unitMap[id] = {
          total: 0,
          tersedia: 0,
          dipinjam: 0,
          rusak: 0,
          hilang: 0,
          tidakLengkap: 0
        };
      }


      const x = unitMap[id];

      x.total++;


      if (
        unit.status === "tersedia" &&
        unit.kondisi === "baik"
      ) {
        x.tersedia++;
      }


      if (unit.status === "dipinjam") {
        x.dipinjam++;
      }


      if (
        unit.status === "rusak" ||
        unit.kondisi === "rusak"
      ) {
        x.rusak++;
      }


      if (
        unit.status === "hilang" ||
        unit.kondisi === "hilang"
      ) {
        x.hilang++;
      }


      if (
        unit.kondisi === "tidak_lengkap"
      ) {
        x.tidakLengkap++;
      }
    });


    /* =====================================================
       GABUNG DATA
       ===================================================== */

    daftarInventaris =
      (inventarisData || []).map(item => {
        const x =
          unitMap[item.id] || {
            total: 0,
            tersedia: 0,
            dipinjam: 0,
            rusak: 0,
            hilang: 0,
            tidakLengkap: 0
          };

        return {
          ...item,
          total: x.total,
          tersedia: x.tersedia,
          unitDipinjam: x.dipinjam,
          unitRusak: x.rusak,
          unitHilang: x.hilang,
          unitTidakLengkap: x.tidakLengkap
        };
      });


    if (judulJumlah) {
      judulJumlah.textContent =
        `${daftarInventaris.length} barang terdaftar`;
    }


    dataTerfilter =
      [...daftarInventaris];

    halaman = 1;

    renderTabelInventaris();


  } catch (error) {
    console.error(
      "Gagal mengambil inventaris:",
      error
    );

    tbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="muted"
          style="text-align:center; padding:35px 15px;"
        >
          Gagal memuat data inventaris.
        </td>
      </tr>
    `;


    const footer =
      document.getElementById("footer-inv-pegawai");

    if (footer) {
      footer.textContent =
        "Gagal memuat data";
    }
  }
}


/* =========================================================
   LOAD PENGAJUAN SAYA
   ========================================================= */

async function muatPengajuanSaya() {
  if (!daftarPengajuanSaya) return;


  daftarPengajuanSaya.innerHTML = `
    <div class="pengajuan-empty">
      Memuat pengajuan…
    </div>
  `;


  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();


    if (userError || !user) {
      throw new Error(
        "Sesi login tidak ditemukan."
      );
    }


    const {
      data,
      error
    } = await supabase
      .from("peminjaman")
      .select(`
        id,
        tanggal_pinjam,
        keperluan,
        status,
        alasan_penolakan,
        created_at,

        detail_peminjaman (
          jumlah,

          inventaris (
            nama_barang,
            merk
          )
        )
      `)
      .eq("pegawai_id", user.id)
      .order(
        "created_at",
        { ascending: false }
      );


    if (error) {
      throw new Error(error.message);
    }


    renderPengajuanSaya(data || []);


  } catch (error) {
    console.error(
      "Gagal memuat pengajuan:",
      error
    );

    daftarPengajuanSaya.innerHTML = `
      <div class="pengajuan-empty">
        Gagal memuat pengajuan.
      </div>
    `;
  }
}


/* =========================================================
   RENDER PENGAJUAN SAYA
   ========================================================= */

function renderPengajuanSaya(data) {
  if (!data.length) {
    daftarPengajuanSaya.innerHTML = `
      <div class="pengajuan-empty">
        Belum ada pengajuan peminjaman.
      </div>
    `;

    return;
  }


  const semuaPengajuan =
    data.map(item => {
      const info =
        statusPengajuan(item.status);


      const detail =
        item.detail_peminjaman || [];


      const barang =
        detail.map(d => {
          const inv =
            Array.isArray(d.inventaris)
              ? d.inventaris[0]
              : d.inventaris;


          const nama =
            inv?.nama_barang || "Barang";


          const merk =
            inv?.merk
              ? ` — ${inv.merk}`
              : "";


          return `
            <div class="barang-chip">

              ${escapeHtml(
                nama + merk
              )}

              <strong>
                × ${d.jumlah ?? 0}
              </strong>

            </div>
          `;
        }).join("");


      let message = "";


      if (item.status === "ditolak") {
        message = `
          <div class="pengajuan-message ditolak">

            <strong>
              Pengajuan ditolak oleh Admin Logistik
            </strong>

            ${
              item.alasan_penolakan
                ? `Alasan: ${escapeHtml(
                    item.alasan_penolakan
                  )}`
                : "Admin tidak memberikan alasan."
            }

          </div>
        `;
      }


      if (item.status === "dipinjam") {
        message = `
          <div class="pengajuan-message disetujui">

            <strong>
              Pengajuan telah disetujui
            </strong>

            Barang dapat diproses sesuai
            ketentuan peminjaman yang berlaku.

          </div>
        `;
      }


      if (item.status === "menunggu") {
        message = `
          <div class="pengajuan-message">

            Pengajuan sedang diperiksa
            oleh Admin Logistik.

          </div>
        `;
      }


      /* ===================================================
         UUID DIPENDEKKAN
         =================================================== */

      const nomorPengajuan =
        String(item.id || "").slice(0, 8);


      return `
        <div
          class="
            pengajuan-item
            ${info.itemClass}
          "
        >

          <div class="pengajuan-main">

            <div class="pengajuan-top">

              <div>

                <div class="pengajuan-number">

                  Pengajuan #${escapeHtml(
                    nomorPengajuan
                  )}

                </div>

                <div class="pengajuan-date">

                  Diajukan untuk
                  ${formatTanggal(
                    item.tanggal_pinjam
                  )}

                </div>

              </div>


              <span
                class="
                  status-pengajuan
                  ${info.className}
                "
              >

                ${escapeHtml(
                  info.label
                )}

              </span>

            </div>


            <div class="pengajuan-info">

              <div class="pengajuan-info-label">
                Keperluan
              </div>

              <div class="pengajuan-info-value">

                ${escapeHtml(
                  item.keperluan || "-"
                )}

              </div>

            </div>


            ${
              barang
                ? `
                  <div class="pengajuan-barang">

                    <div class="pengajuan-barang-title">
                      Barang yang diajukan
                    </div>

                    <div class="barang-chip-list">
                      ${barang}
                    </div>

                  </div>
                `
                : ""
            }


            ${message}

          </div>

        </div>
      `;
    }).join("");


  const BATAS = 3;


  daftarPengajuanSaya.innerHTML = `
    <div class="pengajuan-list-wrapper">

      <div
        class="pengajuan-list"
        data-pengajuan-list
      >

        ${semuaPengajuan}

      </div>

      ${
        data.length > BATAS
          ? `
            <div
              style="
                display:flex;
                justify-content:center;
                margin-top:1rem;
                padding-bottom:.3rem;
              "
            >

              <button
                type="button"
                class="btn btn-ghost"
                data-toggle-pengajuan
              >
                Lihat semua pengajuan
              </button>

            </div>
          `
          : ""
      }

    </div>
  `;


  /* =====================================================
     SEMBUNYIKAN PENGAJUAN LAMA
     ===================================================== */

  if (data.length > BATAS) {
    const list =
      daftarPengajuanSaya.querySelector(
        "[data-pengajuan-list]"
      );

    const tombol =
      daftarPengajuanSaya.querySelector(
        "[data-toggle-pengajuan]"
      );

    const items =
      list.querySelectorAll(
        ".pengajuan-item"
      );


    items.forEach((item, index) => {
      if (index >= BATAS) {
        item.style.display = "none";
      }
    });


    tombol.addEventListener(
      "click",
      () => {

        const terbuka =
          tombol.dataset.open === "true";


        items.forEach((item, index) => {
          item.style.display =
            terbuka && index >= BATAS
              ? "none"
              : "";
        });


        tombol.textContent =
          terbuka
            ? "Lihat semua pengajuan"
            : "Tampilkan lebih sedikit";


        tombol.dataset.open =
          terbuka ? "false" : "true";
      }
    );
  }
}


/* =========================================================
   BUAT BARIS BARANG
   ========================================================= */

function buatBarisBarang() {
  const row =
    document.createElement("div");

  row.className =
    "barang-pengajuan";


  const pilihan =
    daftarInventaris
      .filter(item => Number(item.tersedia) > 0)
      .map(item => {

        const nama =
          `${item.nama_barang}${
            item.merk
              ? " — " + item.merk
              : ""
          }`;


        return `
          <option
            value="${item.id}"
            data-stok="${Number(
              item.tersedia || 0
            )}"
          >

            ${escapeHtml(nama)}
            — ${Number(
              item.tersedia || 0
            )} tersedia

          </option>
        `;
      })
      .join("");


  row.innerHTML = `
    <div class="barang-pengajuan-grid">

      <div>

        <select class="input f-barang">

          <option value="">
            Pilih barang…
          </option>

          ${pilihan}

        </select>

        <div class="stok-info">
          Pilih barang untuk melihat stok.
        </div>

      </div>


      <input
        class="input f-jumlah"
        type="number"
        min="1"
        value="1"
        placeholder="Jumlah"
      >


      <button
        type="button"
        class="btn btn-icon btn-hapus-barang"
        title="Hapus barang"
      >
        &times;
      </button>

    </div>
  `;


  const select =
    row.querySelector(".f-barang");

  const jumlah =
    row.querySelector(".f-jumlah");

  const stokInfo =
    row.querySelector(".stok-info");


  select.addEventListener(
    "change",
    () => {

      const option =
        select.selectedOptions[0];

      const stok =
        Number(
          option?.dataset?.stok || 0
        );


      if (!stok) {
        stokInfo.textContent =
          "Pilih barang untuk melihat stok.";

        jumlah.removeAttribute("max");

        return;
      }


      stokInfo.textContent =
        `Stok tersedia: ${stok} unit`;

      jumlah.max = stok;


      if (
        Number(jumlah.value) > stok
      ) {
        jumlah.value = stok;
      }
    }
  );


  row.querySelector(
    ".btn-hapus-barang"
  ).addEventListener(
    "click",
    () => {

      const jumlahBaris =
        daftarBarangPengajuan
          .querySelectorAll(
            ".barang-pengajuan"
          ).length;


      if (jumlahBaris <= 1) {

        window.showToast?.(
          "Minimal harus ada satu barang.",
          "error"
        );

        return;
      }


      row.remove();
    }
  );


  daftarBarangPengajuan.appendChild(
    row
  );
}


/* =========================================================
   RESET FORM
   ========================================================= */

function resetForm() {
  daftarBarangPengajuan.innerHTML = "";

  buatBarisBarang();

  if (inputTanggal) {
    inputTanggal.value =
      tanggalHariIni();
  }

  if (inputKeperluan) {
    inputKeperluan.value = "";
  }
}


/* =========================================================
   BUKA MODAL
   ========================================================= */

btnAjukan?.addEventListener(
  "click",
  () => {

    resetForm();

    modal?.classList.add("open");
  }
);


/* =========================================================
   TUTUP MODAL
   ========================================================= */

function tutupModal() {
  modal?.classList.remove("open");
}


btnTutup?.addEventListener(
  "click",
  tutupModal
);


btnBatal?.addEventListener(
  "click",
  tutupModal
);


modal?.addEventListener(
  "click",
  event => {

    if (event.target === modal) {
      tutupModal();
    }

  }
);


/* =========================================================
   TAMBAH BARANG
   ========================================================= */

btnTambahBarang?.addEventListener(
  "click",
  buatBarisBarang
);


/* =========================================================
   AMBIL DATA FORM BARANG
   ========================================================= */

function ambilBarangDariForm() {
  const rows =
    daftarBarangPengajuan
      .querySelectorAll(
        ".barang-pengajuan"
      );


  return [...rows]
    .map(row => {

      const inventaris_id =
        row.querySelector(
          ".f-barang"
        )?.value;


      const jumlah =
        Number(
          row.querySelector(
            ".f-jumlah"
          )?.value
        );


      return {
        inventaris_id,
        jumlah
      };
    })
    .filter(item => item.inventaris_id);
}


/* =========================================================
   KIRIM PENGAJUAN
   ========================================================= */

btnKirim?.addEventListener(
  "click",
  async () => {

    const tanggal_pinjam =
      inputTanggal?.value;


    const keperluan =
      inputKeperluan?.value.trim();


    const barang =
      ambilBarangDariForm();


    /* =====================================================
       VALIDASI
       ===================================================== */

    if (!tanggal_pinjam) {
      window.showToast?.(
        "Tanggal peminjaman wajib diisi.",
        "error"
      );

      return;
    }


    if (!keperluan) {
      window.showToast?.(
        "Keperluan / tujuan wajib diisi.",
        "error"
      );

      return;
    }


    if (!barang.length) {
      window.showToast?.(
        "Pilih minimal satu barang.",
        "error"
      );

      return;
    }


    const ids =
      barang.map(
        item => item.inventaris_id
      );


    if (
      new Set(ids).size !== ids.length
    ) {
      window.showToast?.(
        "Barang yang sama tidak boleh dipilih dua kali.",
        "error"
      );

      return;
    }


    for (const item of barang) {

      if (
        !Number.isInteger(item.jumlah) ||
        item.jumlah < 1
      ) {

        window.showToast?.(
          "Jumlah barang harus minimal 1.",
          "error"
        );

        return;
      }


      const inv =
        daftarInventaris.find(
          x => x.id === item.inventaris_id
        );


      if (!inv) {
        window.showToast?.(
          "Data barang tidak ditemukan.",
          "error"
        );

        return;
      }


      if (
        item.jumlah >
        Number(inv.tersedia || 0)
      ) {

        window.showToast?.(
          `Jumlah ${inv.nama_barang} melebihi stok tersedia (${inv.tersedia}).`,
          "error"
        );

        return;
      }
    }


    /* =====================================================
       LOADING
       ===================================================== */

    btnKirim.disabled = true;
    btnKirim.textContent = "Mengirim…";


    try {

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();


      if (userError || !user) {
        throw new Error(
          "Sesi login tidak ditemukan."
        );
      }


      /* ===================================================
         PEMINJAMAN
         =================================================== */

      const {
        data: peminjaman,
        error
      } = await supabase
        .from("peminjaman")
        .insert({
          pegawai_id: user.id,
          tanggal_pinjam,
          keperluan,
          status: "menunggu"
        })
        .select("id")
        .single();


      if (error) {
        throw new Error(error.message);
      }


      /* ===================================================
         DETAIL PEMINJAMAN
         =================================================== */

      const detail =
        barang.map(item => ({
          peminjaman_id:
            peminjaman.id,

          inventaris_id:
            item.inventaris_id,

          jumlah:
            item.jumlah,

          kondisi_saat_pinjam:
            "baik (hidup)"
        }));


      const {
        error: detailError
      } = await supabase
        .from("detail_peminjaman")
        .insert(detail);


      if (detailError) {

        await supabase
          .from("peminjaman")
          .delete()
          .eq(
            "id",
            peminjaman.id
          );

        throw new Error(
          detailError.message
        );
      }


      /* ===================================================
         BERHASIL
         =================================================== */

      tutupModal();


      window.showToast?.(
        "Pengajuan berhasil dikirim.",
        "success"
      );


      await muatInventaris();

      await muatPengajuanSaya();


    } catch (error) {

      console.error(
        "Gagal mengirim pengajuan:",
        error
      );


      window.showToast?.(
        error.message ||
        "Gagal mengirim pengajuan.",
        "error"
      );


    } finally {

      btnKirim.disabled = false;
      btnKirim.textContent =
        "Kirim Pengajuan";

    }
  }
);


/* =========================================================
   SEARCH
   ========================================================= */

document
  .querySelectorAll(
    "[data-table-search]"
  )
  .forEach(input => {

    input.addEventListener(
      "input",
      () => {

        const q =
          input.value
            .trim()
            .toLowerCase();


        dataTerfilter =
          daftarInventaris.filter(item => {

            const teks =
              [
                item.kode,
                item.nama_barang,
                item.merk,
                item.status
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            return teks.includes(q);
          });


        halaman = 1;

        renderTabelInventaris();
      }
    );
  });


/* =========================================================
   MULAI
   ========================================================= */

setupPagination();

muatInventaris();

muatPengajuanSaya();