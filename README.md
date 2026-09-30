# SIPIN — Sistem Informasi Peminjaman Inventaris
### KIP Kabupaten Aceh Tamiang

Website untuk mengelola inventaris kantor, transaksi peminjaman, BAST
(Berita Acara Serah Terima), pengembalian, riwayat, dan laporan bulanan.

## Stack

- **Frontend:** HTML, CSS, JavaScript murni (tanpa React/Next.js/framework apa pun)
- **Backend & Database:** [Supabase](https://supabase.com) — Auth, PostgreSQL, Row Level Security (RLS)
- **Hosting:** Vercel (static hosting, tanpa proses build)

## Struktur Folder

```
sistem-inventaris-kip/
├── index.html                 → redirect ke login.html
├── login.html / register.html / menunggu-konfirmasi.html
│
├── admin/                     → halaman khusus role "admin"
├── pegawai/                   → halaman khusus role "pegawai"
│
├── css/                        → variables, global, login, dashboard, table, form, modal, animations, responsive
├── js/
│   ├── config.js               → kredensial Supabase (WAJIB diisi, lihat Bagian 1)
│   ├── supabase.js             → inisialisasi client
│   ├── auth/                   → login.js, register.js, auth-guard.js
│   ├── admin/                  → logika tiap halaman admin (semua sudah tersambung Supabase)
│   ├── pegawai/                → logika tiap halaman pegawai
│   └── components/              → sidebar, navbar, modal, notification, logout, confirm-delete, count-up
│
├── templates/bast-template.docx → MASTER TEMPLATE BAST (file Word asli kantor + placeholder)
├── vendor/                      → PizZip & docxtemplater (untuk isi BAST), di-vendor lokal, bukan CDN
├── sql/schema.sql               → SATU file, jalankan sekali di project Supabase baru
└── assets/                      → logo
```

---

## BAGIAN 1 — Setup Supabase (dari nol)

### 1.1 Buat project

1. Buka [supabase.com](https://supabase.com), daftar/masuk.
2. Klik **New Project**. Isi nama bebas, buat **password database** (catat baik-baik), pilih region **Southeast Asia (Singapore)**. Klik **Create new project**, tunggu 1-2 menit.

### 1.2 Jalankan sql/schema.sql

1. Di sidebar kiri, klik **SQL Editor** → **New query**.
2. Buka file `sql/schema.sql`, salin **semua isinya**, tempel ke SQL Editor.
3. Klik **Run**. Ini otomatis membuat semua tabel, fungsi, trigger, dan aturan keamanan (RLS) sekaligus.

> File ini hanya untuk project **baru/kosong**. Kalau sebelumnya sudah pernah menjalankan versi lain dan sekarang berantakan, cara paling aman adalah buat project Supabase yang benar-benar baru, lalu jalankan file ini sekali di situ.

### 1.3 Ambil Project URL & API key

1. Klik ikon gerigi **Settings** di sidebar kiri bawah → **API Keys**.
2. Salin **Project URL** (`https://xxxxx.supabase.co`) dan kunci publik (nama kolomnya **"anon public"** atau **"Publishable key"** — sama saja, keduanya boleh dipakai).

### 1.4 Isi js/config.js

Buka `js/config.js`, ganti dua baris ini dengan nilai dari langkah 1.3:

```js
export const SUPABASE_URL = "https://xxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_xxxxxxxxxxxxx";
```

Simpan file.

### 1.5 Matikan "Confirm email"

Supaya pendaftaran pegawai tidak kena limit pengiriman email (jatah email gratis Supabase sangat terbatas), dan karena sistem ini sudah punya alur konfirmasi sendiri oleh Admin:

1. **Authentication** → **Providers** (atau **Sign In / Providers**) → klik **Email**.
2. Matikan toggle **Confirm email**. Simpan.

### 1.6 Buat akun Admin pertama

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Isi email & password untuk Anda sendiri, centang **Auto Confirm User**, klik **Create user**.
   - Baris profil untuk akun ini **otomatis kebuat sendiri** oleh trigger di database (tidak perlu insert manual).
3. Klik **Table Editor** → tabel **profiles** → cari baris dengan email yang barusan dibuat.
4. Klik kolom **role** di baris itu, ubah nilainya dari `pending` menjadi `admin`. Simpan.

Sekarang akun itu bisa dipakai login sebagai Admin.

---

## BAGIAN 2 — Menjalankan di komputer sendiri (sebelum deploy)

Karena ada `<script type="module">`, buka lewat *live server*, **jangan** double-click file HTML langsung (alamatnya harus `http://...`, bukan `file://...`):

- VS Code: install ekstensi **Live Server**, klik kanan `login.html` → **Open with Live Server**.

---

## BAGIAN 3 — Deploy ke Vercel

Tidak perlu proses build apa pun — ini situs statis murni.

1. Push folder project ini ke repository GitHub (buat repo baru, upload semua isi folder `sistem-inventaris-kip/`).
2. Buka [vercel.com](https://vercel.com), login (bisa pakai akun GitHub).
3. Klik **Add New** → **Project**, pilih repo GitHub yang barusan dibuat.
4. Di pengaturan **Build & Output Settings**, pastikan:
   - **Framework Preset**: `Other`
   - **Build Command**: kosongkan
   - **Output Directory**: kosongkan (biarkan default)
5. Klik **Deploy**. Tunggu sampai selesai — Vercel akan kasih URL seperti `https://nama-project.vercel.app`.
6. Buka URL itu → otomatis diarahkan ke `login.html`. Coba login pakai akun Admin dari Bagian 1.6.

**Catatan:** `js/config.js` berisi kunci **publishable/anon**, yang memang aman ditaruh di kode frontend (bukan rahasia) — jadi tidak masalah ikut ter-upload ke GitHub/Vercel. Yang **tidak boleh** pernah dipakai di sini adalah kunci **service_role/secret**.

---

## BAGIAN 4 — Uji Coba Setelah Deploy

Urutan yang disarankan untuk memastikan semua fitur jalan:

1. **Login** sebagai Admin (akun dari Bagian 1.6).
2. **Manajemen Inventaris** → Tambah Barang → isi kode, nama, jumlah → cek baris baru muncul di tabel.
3. Buka tab **baru** (mode Incognito), buka `register.html`, daftar akun Pegawai baru.
4. Balik ke tab Admin → **Manajemen Pegawai** → akun tadi harus muncul di "menunggu konfirmasi" → klik **Konfirmasi**.
5. Login di tab Incognito pakai akun Pegawai tadi → harus masuk ke `pegawai/dashboard.html`.
6. Balik ke Admin → **Pengaturan BAST** → isi/cek data Pihak Pertama & Mengetahui → **Simpan**.
7. **Pencatatan Peminjaman** → **Catat Peminjaman Baru** → pilih pegawai, pilih barang, simpan → nomor BAST otomatis muncul, stok barang di Inventaris berkurang.
8. Klik ikon printer di baris transaksi tadi → file `.docx` BAST terunduh, isinya harus sesuai data yang diinput.
9. **Pengembalian** → catat pengembalian barang tadi → stok kembali bertambah.
10. **Dashboard** & **Riwayat** → angka dan tabelnya harus mencerminkan semua yang barusan diinput.

Kalau ada langkah yang gagal, buka **F12 → Console** di browser, screenshot pesan merah yang muncul.

---

## Batasan yang Diketahui

- Tombol **"Lihat Detail"** (ikon mata) di tabel Peminjaman/BAST belum berfungsi (dekoratif).
- Menghapus akun Pegawai di Manajemen Pegawai hanya menghapus baris `profiles`, **bukan** akun login-nya di Supabase Auth (perlu `service_role` key yang tidak aman dipakai di browser). Untuk hapus akun Auth sepenuhnya: Supabase Dashboard → Authentication → Users → hapus manual.
- Kolom "Charger" di tabel BAST/Inventaris cocok untuk barang elektronik; untuk barang lain isi dengan "-".
