// pegawai/profil.js
// Fungsi profil Pegawai:
// - Menampilkan data profil
// - Ubah nama, NIP, jabatan
// - Ubah kata sandi


import {
  supabase,
  getCurrentProfile
} from "../supabase.js";


/* =========================================================
   HELPER
========================================================= */

function showToast(message, type = "success") {

  if (typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }

  console.log(message);

}


/* =========================================================
   ELEMENT
========================================================= */

const btnUbahProfil =
  document.getElementById(
    "btn-ubah-profil"
  );


const btnUbahPassword =
  document.getElementById(
    "btn-ubah-password"
  );


const modalProfil =
  document.getElementById(
    "modal-ubah-profil"
  );


const modalPassword =
  document.getElementById(
    "modal-ubah-password"
  );


const btnSimpanProfil =
  document.getElementById(
    "btn-simpan-profil"
  );


const btnSimpanPassword =
  document.getElementById(
    "btn-simpan-password"
  );


const inputNama =
  document.getElementById(
    "f-profil-nama"
  );


const inputNip =
  document.getElementById(
    "f-profil-nip"
  );


const inputJabatan =
  document.getElementById(
    "f-profil-jabatan"
  );


const inputEmail =
  document.getElementById(
    "f-profil-email"
  );


const inputPassword =
  document.getElementById(
    "f-password-baru"
  );


const inputPasswordKonfirmasi =
  document.getElementById(
    "f-password-konfirmasi"
  );


/* =========================================================
   STATE
========================================================= */

let profileSekarang = null;


/* =========================================================
   INISIAL
========================================================= */

function buatInisial(nama) {

  return String(nama || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      kata => kata[0]
    )
    .join("")
    .toUpperCase();

}


/* =========================================================
   TAMPILKAN PROFIL
========================================================= */

function tampilkanProfil(profile) {

  if (!profile) return;


  profileSekarang = profile;


  const inisial =
    buatInisial(profile.nama);


  const avatar =
    document.getElementById(
      "p-avatar"
    );


  const nama =
    document.getElementById(
      "p-nama"
    );


  const role =
    document.getElementById(
      "p-role"
    );


  const nip =
    document.getElementById(
      "p-nip"
    );


  const email =
    document.getElementById(
      "p-email"
    );


  const jabatan =
    document.getElementById(
      "p-jabatan"
    );


  if (avatar) {
    avatar.textContent =
      inisial;
  }


  if (nama) {
    nama.textContent =
      profile.nama || "-";
  }


  if (role) {
    role.textContent =
      profile.jabatan ||
      "Pegawai — KIP Kabupaten Aceh Tamiang";
  }


  if (nip) {
    nip.textContent =
      profile.nip || "-";
  }


  if (email) {
    email.textContent =
      profile.email || "-";
  }


  if (jabatan) {
    jabatan.textContent =
      profile.jabatan || "-";
  }

}


/* =========================================================
   LOAD PROFIL
========================================================= */

async function muatProfil() {

  try {

    const profile =
      await getCurrentProfile();


    if (!profile) {

      showToast(
        "Data profil tidak ditemukan.",
        "error"
      );

      return;

    }


    tampilkanProfil(profile);


  } catch (error) {

    console.error(
      "Gagal memuat profil:",
      error
    );


    showToast(
      "Gagal memuat data profil.",
      "error"
    );

  }

}


/* =========================================================
   BUKA MODAL PROFIL
========================================================= */

btnUbahProfil?.addEventListener(
  "click",
  () => {

    if (!profileSekarang) {

      showToast(
        "Data profil belum selesai dimuat.",
        "error"
      );

      return;

    }


    inputNama.value =
      profileSekarang.nama || "";


    inputNip.value =
      profileSekarang.nip || "";


    inputJabatan.value =
      profileSekarang.jabatan || "";


    inputEmail.value =
      profileSekarang.email || "";


    modalProfil.classList.add(
      "open"
    );

  }
);


/* =========================================================
   SIMPAN PROFIL
========================================================= */

btnSimpanProfil?.addEventListener(
  "click",
  async () => {

    const nama =
      inputNama.value.trim();


    const nip =
      inputNip.value.trim();


    const jabatan =
      inputJabatan.value.trim();


    if (!nama) {

      showToast(
        "Nama lengkap wajib diisi.",
        "error"
      );

      inputNama.focus();

      return;

    }


    btnSimpanProfil.disabled = true;

    btnSimpanProfil.textContent =
      "Menyimpan…";


    try {

      const {
        data: {
          user
        },
        error: userError
      } =
        await supabase.auth.getUser();


      if (userError || !user) {
        throw new Error(
          "Sesi login tidak ditemukan."
        );
      }


      const {
        data,
        error
      } =
        await supabase
          .from("profiles")
          .update({
            nama,
            nip: nip || null,
            jabatan: jabatan || null
          })
          .eq(
            "id",
            user.id
          )
          .select("*")
          .single();


      if (error) {
        throw error;
      }


      profileSekarang = data;


      tampilkanProfil(data);


      modalProfil.classList.remove(
        "open"
      );


      showToast(
        "Profil berhasil diperbarui.",
        "success"
      );


      /*
       * Update nama yang ada di navbar
       * tanpa perlu refresh halaman.
       */

      const inisial =
        buatInisial(data.nama);


      document
        .querySelectorAll(
          ".pegawai-nav .name"
        )
        .forEach(
          el => {
            // Nama SIMPEL jangan diubah.
          }
        );


      document
        .querySelectorAll(
          ".profile-chip .avatar"
        )
        .forEach(
          el => {
            el.textContent =
              inisial;
          }
        );


      document
        .querySelectorAll(
          ".profile-chip .info b"
        )
        .forEach(
          el => {
            el.textContent =
              data.nama;
          }
        );


    } catch (error) {

      console.error(
        "Gagal memperbarui profil:",
        error
      );


      showToast(
        error.message ||
        "Gagal memperbarui profil.",
        "error"
      );


    } finally {

      btnSimpanProfil.disabled =
        false;

      btnSimpanProfil.textContent =
        "Simpan Perubahan";

    }

  }
);


/* =========================================================
   BUKA MODAL PASSWORD
========================================================= */

btnUbahPassword?.addEventListener(
  "click",
  () => {

    inputPassword.value =
      "";

    inputPasswordKonfirmasi.value =
      "";


    modalPassword.classList.add(
      "open"
    );


    inputPassword.focus();

  }
);


/* =========================================================
   SIMPAN PASSWORD
========================================================= */

btnSimpanPassword?.addEventListener(
  "click",
  async () => {

    const password =
      inputPassword.value;


    const konfirmasi =
      inputPasswordKonfirmasi.value;


    if (!password) {

      showToast(
        "Kata sandi baru wajib diisi.",
        "error"
      );

      inputPassword.focus();

      return;

    }


    if (password.length < 6) {

      showToast(
        "Kata sandi minimal 6 karakter.",
        "error"
      );

      inputPassword.focus();

      return;

    }


    if (password !== konfirmasi) {

      showToast(
        "Konfirmasi kata sandi tidak sama.",
        "error"
      );

      inputPasswordKonfirmasi.focus();

      return;

    }


    btnSimpanPassword.disabled =
      true;

    btnSimpanPassword.textContent =
      "Menyimpan…";


    try {

      const {
        error
      } =
        await supabase.auth.updateUser({
          password
        });


      if (error) {
        throw error;
      }


      inputPassword.value =
        "";

      inputPasswordKonfirmasi.value =
        "";


      modalPassword.classList.remove(
        "open"
      );


      showToast(
        "Kata sandi berhasil diubah.",
        "success"
      );


    } catch (error) {

      console.error(
        "Gagal mengubah kata sandi:",
        error
      );


      showToast(
        error.message ||
        "Gagal mengubah kata sandi.",
        "error"
      );


    } finally {

      btnSimpanPassword.disabled =
        false;

      btnSimpanPassword.textContent =
        "Simpan Kata Sandi";

    }

  }
);

/* =========================================================
   TOMBOL X DAN BATAL
========================================================= */

document
  .querySelectorAll("[data-modal-close]")
  .forEach(button => {

    button.addEventListener("click", () => {

      modalProfil?.classList.remove("open");

      modalPassword?.classList.remove("open");

    });

  });

/* =========================================================
   KLIK LUAR MODAL
========================================================= */

[modalProfil, modalPassword]
  .forEach(modal => {

    modal?.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          modal.classList.remove(
            "open"
          );

        }

      }
    );

  });


/* =========================================================
   ESCAPE
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Escape") {
      return;
    }


    modalProfil?.classList.remove(
      "open"
    );


    modalPassword?.classList.remove(
      "open"
    );

  }
);


/* =========================================================
   JALANKAN
========================================================= */

muatProfil();