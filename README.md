# NyemilYuk! 🍟 — Katalog UMKM + Dashboard

Website katalog camilan NyemilYuk! lengkap dengan keranjang, pemesanan otomatis via WhatsApp, dan dashboard untuk mengelola menu serta memantau pesanan.

Dibangun dari file `nyemilyuk_katalog_final.html` dengan **desain, palet warna, layout, dan fitur aslinya dipertahankan**. Kode dipecah jadi struktur yang rapi agar mudah dikembangkan.

---

## Fitur

### Katalog (`index.html`)
- ✅ 4 produk (Piscok, Pisang Crispy Madu, Indomie Bakso Nyemek, Tahu Isi), semuanya punya **foto lokal, nama, deskripsi, dan harga**
- ✅ Filter kategori: Semua menu / Cemilan / Makanan berat
- ✅ Tombol **Pesan** → langsung membuka WhatsApp dengan pesan otomatis
- ✅ Keranjang: **tambah, kurangi, hapus** produk + total otomatis
- ✅ **Checkout** → mengirim daftar pesanan dan total harga ke WhatsApp
- ✅ Field nama pemesan (opsional) ikut masuk ke pesan WhatsApp dan catatan pesanan
- ✅ Tombol chat WhatsApp mengambang
- ✅ Responsif di HP dan laptop (breakpoint 760px & 420px)
- ✅ Setiap pesanan otomatis tercatat di dashboard

### Dashboard (`dashboard.html`)
- 📊 **Ringkasan**: jumlah menu, jumlah kategori, total pesanan, pesanan baru, nilai pesanan, nomor WhatsApp
- 🧾 **Pesanan**: tabel pesanan, pencarian, filter status (Baru / Diproses / Selesai / Dibatalkan), ubah status, hapus, salin detail
- 🍽️ **Produk**: tambah, edit, hapus menu — bisa upload foto atau pakai URL. Perubahan langsung tampil di katalog
- ⚙️ **Pengaturan**: ubah nomor WhatsApp toko, unduh cadangan JSON, reset data
- 🔄 Sinkron otomatis antar tab katalog dan dashboard

**Nomor WhatsApp toko:** `085129793540` → tersimpan sebagai `6285129793540` (format `wa.me`, tanpa tanda `+` dan angka `0` di depan).

---

## Struktur Project

```
Nyemilyuk/
├── index.html              # Halaman katalog (kode utama dari file yang diberikan)
├── dashboard.html          # Panel pengelolaan toko
├── assets/
│   └── images/             # Semua foto produk + foto hero (tersimpan lokal)
│       ├── hero-mie-nyemek.png
│       ├── 1-piscok.jpg
│       ├── 2-pisang-crispy-madu.jpg
│       ├── 3-indomie-bakso-nyemek.jpg
│       └── 5-tahu-isi.jpg
├── css/
│   ├── style.css           # CSS katalog asli (dipindahkan dari <style>)
│   └── dashboard.css       # CSS dashboard, palet warna sama
├── js/
│   ├── products.js         # Data 4 produk bawaan
│   ├── store.js            # localStorage, format Rupiah, utilitas
│   ├── catalog.js          # Logika katalog & keranjang
│   └── dashboard.js        # Logika dashboard
└── README.md
```

---

## Cara Menjalankan

Katalog bisa dibuka langsung dengan double-click `index.html`. Namun agar **katalog dan dashboard memakai penyimpanan yang sama**, jalankan lewat server lokal (direkomendasikan):

```bash
cd Nyemilyuk
python -m http.server 8000
```

Lalu buka:
- Katalog: http://localhost:8000/index.html
- Dashboard: http://localhost:8000/dashboard.html

---

## Cara Pakai

1. Buka **katalog**, pilih menu, lalu klik **Pesan** (langsung satu menu) atau **+ Keranjang** lalu **Pesan via WhatsApp**.
2. WhatsApp akan terbuka dengan pesan yang sudah terisi otomatis. Klik kirim.
3. Buka **dashboard** → menu **Pesanan** akan menampilkan pesanan tersebut. Ubah statusnya menjadi Diproses → Selesai.
4. Di **Produk**, tambah/ubah menu. Kembali ke katalog, menu langsung berubah.
5. Di **Pengaturan**, nomor WhatsApp bisa diganti kapan saja.

---

## Deploy ke GitHub Pages

1. Upload seluruh isi folder `Nyemilyuk` ke repository `Nyemilyuk`.
2. Di GitHub: **Settings → Pages → Source: Deploy from a branch → main / root → Save**.
3. Tunggu beberapa menit, lalu buka `https://naisaaaa745.github.io/Nyemilyuk/`.
4. Dashboard bisa diakses di `https://naisaaaa745.github.io/Nyemilyuk/dashboard.html`.

---

## Catatan Penting

Data produk, pesanan, dan nomor WhatsApp **tersimpan di `localStorage` browser perangkat** — bukan di server. Artinya:

- Perubahan di dashboard hanya terlihat di browser/perangkat yang sama.
- Jika file dibuka langsung lewat `file://`, Chromium mengisolasi penyimpanan per halaman → pesanan katalog belum tentu muncul di dashboard. **Gunakan server lokal atau GitHub Pages** agar keduanya berbagi data.
- Pesanan yang masuk dari pembeli **tidak otomatis muncul di dashboard HP toko** jika pembeli memakai perangkat berbeda.

Untuk pemakaian UMKM nyata lintas perangkat, langkah berikutnya adalah menambahkan backend (Supabase / Firebase / PHP + MySQL) agar produk dan pesanan tersimpan di cloud. Bisa dibuat bertahap tanpa mengubah tampilan katalog.

---

© 2026 NyemilYuk! — Made with love 💛
