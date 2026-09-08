// admin/bast.js
// Daftar BAST + Lihat Detail + Cetak BAST
// Terhubung ke Supabase

import { supabase } from '../supabase.js';
import { cetakBastDariTransaksi } from './bast-generator.js';

const VIEW_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
`;

const PRINT_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
  <path d="M6 9V3h12v6"/>
  <rect x="6" y="13" width="12" height="8"/>
  <path d="M6 17H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/>
</svg>
`;

// =========================================================
// HELPER
// =========================================================

function escapeHtml(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}

function formatTanggal(iso) {
  if (!iso) return '-';

  return new Date(
    iso + 'T00:00:00'
  ).toLocaleDateString(
    'id-ID',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  );
}

function formatTanggalWaktu(iso) {
  if (!iso) return '-';

  return new Date(
    iso
  ).toLocaleString(
    'id-ID',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  );
}

// =========================================================
// ELEMENT
// =========================================================

const tbody =
  document.querySelector(
    '#tabel-bast tbody'
  );

// =========================================================
// MODAL DETAIL
// =========================================================

function buatModalDetail() {
  let modal =
    document.getElementById(
      'modal-detail-bast'
    );

  if (modal) {
    return modal;
  }

  modal =
    document.createElement(
      'div'
    );

  modal.id =
    'modal-detail-bast';

  modal.className =
    'modal-overlay';

  modal.innerHTML = `
    <div
      class="modal-box"
      style="
        width:min(900px,94vw);
        max-height:90vh;
        overflow:auto;
      "
    >

      <div class="modal-head">

        <h3 id="bast-detail-title">
          Detail BAST
        </h3>

        <button
          type="button"
          class="modal-close"
          id="btn-tutup-detail-bast"
        >
          &times;
        </button>

      </div>

      <div
        class="modal-body"
        id="bast-detail-body"
      >
        Memuat detail…
      </div>

      <div class="modal-foot">

        <button
          type="button"
          class="btn btn-ghost"
          id="btn-tutup-detail-bast-2"
        >
          Tutup
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  function tutup() {
    modal.classList.remove(
      'open'
    );
  }

  modal
    .querySelector(
      '#btn-tutup-detail-bast'
    )
    ?.addEventListener(
      'click',
      tutup
    );

  modal
    .querySelector(
      '#btn-tutup-detail-bast-2'
    )
    ?.addEventListener(
      'click',
      tutup
    );

  modal.addEventListener(
    'click',
    (e) => {
      if (
        e.target === modal
      ) {
        tutup();
      }
    }
  );

  return modal;
}

// =========================================================
// LIHAT DETAIL BAST
// =========================================================

async function lihatDetailBast(
  peminjamanId
) {
  if (!peminjamanId) {
    return;
  }

  const modal =
    buatModalDetail();

  const body =
    modal.querySelector(
      '#bast-detail-body'
    );

  const title =
    modal.querySelector(
      '#bast-detail-title'
    );

  if (title) {
    title.textContent =
      'Detail BAST';
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

  modal.classList.add(
    'open'
  );

  try {

    // =====================================================
    // PEMINJAMAN
    // =====================================================

    const {
      data: peminjaman,
      error: peminjamanError
    } = await supabase
      .from('peminjaman')
      .select(`
        id,
        nomor_bast,
        pegawai_id,
        tanggal_pinjam,
        tanggal_kembali,
        keperluan,
        status,
        alasan_penolakan,
        created_at,
        approved_at
      `)
      .eq(
        'id',
        peminjamanId
      )
      .single();

    if (peminjamanError) {
      throw peminjamanError;
    }

    // =====================================================
    // PEGAWAI
    // =====================================================

    let pegawai = null;

    if (
      peminjaman.pegawai_id
    ) {

      const {
        data,
        error
      } = await supabase
        .from('profiles')
        .select(`
          id,
          nama
        `)
        .eq(
          'id',
          peminjaman.pegawai_id
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      pegawai = data;
    }

    // =====================================================
    // DETAIL PEMINJAMAN
    // =====================================================

    const {
      data: details,
      error: detailError
    } = await supabase
      .from(
        'detail_peminjaman'
      )
      .select(`
        id,
        inventaris_id,
        jumlah
      `)
      .eq(
        'peminjaman_id',
        peminjamanId
      );

    if (detailError) {
      throw detailError;
    }

    const detailList =
      details || [];

    // =====================================================
    // INVENTARIS
    // =====================================================

    const inventarisIds =
      detailList
        .map(
          d =>
            d.inventaris_id
        )
        .filter(Boolean);

    let inventarisMap =
      new Map();

    if (
      inventarisIds.length
    ) {

      const {
        data: inventaris,
        error
      } = await supabase
        .from('inventaris')
        .select(`
          id,
          nama_barang,
          aktif
        `)
        .in(
          'id',
          inventarisIds
        );

      if (error) {
        throw error;
      }

      (
        inventaris || []
      ).forEach(
        item => {
          inventarisMap.set(
            item.id,
            item
          );
        }
      );
    }

    // =====================================================
    // UNIT PEMINJAMAN
    // =====================================================

    const detailIds =
      detailList.map(
        d => d.id
      );

    let unitPeminjaman =
      [];

    if (
      detailIds.length
    ) {

      const {
        data,
        error
      } = await supabase
        .from(
          'unit_peminjaman'
        )
        .select(`
          id,
          detail_peminjaman_id,
          unit_inventaris_id,
          kondisi_saat_pinjam
        `)
        .in(
          'detail_peminjaman_id',
          detailIds
        );

      if (error) {
        throw error;
      }

      unitPeminjaman =
        data || [];
    }

    // =====================================================
    // UNIT INVENTARIS
    // =====================================================

    const unitIds =
      unitPeminjaman
        .map(
          u =>
            u.unit_inventaris_id
        )
        .filter(Boolean);

    let unitMap =
      new Map();

    if (
      unitIds.length
    ) {

      const {
        data: units,
        error
      } = await supabase
        .from(
          'unit_inventaris'
        )
        .select(`
          id,
          kode_unit,
          kondisi,
          status,
          aktif
        `)
        .in(
          'id',
          unitIds
        );

      if (error) {
        throw error;
      }

      (
        units || []
      ).forEach(
        unit => {
          unitMap.set(
            unit.id,
            unit
          );
        }
      );
    }

    // =====================================================
    // BARANG
    // =====================================================

    let barangHtml = '';

    detailList.forEach(
      detail => {

        const inventaris =
          inventarisMap.get(
            detail.inventaris_id
          );

        const namaBarang =
          inventaris
            ?.nama_barang ||
          '-';

        const units =
          unitPeminjaman.filter(
            unit =>
              unit.detail_peminjaman_id ===
              detail.id
          );

        let unitHtml = '';

        if (
          units.length
        ) {

          unitHtml = `
            <div
              style="
                margin-top:.75rem;
                padding:.75rem;
                background:#f8fafc;
                border-radius:8px;
              "
            >

              <div
                class="muted"
                style="
                  font-size:.78rem;
                  margin-bottom:.5rem;
                "
              >
                Unit Barang
              </div>

              <div
                style="
                  display:flex;
                  flex-wrap:wrap;
                  gap:.4rem;
                "
              >

                ${units
                  .map(
                    unitPeminjamanItem => {

                      const unit =
                        unitMap.get(
                          unitPeminjamanItem
                            .unit_inventaris_id
                        );

                      return `
                        <span
                          class="badge badge-info"
                        >
                          ${escapeHtml(
                            unit?.kode_unit ||
                            '-'
                          )}
                        </span>
                      `;
                    }
                  )
                  .join('')}

              </div>

            </div>
          `;
        }

        barangHtml += `
          <div
            style="
              border:1px solid #e5e7eb;
              border-radius:10px;
              padding:1rem;
              margin-bottom:.75rem;
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                gap:1rem;
              "
            >

              <div>

                <strong>
                  ${escapeHtml(
                    namaBarang
                  )}
                </strong>

              </div>

              <span
                class="badge badge-info"
              >
                ${Number(
                  detail.jumlah || 0
                )} unit
              </span>

            </div>

            ${unitHtml}

          </div>
        `;
      }
    );

    // =====================================================
    // STATUS
    // =====================================================

    let statusHtml = `
      <span class="badge badge-info">
        ${escapeHtml(
          peminjaman.status ||
          '-'
        )}
      </span>
    `;

    if (
      peminjaman.status ===
      'dipinjam'
    ) {
      statusHtml = `
        <span class="badge badge-info">
          Dipinjam
        </span>
      `;
    }

    if (
      peminjaman.status ===
      'dikembalikan'
    ) {
      statusHtml = `
        <span class="badge badge-ok">
          Dikembalikan
        </span>
      `;
    }

    if (
      peminjaman.status ===
      'ditolak'
    ) {
      statusHtml = `
        <span class="badge badge-bad">
          Ditolak
        </span>
      `;
    }

    if (
      peminjaman.status ===
      'menunggu'
    ) {
      statusHtml = `
        <span class="badge badge-warn">
          Menunggu
        </span>
      `;
    }

    // =====================================================
    // ALASAN PENOLAKAN
    // =====================================================

    const alasanHtml =
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
                margin-top:.4rem;
              "
            >
              ${escapeHtml(
                peminjaman.alasan_penolakan
              )}
            </div>

          </div>
        `
        : '';

    // =====================================================
    // RENDER MODAL
    // =====================================================

    if (body) {

      body.innerHTML = `

        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(200px,1fr)
              );
            gap:1rem;
            margin-bottom:1.25rem;
          "
        >

          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Nomor BAST
            </div>

            <strong>
              ${escapeHtml(
                peminjaman.nomor_bast ||
                '-'
              )}
            </strong>
          </div>


          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Pegawai
            </div>

            <strong>
              ${escapeHtml(
                pegawai?.nama ||
                '-'
              )}
            </strong>
          </div>


          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Tanggal Pinjam
            </div>

            <strong>
              ${formatTanggal(
                peminjaman.tanggal_pinjam
              )}
            </strong>
          </div>


          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Tanggal Kembali
            </div>

            <strong>
              ${formatTanggal(
                peminjaman.tanggal_kembali
              )}
            </strong>
          </div>


          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Status
            </div>

            ${statusHtml}
          </div>


          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Keperluan
            </div>

            <strong>
              ${escapeHtml(
                peminjaman.keperluan ||
                '-'
              )}
            </strong>
          </div>


          <div>
            <div
              class="muted"
              style="
                font-size:.75rem;
                margin-bottom:.2rem;
              "
            >
              Dibuat
            </div>

            <strong>
              ${formatTanggalWaktu(
                peminjaman.created_at
              )}
            </strong>
          </div>

        </div>


        <h4
          style="
            margin:0 0 .75rem;
          "
        >
          Barang dalam BAST
        </h4>


        ${
          barangHtml ||
          `
            <div class="muted">
              Tidak ada detail barang.
            </div>
          `
        }


        ${alasanHtml}

      `;
    }

  } catch (error) {

    console.error(
      'Gagal memuat detail BAST:',
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
            Gagal memuat detail BAST.
          </strong>

          <div
            class="muted"
            style="
              margin-top:.5rem;
            "
          >
            ${escapeHtml(
              error?.message ||
              'Terjadi kesalahan.'
            )}
          </div>

        </div>
      `;
    }
  }
}

// =========================================================
// RENDER BARIS
// =========================================================

function renderRow(p) {

  const daftarBarang =
    (p.detail_peminjaman || [])
      .map(
        d =>
          d.inventaris
            ?.nama_barang ||
          '-'
      )
      .join(', ');

  const tr =
    document.createElement(
      'tr'
    );

  tr.innerHTML = `

    <td class="strong nowrap">
      ${escapeHtml(
        p.nomor_bast ||
        '-'
      )}
    </td>

    <td>
      ${escapeHtml(
        p.pegawai?.nama ||
        '-'
      )}
    </td>

    <td class="muted nowrap">
      ${formatTanggal(
        p.tanggal_pinjam
      )}
    </td>

    <td>
      ${escapeHtml(
        daftarBarang ||
        '-'
      )}
    </td>

    <td>

      <div class="row-actions">

        <!-- LIHAT DETAIL -->
        <button
          type="button"
          class="btn btn-icon"
          data-view-id="${escapeHtml(
            p.id
          )}"
          title="Lihat detail"
        >
          ${VIEW_ICON}
        </button>


        <!-- CETAK BAST -->
        <button
          type="button"
          class="btn btn-icon"
          data-cetak-id="${escapeHtml(
            p.id
          )}"
          title="Cetak BAST (.docx)"
        >
          ${PRINT_ICON}
        </button>

      </div>

    </td>
  `;

  return tr;
}

// =========================================================
// MUAT DAFTAR BAST
// =========================================================

async function muatDaftarBast() {

  if (!tbody) {
    console.error(
      'Elemen #tabel-bast tbody tidak ditemukan.'
    );

    return;
  }

  tbody.innerHTML = `
    <tr>
      <td
        colspan="5"
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

    // =====================================================
    // PEMINJAMAN
    // =====================================================

    const {
      data,
      error
    } = await supabase
      .from('peminjaman')
      .select(`
        id,
        nomor_bast,
        pegawai_id,
        tanggal_pinjam,
        created_at
      `)
      .order(
        'created_at',
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    const rows =
      data || [];

    // =====================================================
    // PEGAWAI
    // =====================================================

    const pegawaiIds =
      rows
        .map(
          p =>
            p.pegawai_id
        )
        .filter(Boolean);

    let pegawaiMap =
      new Map();

    if (
      pegawaiIds.length
    ) {

      const {
        data: profiles,
        error
      } = await supabase
        .from('profiles')
        .select(
          'id,nama'
        )
        .in(
          'id',
          pegawaiIds
        );

      if (error) {
        throw error;
      }

      (
        profiles || []
      ).forEach(
        profile => {
          pegawaiMap.set(
            profile.id,
            profile
          );
        }
      );
    }

    // =====================================================
    // DETAIL
    // =====================================================

    const peminjamanIds =
      rows.map(
        p => p.id
      );

    let details =
      [];

    if (
      peminjamanIds.length
    ) {

      const {
        data: detailData,
        error
      } = await supabase
        .from(
          'detail_peminjaman'
        )
        .select(`
          id,
          peminjaman_id,
          inventaris_id,
          jumlah
        `)
        .in(
          'peminjaman_id',
          peminjamanIds
        );

      if (error) {
        throw error;
      }

      details =
        detailData || [];
    }

    // =====================================================
    // INVENTARIS
    // =====================================================

    const inventarisIds =
      details
        .map(
          d =>
            d.inventaris_id
        )
        .filter(Boolean);

    let inventarisMap =
      new Map();

    if (
      inventarisIds.length
    ) {

      const {
        data: inventaris,
        error
      } = await supabase
        .from('inventaris')
        .select(`
          id,
          nama_barang
        `)
        .in(
          'id',
          inventarisIds
        );

      if (error) {
        throw error;
      }

      (
        inventaris || []
      ).forEach(
        item => {
          inventarisMap.set(
            item.id,
            item
          );
        }
      );
    }

    // =====================================================
    // GABUNG DATA
    // =====================================================

    const detailMap =
      new Map();

    details.forEach(
      detail => {

        const arr =
          detailMap.get(
            detail.peminjaman_id
          ) || [];

        arr.push({
          ...detail,
          inventaris:
            inventarisMap.get(
              detail.inventaris_id
            ) || null
        });

        detailMap.set(
          detail.peminjaman_id,
          arr
        );
      }
    );

    const hasil =
      rows.map(
        p => ({
          ...p,

          pegawai:
            pegawaiMap.get(
              p.pegawai_id
            ) || null,

          detail_peminjaman:
            detailMap.get(
              p.id
            ) || []
        })
      );

    // =====================================================
    // RENDER
    // =====================================================

    tbody.innerHTML = '';

    if (
      hasil.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="muted"
            style="
              text-align:center;
              padding:2rem;
            "
          >
            Belum ada BAST —
            buat lewat halaman
            Pencatatan Peminjaman.
          </td>
        </tr>
      `;

      return;
    }

    hasil.forEach(
      p => {
        tbody.appendChild(
          renderRow(p)
        );
      }
    );

  } catch (error) {

    console.error(
      'Gagal memuat data BAST:',
      error
    );

    tbody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="muted"
          style="
            text-align:center;
            padding:2rem;
          "
        >
          <strong>
            Gagal memuat data BAST.
          </strong>

          <div
            style="
              margin-top:.5rem;
              font-size:.85rem;
            "
          >
            ${escapeHtml(
              error?.message ||
              'Terjadi kesalahan.'
            )}
          </div>

        </td>
      </tr>
    `;
  }
}

// =========================================================
// EVENT TABEL
// =========================================================

tbody?.addEventListener(
  'click',
  async (e) => {

    // =====================================================
    // LIHAT DETAIL
    // =====================================================

    const btnView =
      e.target.closest(
        '[data-view-id]'
      );

    if (btnView) {

      const id =
        btnView.getAttribute(
          'data-view-id'
        );

      await lihatDetailBast(
        id
      );

      return;
    }

    // =====================================================
    // CETAK
    // =====================================================

    const btnCetak =
      e.target.closest(
        '[data-cetak-id]'
      );

    if (btnCetak) {

      const id =
        btnCetak.getAttribute(
          'data-cetak-id'
        );

      try {

        await cetakBastDariTransaksi(
          id
        );

      } catch (error) {

        console.error(
          'Gagal mencetak BAST:',
          error
        );

        alert(
          error?.message ||
          'Gagal mencetak BAST.'
        );
      }

      return;
    }

  }
);

// =========================================================
// INITIAL
// =========================================================

muatDaftarBast();