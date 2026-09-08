// admin/pengembalian.js
// Pencatatan Pengembalian — sistem per UNIT barang.

import { supabase } from "../supabase.js";


/* =========================================================
   HELPER
   ========================================================= */

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
      })[c],
  );
}


function inisial(nama) {
  return (nama || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}


function formatTanggal(iso) {
  if (!iso) return "-";

  return new Date(
    iso + "T00:00:00",
  ).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}


/* =========================================================
   NORMALISASI KONDISI
   ========================================================= */

function normalisasiKondisi(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();

  if (v === "rusak") {
    return "rusak";
  }

  if (
    v === "tidak lengkap" ||
    v === "tidak_lengkap"
  ) {
    return "tidak_lengkap";
  }

  if (v === "hilang") {
    return "hilang";
  }

  return "baik";
}


function labelKondisi(kondisi) {
  switch (kondisi) {
    case "baik":
      return "Baik";

    case "rusak":
      return "Rusak";

    case "tidak_lengkap":
      return "Tidak Lengkap";

    case "hilang":
      return "Hilang";

    default:
      return "Baik";
  }
}


/* =========================================================
   ELEMENT
   ========================================================= */

const tbodyMenunggu =
  document.getElementById(
    "tabel-menunggu-body",
  );

const judulMenunggu =
  document.getElementById(
    "judul-menunggu",
  );

const modal =
  document.getElementById(
    "modal-pengembalian",
  );

const tbodyDetail =
  document.getElementById(
    "tabel-pengembalian-detail",
  );

const judulModal =
  document.getElementById(
    "judul-modal-pengembalian",
  );


/* =========================================================
   RENDER TRANSAKSI
   ========================================================= */

function renderBarisMenunggu(p) {

  const daftarBarang =
    (p.detail_peminjaman || [])
      .map(
        (d) =>
          `${d.inventaris?.nama_barang || "-"} (${d.jumlah})`,
      )
      .join(", ");


  const tr =
    document.createElement("tr");


  tr.innerHTML = `
    <td class="strong nowrap">
      ${escapeHtml(
        p.nomor_bast || "-",
      )}
    </td>

    <td>
      <span class="avatar-sm">
        ${inisial(
          p.pegawai?.nama,
        )}
      </span>

      ${escapeHtml(
        p.pegawai?.nama || "-",
      )}
    </td>

    <td>
      ${escapeHtml(
        daftarBarang,
      )}
    </td>

    <td class="muted nowrap">
      ${formatTanggal(
        p.tanggal_pinjam,
      )}
    </td>

    <td>
      <button
        class="btn btn-primary btn-sm"
        data-buka-pengembalian="${escapeHtml(
          p.id,
        )}"
      >
        Catat Pengembalian
      </button>
    </td>
  `;


  return tr;
}


/* =========================================================
   MUAT TRANSAKSI YANG SEDANG DIPINJAM
   ========================================================= */

async function muatMenunggu() {

  if (!tbodyMenunggu) {
    return;
  }


  tbodyMenunggu.innerHTML = `
    <tr>
      <td
        colspan="5"
        class="muted"
        style="text-align:center; padding:2rem;"
      >
        Memuat data…
      </td>
    </tr>
  `;


  const {
    data,
    error,
  } =
    await supabase
      .from("peminjaman")
      .select(`
        id,
        nomor_bast,
        tanggal_pinjam,

        pegawai:profiles!peminjaman_pegawai_id_fkey (
          nama
        ),

        detail_peminjaman (
          id,
          jumlah,

          inventaris (
            id,
            nama_barang
          )
        )
      `)
      .eq(
        "status",
        "dipinjam",
      )
      .order(
        "tanggal_pinjam",
        {
          ascending: true,
        },
      );


  if (error) {

    console.error(
      "Gagal memuat transaksi:",
      error,
    );


    tbodyMenunggu.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="muted"
          style="text-align:center; padding:2rem;"
        >
          Gagal memuat data.
        </td>
      </tr>
    `;

    return;
  }


  const daftar =
    data || [];


  if (judulMenunggu) {

    judulMenunggu.textContent =
      `Transaksi Menunggu Pengembalian (${daftar.length})`;

  }


  tbodyMenunggu.innerHTML = "";


  if (daftar.length === 0) {

    tbodyMenunggu.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="muted"
          style="text-align:center; padding:2rem;"
        >
          Tidak ada transaksi yang menunggu dikembalikan.
        </td>
      </tr>
    `;

    return;
  }


  daftar.forEach(
    (p) => {

      tbodyMenunggu.appendChild(
        renderBarisMenunggu(p),
      );

    },
  );
}


/* =========================================================
   BUAT BARIS PER UNIT
   ========================================================= */

function buatBarisPerUnit(
  detail,
  unitPeminjaman,
) {

  const namaBarang =
    detail.inventaris?.nama_barang ||
    "Barang";


  const kodeUnit =
    unitPeminjaman
      ?.unit_inventaris
      ?.kode_unit ||
    "-";


  const unitPeminjamanId =
    unitPeminjaman?.id ||
    "";


  return `
    <tr
      data-detail-id="${escapeHtml(
        detail.id,
      )}"

      data-inventaris-id="${escapeHtml(
        detail.inventaris_id,
      )}"

      data-unit-peminjaman-id="${escapeHtml(
        unitPeminjamanId,
      )}"
    >

      <td class="strong">
        ${escapeHtml(
          namaBarang,
        )}
      </td>

      <td>
        <span class="badge">
          ${escapeHtml(
            kodeUnit,
          )}
        </span>
      </td>

      <td>
        <select class="input f-kondisi">

          <option value="baik">
            Baik
          </option>

          <option value="rusak">
            Rusak
          </option>

          <option value="tidak_lengkap">
            Tidak Lengkap
          </option>

          <option value="hilang">
            Hilang
          </option>

        </select>
      </td>

      <td>
        <input
          type="text"
          class="input f-ket"
          placeholder="Keterangan (opsional)"
        >
      </td>

    </tr>
  `;
}


/* =========================================================
   BUKA MODAL PENGEMBALIAN
   ========================================================= */

tbodyMenunggu?.addEventListener(
  "click",
  async (e) => {

    const btn =
      e.target.closest(
        "[data-buka-pengembalian]",
      );


    if (!btn) {
      return;
    }


    const peminjamanId =
      btn.getAttribute(
        "data-buka-pengembalian",
      );


    if (!peminjamanId) {
      return;
    }


    /*
     * PENTING:
     *
     * Query ini sengaja TIDAK mengambil
     * kolom dipulihkan.
     *
     * Kita tidak membutuhkan kolom tersebut
     * untuk proses pengembalian satu transaksi.
     */

    const {
      data: p,
      error,
    } =
      await supabase
        .from("peminjaman")
        .select(`
          id,
          nomor_bast,

          detail_peminjaman (
            id,
            jumlah,
            inventaris_id,

            inventaris (
              nama_barang
            ),

            unit_peminjaman (
              id,
              kondisi_saat_pinjam,

              unit_inventaris (
                id,
                kode_unit,
                kondisi,
                status
              )
            )
          )
        `)
        .eq(
          "id",
          peminjamanId,
        )
        .single();


    if (error || !p) {

      console.error(
        "Gagal memuat detail transaksi:",
        error,
      );


      window.showToast?.(
        "Gagal memuat detail transaksi. Cek Console untuk melihat detail error Supabase.",
        "error",
      );

      return;
    }


    if (!modal) {

      console.error(
        "Modal pengembalian tidak ditemukan.",
      );

      return;
    }


    modal.dataset.peminjamanId =
      p.id;


    if (judulModal) {

      judulModal.textContent =
        `Catat Pengembalian — ${
          p.nomor_bast || "-"
        }`;

    }


    const semuaBaris = [];


    /*
     * Setiap detail_peminjaman memiliki
     * unit_peminjaman.
     *
     * Setiap unit_peminjaman memiliki
     * unit_inventaris.
     */

    (p.detail_peminjaman || [])
      .forEach(
        (detail) => {

          const units =
            detail.unit_peminjaman || [];


          units.forEach(
            (unitPeminjaman) => {

              semuaBaris.push(
                buatBarisPerUnit(
                  detail,
                  unitPeminjaman,
                ),
              );

            },
          );

        },
      );


    if (tbodyDetail) {

      tbodyDetail.innerHTML =
        semuaBaris.join("");

    }


    if (
      semuaBaris.length === 0
    ) {

      window.showToast?.(
        "Tidak ada unit fisik yang terhubung dengan transaksi ini.",
        "error",
      );

      return;
    }


    modal.classList.add(
      "open",
    );

  },
);


/* =========================================================
   SIMPAN PENGEMBALIAN
   ========================================================= */

modal?.addEventListener(
  "modal:submit",
  async (e) => {

    const {
      submitBtn,
    } = e.detail;


    const peminjamanId =
      modal.dataset.peminjamanId;


    const tanggalKembali =
      document
        .getElementById(
          "f-tanggal-kembali",
        )
        ?.value;


    /* -----------------------------------------------------
       VALIDASI
       ----------------------------------------------------- */

    if (!peminjamanId) {

      window.showToast?.(
        "ID transaksi tidak ditemukan.",
        "error",
      );

      return;
    }


    if (!tanggalKembali) {

      window.showToast?.(
        "Tanggal pengembalian wajib diisi.",
        "error",
      );

      return;
    }


    const rows =
      [
        ...(
          tbodyDetail
            ?.querySelectorAll("tr") ||
          []
        ),
      ];


    if (
      rows.length === 0
    ) {

      window.showToast?.(
        "Tidak ada unit yang dapat dikembalikan.",
        "error",
      );

      return;
    }


    /* -----------------------------------------------------
       AMBIL DATA DARI FORM
       ----------------------------------------------------- */

    const baris =
      rows.map(
        (tr) => {

          const unitPeminjamanId =
            tr.dataset
              .unitPeminjamanId;


          const detailId =
            tr.dataset.detailId;


          const inventarisId =
            tr.dataset.inventarisId;


          const kondisi =
            normalisasiKondisi(
              tr.querySelector(
                ".f-kondisi",
              )?.value,
            );


          const keterangan =
            tr.querySelector(
              ".f-ket",
            )?.value
              ?.trim() ||
            "";


          return {
            unitPeminjamanId,
            detailId,
            inventarisId,
            kondisi,
            keterangan,
          };

        },
      );


    /* -----------------------------------------------------
       VALIDASI UNIT
       ----------------------------------------------------- */

    const unitTanpaId =
      baris.filter(
        (b) =>
          !b.unitPeminjamanId,
      );


    if (
      unitTanpaId.length > 0
    ) {

      console.error(
        "Unit tanpa ID:",
        unitTanpaId,
      );


      window.showToast?.(
        "Ada unit yang belum terhubung dengan transaksi peminjaman.",
        "error",
      );

      return;
    }


    /* -----------------------------------------------------
       VALIDASI DETAIL
       ----------------------------------------------------- */

    const detailTanpaId =
      baris.filter(
        (b) =>
          !b.detailId,
      );


    if (
      detailTanpaId.length > 0
    ) {

      console.error(
        "Detail tanpa ID:",
        detailTanpaId,
      );


      window.showToast?.(
        "Ada detail peminjaman yang tidak ditemukan.",
        "error",
      );

      return;
    }


    submitBtn.disabled =
      true;


    const teksAwal =
      submitBtn.textContent;


    submitBtn.textContent =
      "Menyimpan…";


    try {

      /* ===================================================
         1. SIMPAN DETAIL PENGEMBALIAN
         =================================================== */

      /*
       * INI BAGIAN YANG SEBELUMNYA MENYEBABKAN ERROR.
       *
       * Database mewajibkan:
       *
       * detail_peminjaman_id
       * kondisi
       * jumlah
       *
       * Sekarang ketiganya diisi.
       */

      const dataPengembalian =
        baris.map(
          (b) => ({

            detail_peminjaman_id:
              b.detailId,

            unit_peminjaman_id:
              b.unitPeminjamanId,

            kondisi:
              b.kondisi,

            jumlah:
              1,

            keterangan:
              b.keterangan ||
              null,

          }),
        );


      console.log(
        "DATA DETAIL PENGEMBALIAN:",
        dataPengembalian,
      );


      const {
        error:
          pengembalianError,
      } =
        await supabase
          .from(
            "detail_pengembalian",
          )
          .insert(
            dataPengembalian,
          );


      if (
        pengembalianError
      ) {

        console.error(
          "Gagal insert detail_pengembalian:",
          pengembalianError,
        );


        throw new Error(
          pengembalianError.message ||
          "Gagal menyimpan detail pengembalian.",
        );
      }


      /* ===================================================
         2. UPDATE UNIT INVENTARIS
         =================================================== */

      for (
        const b of baris
      ) {

        let kondisiUnit =
          "baik";


        let statusUnit =
          "tersedia";


        if (
          b.kondisi ===
          "rusak"
        ) {

          kondisiUnit =
            "rusak";

          statusUnit =
            "rusak";

        }
        else if (
          b.kondisi ===
          "hilang"
        ) {

          kondisiUnit =
            "hilang";

          statusUnit =
            "hilang";

        }
        else if (
          b.kondisi ===
          "tidak_lengkap"
        ) {

          /*
           * Status tetap tersedia.
           *
           * Kondisi menyimpan
           * tidak_lengkap.
           */

          kondisiUnit =
            "tidak_lengkap";

          statusUnit =
            "tersedia";

        }
        else {

          kondisiUnit =
            "baik";

          statusUnit =
            "tersedia";

        }


        const unitInventarisId =
          await ambilUnitInventarisId(
            b.unitPeminjamanId,
          );


        const {
          error:
            unitError,
        } =
          await supabase
            .from(
              "unit_inventaris",
            )
            .update({
              kondisi:
                kondisiUnit,

              status:
                statusUnit,
            })
            .eq(
              "id",
              unitInventarisId,
            );


        if (
          unitError
        ) {

          console.error(
            "Gagal update unit_inventaris:",
            unitError,
          );


          throw new Error(
            unitError.message ||
            "Gagal memperbarui unit inventaris.",
          );
        }

      }


      /* ===================================================
         3. UPDATE DETAIL PEMINJAMAN
         =================================================== */

      const perDetail =
        new Map();


      baris.forEach(
        (b) => {

          if (
            !perDetail.has(
              b.detailId,
            )
          ) {

            perDetail.set(
              b.detailId,
              [],
            );

          }


          perDetail
            .get(b.detailId)
            .push(b);

        },
      );


      for (
        const [
          detailId,
          units,
        ]
        of perDetail
      ) {

        const hitung = {
          baik: 0,
          rusak: 0,
          tidak_lengkap: 0,
          hilang: 0,
        };


        const daftarKeterangan =
          [];


        units.forEach(
          (unit) => {

            hitung[
              unit.kondisi
            ] =
              (
                hitung[
                  unit.kondisi
                ] ||
                0
              ) + 1;


            if (
              unit.keterangan
            ) {

              daftarKeterangan.push(
                `${labelKondisi(
                  unit.kondisi,
                )} — ${
                  unit.keterangan
                }`,
              );

            }

          },
        );


        const bagian =
          [];


        if (
          hitung.baik > 0
        ) {

          bagian.push(
            `Baik: ${hitung.baik}`,
          );

        }


        if (
          hitung.tidak_lengkap > 0
        ) {

          bagian.push(
            `Tidak Lengkap: ${
              hitung.tidak_lengkap
            }`,
          );

        }


        if (
          hitung.rusak > 0
        ) {

          bagian.push(
            `Rusak: ${hitung.rusak}`,
          );

        }


        if (
          hitung.hilang > 0
        ) {

          bagian.push(
            `Hilang: ${hitung.hilang}`,
          );

        }


        let nilaiKondisi =
          bagian.join(
            "; ",
          );


        if (
          daftarKeterangan.length > 0
        ) {

          nilaiKondisi +=
            ` | ${
              daftarKeterangan.join(
                " | ",
              )
            }`;

        }


        const {
          error:
            detailError,
        } =
          await supabase
            .from(
              "detail_peminjaman",
            )
            .update({
              kondisi_saat_kembali:
                nilaiKondisi,
            })
            .eq(
              "id",
              detailId,
            );


        if (
          detailError
        ) {

          console.error(
            "Gagal update detail_peminjaman:",
            detailError,
          );


          throw new Error(
            detailError.message ||
            "Gagal menyimpan kondisi barang.",
          );
        }

      }


      /* ===================================================
         4. UPDATE STATUS PEMINJAMAN
         =================================================== */

      const {
        error:
          peminjamanError,
      } =
        await supabase
          .from(
            "peminjaman",
          )
          .update({
            status:
              "dikembalikan",

            tanggal_kembali:
              tanggalKembali,
          })
          .eq(
            "id",
            peminjamanId,
          );


      if (
        peminjamanError
      ) {

        console.error(
          "Gagal update peminjaman:",
          peminjamanError,
        );


        throw new Error(
          peminjamanError.message ||
          "Gagal menyimpan status peminjaman.",
        );
      }


      /* ===================================================
         5. SELESAI
         =================================================== */

      modal.classList.remove(
        "open",
      );


      delete modal.dataset
        .peminjamanId;


      window.showToast?.(
        "Pengembalian berhasil disimpan.",
        "success",
      );


      await muatMenunggu();


    }
    catch (err) {

      console.error(
        "Gagal menyimpan pengembalian:",
        err,
      );


      window.showToast?.(
        err?.message ||
        "Gagal menyimpan pengembalian.",
        "error",
      );

    }
    finally {

      submitBtn.disabled =
        false;


      submitBtn.textContent =
        teksAwal;

    }

  },
);


/* =========================================================
   AMBIL ID UNIT INVENTARIS
   ========================================================= */

async function ambilUnitInventarisId(
  unitPeminjamanId,
) {

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "unit_peminjaman",
      )
      .select(
        "unit_inventaris_id",
      )
      .eq(
        "id",
        unitPeminjamanId,
      )
      .single();


  if (error) {

    console.error(
      "Gagal mengambil unit_inventaris_id:",
      error,
    );


    throw new Error(
      error.message ||
      "Gagal membaca unit barang.",
    );
  }


  if (
    !data?.unit_inventaris_id
  ) {

    throw new Error(
      "Unit inventaris tidak ditemukan.",
    );

  }


  return data.unit_inventaris_id;
}


/* =========================================================
   MULAI
   ========================================================= */

muatMenunggu();