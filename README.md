# NyemilYuk! 🍜

Website katalog camilan NyemilYuk! dengan keranjang, pemesanan otomatis via WhatsApp, dan dashboard admin yang aman menggunakan **Supabase Authentication, PostgreSQL, Row Level Security, dan Storage**.

Desain UI/UX, palet warna cokelat–kuning–krem, logo mangkuk mi, layout katalog, dan alur pemesanan WhatsApp dipertahankan dari project sebelumnya.

---

## Struktur project

```
Nyemilyuk/
├── index.html                  # Katalog pembeli
├── dashboard.html              # Panel admin (dilindungi auth + RLS)
├── login.html                  # Login admin (tanpa registrasi publik)
├── reset-password.html         # Lupa password / ganti password
├── css/
│   ├── style.css               # Desain katalog (asli, dipertahankan)
│   ├── dashboard.css           # Desain dashboard
│   └── login.css               # Desain halaman login & reset
├── js/
│   ├── config.js               # URL + anon/public key (nilai publik)
│   ├── util.js                 # Format, sanitasi, validasi file
│   ├── supabase-client.js      # Inisialisasi Supabase (auto-refresh token)
│   ├── api.js                  # Satu-satunya akses data dari frontend
│   ├── auth.js                 # Proteksi dashboard & logout
│   ├── catalog.js              # Katalog, keranjang, checkout WhatsApp
│   ├── dashboard.js            # CRUD produk, pesanan, realtime
│   ├── login.js                # Logika login + rate limit sisi klien
│   └── reset-password.js       # Alur reset password Supabase
├── supabase/
│   ├── migrations/
│   │   └── 20261124000000_initial_schema.sql
│   └── seed_admin.sql
├── .github/
│   ├── scripts/backup-storage.mjs
│   └── workflows/daily-backup.yml
└── assets/images/              # Foto produk + logo mangkuk merah
```

---

## Konfigurasi yang sudah terpasang

`js/config.js` berisi nilai **publik** (bukan rahasia):

- Project URL: `https://thiatxhelnwcfdgafvto.supabase.co`
- anon / publishable key: `sb_publishable_...`
- Nomor WhatsApp: `085129793540` → format `wa.me`: `6285129793540`
- Bucket foto: `product-images`
- Maksimal foto: 1,5 MB (JPG/PNG/WEBP)

> `anon`/`publishable` key memang aman di frontend. **service_role key dan database password tidak pernah ditaruh di repository.** Keduanya hanya sebagai GitHub Actions Secrets.

---

## Langkah menyiapkan Supabase (WAJIB sekali)

### 1. Jalankan migration

Supabase Dashboard → **SQL Editor** → **New query** → tempel seluruh isi
`supabase/migrations/20261124000000_initial_schema.sql` → **Run**.

Migration akan membuat:

- `products`, `user_roles`, `orders`, `order_items`
- fungsi `is_admin()`, `place_order()`, `touch_updated_at()`
- RLS pada semua tabel
- bucket Storage `product-images` + policy admin-only upload/edit/hapus
- replikasi Realtime untuk `products` dan `orders`
- memindahkan 4 menu lama (Piscok, Pisang Crispy Madu, Indomie Bakso Nyemek, Tahu Isi) ke tabel `products`

### 2. Nonaktifkan registrasi publik

Supabase Dashboard → **Authentication** → **Providers** → **Email** → matikan *Allow new user sign ups*.
Admin hanya dibuat lewat Dashboard, bukan lewat website.

### 3. Buat akun admin pertama

1. **Authentication** → **Users** → **Add user**
2. Isi email & password admin, centang **Auto Confirm User**
3. Salin **User UID**
4. Buka `supabase/seed_admin.sql`, ganti `UUID_DI_SINI` dengan UID tersebut, lalu jalankan di SQL Editor

> Role admin **tidak bisa** diberikan dari frontend karena tabel `user_roles` sengaja tidak memiliki policy INSERT/UPDATE.

### 4. Konfigurasi URL reset password

Supabase Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**, tambahkan:

```
http://127.0.0.1:8000/reset-password.html?mode=update
https://<domain-deploy-kamu>/reset-password.html?mode=update
```

### 5. Konfirmasi email (opsional)

Jika *Confirm email* aktif, admin harus mengonfirmasi email dari inbox Supabase sebelum bisa login.

---

## Menjalankan website

Dari folder project:

```bash
python -m http.server 8000
```

Buka:

- Katalog: http://127.0.0.1:8000/index.html
- Login admin: http://127.0.0.1:8000/login.html
- Dashboard: http://127.0.0.1:8000/dashboard.html

> Supabase Auth lebih stabil lewat `http://localhost`/`127.0.0.1` atau HTTPS. Hindari membuka file langsung dengan `file://`.

Deploy ke GitHub Pages / hosting statik lain juga mendukung. Saat dipublikasikan, pastikan **HTTPS** aktif dan URL deploy ditambahkan ke daftar *Redirect URLs* Supabase.

---

## Keamanan yang diterapkan

- **Supabase Auth** untuk login, logout, session persisten, dan auto-refresh token
- **RBAC**: role `admin` vs `user` di tabel `user_roles`; role hanya bisa diisi lewat SQL Editor
- **RLS** di `products`, `user_roles`, `orders`, `order_items`, dan `storage.objects`
- Pembeli hanya bisa `SELECT` produk tersedia; **tidak punya hak INSERT/UPDATE/DELETE/TRUNCATE** pada tabel
- Checkout lewat fungsi `place_order()`; browser hanya mengirim `product_id` + `quantity`
- **Nama produk, harga satuan, dan total dihitung ulang oleh database**, bukan dipercaya dari browser
- Foto produk: validasi MIME + ukuran di frontend, lalu ditegakkan kembali oleh bucket Storage; upload/ubah/hapus hanya admin
- Semua teks dari database di-`escapeHtml` sebelum dirender (XSS)
- URL gambar dibatasi hanya `https://` atau `assets/images/...`
- Pesan error disederhanakan, tidak menampilkan detail database/token
- Rate limit login: bawaan Supabase Auth + cooldown 1 menit setelah 5 kali gagal di sisi klien
- Dashboard menolak akses langsung lewat URL: tanpa sesi → `login.html`; bukan admin → sesi dihapus dan ditolak

Catatan: rate limiting dan proteksi jaringan yang lebih kuat (mis. WAF/Cloudflare) sebaiknya tetap ditambahkan di level hosting untuk produksi.

---

## Backup & restore

### Backup otomatis yang sudah disiapkan

1. **Supabase native backup** — cek paket kamu di *Project Settings → Database → Backups*. Free plan biasanya punya backup harian dengan retensi terbatas; berlangganan plan berbayar jika butuh retensi lebih panjang/PITR.
2. **GitHub Actions harian** — `.github/workflows/daily-backup.yml`
   - `pg_dump` database setiap hari (cron 18:00 UTC ≈ 01:00 WIB)
   - backup foto produk dari Storage lewat script Node terpisah
   - nama file mengandung tanggal, retensi artefak **30 hari**
   - bisa juga dijalankan manual lewat tab **Actions → Daily Supabase Backup → Run workflow**

### GitHub Secrets yang harus diisi

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Isi |
|---|---|
| `SUPABASE_DB_HOST` | Host koneksi langsung, mis. `db.<project-ref>.supabase.co` |
| `SUPABASE_DB_PORT` | `5432` untuk koneksi langsung |
| `SUPABASE_DB_NAME` | Biasanya `postgres` |
| `SUPABASE_DB_USER` | Biasanya `postgres` |
| `SUPABASE_DB_PASSWORD` | Database password yang dibuat saat project dibuat |
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (hanya untuk backup Storage, jangan pernah di frontend) |
| `SUPABASE_IMAGE_BUCKET` | `product-images` |

### Restore database

Unduh artefak `database-YYYY-MM-DD` dari GitHub Actions, lalu:

```bash
gunzip database-YYYY-MM-DD.dump.gz
pg_restore --clean --if-exists --no-owner --no-privileges \
  --host="$SUPABASE_DB_HOST" --port=5432 \
  --username="$SUPABASE_DB_USER" --dbname="$SUPABASE_DB_NAME" \
  database-YYYY-MM-DD.dump
```

### Restore foto produk

Unduh artefak `storage-YYYY-MM-DD`, ekstrak, lalu unggah kembali isi folder ke bucket `product-images` lewat Supabase Dashboard atau Supabase CLI. Pastikan URL di kolom `products.image_url` sesuai dengan path hasil unggah.

---

## Pengujian

### Sudah dapat diverifikasi tanpa kredensial tambahan

- Katalog dan login/admin memuat Supabase client tanpa error
- Halaman dashboard langsung mengalihkan pengunjung yang belum login ke `login.html`
- Tombol checkout/Pesan tidak lagi mengirim harga bebas dari browser
- Validasi file foto dan sanitasi teks aktif

### Perlu dijalankan setelah migration + akun admin dibuat

1. Admin berhasil login
2. Akun tanpa role admin ditolak meskipun password benar
3. Pengunjung tidak bisa membuka `dashboard.html` langsung
4. Admin menambah produk
5. Admin mengedit produk
6. Admin menghapus produk dengan konfirmasi
7. Foto produk berhasil diunggah
8. Perubahan muncul di katalog pembeli (Realtime)
9. Pembeli gagal menulis ke API/tabel products (ditolak RLS)
10. Pesanan WhatsApp terbuka dengan nama, jumlah, harga, dan total dari database
11. Backup database dan Storage berhasil dibuat dari GitHub Actions
12. Tidak ada error di console browser
13. Tampilan responsif di HP dan laptop

> Status pengujian live akan diperbarui setelah migration dijalankan di project Supabase kamu. Sebelum itu, sistem **belum** saya nyatakan aman atau backup **belum** saya nyatakan berjalan.

---

## Nomor WhatsApp

`085129793540` → `6285129793540` (format `wa.me`), dipakai oleh tombol **Pesan**, **Checkout**, dan **Chat WhatsApp**.
