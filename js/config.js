/* ============================================================
   Konfigurasi publik NyemilYuk!
   - Project URL dan anon/publishable key AMAN ditaruh di frontend.
   - service_role key / database password DILARANG ditaruh di sini.
     Keduanya hanya boleh ada di GitHub Actions Secrets.
   ============================================================ */

const APP_CONFIG = Object.freeze({
  SUPABASE_URL: "https://thiatxhelnwcfdgafvto.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_KM46XFtRemPK_OJPjQprgA_33drOVFd",

  // Nomor WhatsApp toko: 085129793540 (format internasional wa.me)
  WHATSAPP_NUMBER: "6285129793540",

  // Nama bucket Supabase Storage untuk foto produk
  IMAGE_BUCKET: "product-images",

  // Maksimal ukuran foto yang diterima (1,5 MB)
  MAX_IMAGE_BYTES: 1572864
});
