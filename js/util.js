/* ============================================================
   NyemilYuk! - Utilitas bersama (format, sanitasi, validasi)
   ============================================================ */

const rupiah = n => "Rp" + Number(n || 0).toLocaleString("id-ID");

const escapeHtml = value => String(value == null ? "" : value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const formatDate = iso => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

/* Hanya izinkan URL gambar lokal yang dikenal atau URL https. */
function safeImageUrl(value) {
  const url = String(value == null ? "" : value).trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
  if (/^assets\/images\/[A-Za-z0-9._-]+$/.test(url)) return url;
  return "assets/images/mangkuk-merah.png";
}

/* Izin MIME dan ukuran dicek di frontend, lalu diverifikasi ulang storage. */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateImageFile(file) {
  if (!file) throw new Error("Pilih foto terlebih dahulu.");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Format foto harus JPG, PNG, atau WEBP.");
  }
  if (file.size > APP_CONFIG.MAX_IMAGE_BYTES) {
    throw new Error("Ukuran foto maksimal 1,5 MB.");
  }
  return true;
}

function normalizeWhatsapp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return digits.startsWith("62") ? digits : "62" + digits.replace(/^0/, "");
}

function displayWhatsapp() {
  const number = normalizeWhatsapp(APP_CONFIG.WHATSAPP_NUMBER);
  return number ? "0" + number.replace(/^62/, "") : "-";
}

/* Pesan error umum: tidak membocorkan detail database/token. */
function friendlyError(error) {
  const message = String((error && error.message) || "");
  if (/Invalid login credentials/i.test(message)) return "Email atau password salah.";
  if (/Email not confirmed/i.test(message)) return "Email belum dikonfirmasi. Cek inbox email kamu.";
  if (/Too many requests|rate limit/i.test(message)) return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";
  if (/JWT|token|expired|session/i.test(message)) return "Sesi berakhir. Silakan login ulang.";
  if (/network|fetch|failed to fetch/i.test(message)) return "Koneksi ke server gagal. Periksa internet kamu.";
  if (/database|schema cache|permission|policy|row-level/i.test(message)) return "Data belum siap. Hubungi admin untuk mengecek konfigurasi database.";
  return "Terjadi kesalahan. Silakan coba lagi.";
}

let globalToastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(globalToastTimer);
  globalToastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}
