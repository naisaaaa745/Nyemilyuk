/* ============================================================
   NyemilYuk! - Logika login admin (Supabase Auth)
   Tidak ada registrasi publik di halaman ini.
   ============================================================ */

const notice = document.getElementById("authNotice");
const form = document.getElementById("loginForm");
const button = document.getElementById("loginBtn");
const ATTEMPT_KEY = "nyemilyuk.login.attempts";
const BLOCK_KEY = "nyemilyuk.login.blockedUntil";

function showNotice(message, type = "error") {
  notice.textContent = message;
  notice.className = "auth-notice " + type;
  notice.hidden = false;
}

function clearNotice() {
  notice.hidden = true;
  notice.textContent = "";
}

function loginRemainingBlock() {
  const until = Number(sessionStorage.getItem(BLOCK_KEY) || 0);
  return Math.max(0, until - Date.now());
}

function registerFailure() {
  const attempts = Number(sessionStorage.getItem(ATTEMPT_KEY) || 0) + 1;
  sessionStorage.setItem(ATTEMPT_KEY, String(attempts));
  if (attempts >= 5) {
    sessionStorage.setItem(BLOCK_KEY, String(Date.now() + 60000));
    sessionStorage.setItem(ATTEMPT_KEY, "0");
    showNotice("Terlalu banyak percobaan gagal. Tunggu 1 menit sebelum mencoba lagi.");
  }
}

async function checkExistingSession() {
  try {
    const session = await AuthAPI.getSession();
    if (!session) return;
    const role = await AuthAPI.getRole(session.user.id);
    if (role === "admin") location.replace("dashboard.html");
  } catch (error) {
    /* Biarkan halaman login tetap tampil jika sesi tidak valid. */
  }
}

const params = new URLSearchParams(location.search);
if (params.get("error") === "forbidden") {
  showNotice("Akun tersebut bukan admin. Akses dashboard ditolak.");
} else if (params.get("error") === "config") {
  showNotice("Konfigurasi admin belum siap. Hubungi pemilik toko.");
} else if (params.get("error") === "session") {
  showNotice("Sesi berakhir. Silakan login kembali.");
} else if (params.get("message") === "logout") {
  showNotice("Kamu sudah keluar dari panel admin.", "success");
} else if (params.get("message") === "password") {
  showNotice("Password berhasil diubah. Silakan login dengan password baru.", "success");
}

const seconds = Math.ceil(loginRemainingBlock() / 1000);
if (seconds > 0) showNotice(`Terlalu banyak percobaan. Coba lagi dalam ${seconds} detik.`);

form.addEventListener("submit", async event => {
  event.preventDefault();
  clearNotice();

  if (loginRemainingBlock() > 0) {
    showNotice("Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.");
    return;
  }

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) {
    showNotice("Email dan password wajib diisi.");
    return;
  }

  button.disabled = true;
  button.textContent = "Memeriksa…";
  try {
    await AuthAPI.signIn(email, password);
    sessionStorage.setItem(ATTEMPT_KEY, "0");
    sessionStorage.removeItem(BLOCK_KEY);
    location.replace("dashboard.html");
  } catch (error) {
    if (error.code === "not_admin") {
      showNotice("Akun tersebut bukan admin. Akses dashboard ditolak.");
      sessionStorage.setItem(ATTEMPT_KEY, "0");
    } else {
      showNotice(friendlyError(error));
      registerFailure();
    }
    button.disabled = false;
    button.textContent = "Masuk →";
  }
});

checkExistingSession();
