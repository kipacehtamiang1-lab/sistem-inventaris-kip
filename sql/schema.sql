-- Data akun (Admin & Pegawai). id = auth.users.id (Supabase Auth).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null default '',
  nip text,
  jabatan text,
  alamat text default 'Komisi Independen Pemilihan Kabupaten Aceh Tamiang',
  email text,
  role text not null default 'pending' check (role in ('admin', 'pegawai', 'pending')),
  created_at timestamptz default now()
);

-- Data barang inventaris kantor.
create table inventaris (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama_barang text not null,
  merk text,
  spesifikasi text,
  tahun_perolehan text,
  charger text,
  total int not null default 0,
  tersedia int not null default 0,
  status text default 'Tersedia',
  created_at timestamptz default now()
);

-- Transaksi peminjaman (1 baris = 1 BAST).
create table peminjaman (
  id uuid primary key default gen_random_uuid(),
  nomor_bast text unique,
  pegawai_id uuid not null references profiles(id),
  tanggal_pinjam date not null default current_date,
  tanggal_kembali date,
  keperluan text,
  status text not null default 'dipinjam' check (status in ('dipinjam', 'dikembalikan')),
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- Rincian barang per transaksi.
create table detail_peminjaman (
  id uuid primary key default gen_random_uuid(),
  peminjaman_id uuid not null references peminjaman(id) on delete cascade,
  inventaris_id uuid not null references inventaris(id),
  jumlah int not null default 1,
  kondisi_saat_pinjam text default 'baik (hidup)',
  kondisi_saat_kembali text,
  created_at timestamptz default now()
);

-- Data tetap/master untuk BAST. Selalu 1 baris (id = 1).
create table pengaturan_bast (
  id int primary key default 1 check (id = 1),
  telepon text default '(0641) 333356, 333358',
  email text default 'acehtamiangkpu@gmail.com',
  p1_nama text default 'Fakhruddin',
  p1_nip text default '198602172010121003',
  p1_jabatan text default 'Kasubbag Keuangan, Umum, dan Logistik pada Sekretariat KIP Kabupaten Aceh Tamiang',
  p1_alamat text default 'Komisi Independen Pemilihan Kabupaten Aceh Tamiang',
  p3_nama text default 'Achmad Yuhardha',
  p3_nip text default '197406031993111001',
  p3_jabatan_1 text default 'Sekretaris KIP Aceh Tamiang',
  p3_jabatan_2 text default 'Selaku Kuasa Pengguna Anggaran',
  format_nomor text default '{urut}/RT.01.2-BAST/1116/1/{tahun}',
  nomor_urut_terakhir int default 0,
  nomor_urut_tahun int default extract(year from current_date)
);

insert into pengaturan_bast (id) values (1);

-- ============================================================================
-- 2. FUNGSI
-- ============================================================================

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function generate_nomor_bast()
returns text
language plpgsql
security definer
as $$
declare
  v_setting pengaturan_bast%rowtype;
  v_now date := current_date;
  v_nomor text;
begin
  select * into v_setting from pengaturan_bast where id = 1 for update;

  if v_setting.nomor_urut_tahun is distinct from extract(year from v_now) then
    v_setting.nomor_urut_terakhir := 0;
    v_setting.nomor_urut_tahun := extract(year from v_now);
  end if;

  v_setting.nomor_urut_terakhir := v_setting.nomor_urut_terakhir + 1;

  v_nomor := v_setting.format_nomor;
  v_nomor := replace(v_nomor, '{urut}', v_setting.nomor_urut_terakhir::text);
  v_nomor := replace(v_nomor, '{bulan}', extract(month from v_now)::text);
  v_nomor := replace(v_nomor, '{tahun}', extract(year from v_now)::text);

  update pengaturan_bast
     set nomor_urut_terakhir = v_setting.nomor_urut_terakhir,
         nomor_urut_tahun = v_setting.nomor_urut_tahun
   where id = 1;

  return v_nomor;
end;
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, nip, jabatan, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', ''),
    coalesce(new.raw_user_meta_data->>'nip', ''),
    coalesce(new.raw_user_meta_data->>'jabatan', ''),
    new.email,
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table profiles enable row level security;
alter table inventaris enable row level security;
alter table peminjaman enable row level security;
alter table detail_peminjaman enable row level security;
alter table pengaturan_bast enable row level security;

create policy "baca inventaris" on inventaris for select using (true);
create policy "baca pengaturan_bast" on pengaturan_bast for select using (true);
create policy "baca profil sendiri" on profiles for select using (auth.uid() = id);

create policy "pegawai baca peminjaman sendiri" on peminjaman for select
  using (pegawai_id = auth.uid());
create policy "pegawai baca detail peminjaman sendiri" on detail_peminjaman for select
  using (exists (select 1 from peminjaman p where p.id = peminjaman_id and p.pegawai_id = auth.uid()));

create policy "admin penuh - profiles" on profiles for all using (is_admin());
create policy "admin penuh - inventaris" on inventaris for all using (is_admin());
create policy "admin penuh - peminjaman" on peminjaman for all using (is_admin());
create policy "admin penuh - detail_peminjaman" on detail_peminjaman for all using (is_admin());
create policy "admin penuh - pengaturan_bast" on pengaturan_bast for all using (is_admin());

