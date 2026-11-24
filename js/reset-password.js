/* ============================================================
   NyemilYuk! - Alur lupa password via Supabase Auth
   ============================================================ */

const notice = document.getElementById("authNotice");
const requestForm = document.getElementById("requestForm");
const updateForm = document.getElementById("updateForm");
const params = new URLSearchParams(location.search);
const isUpdate = params.get("mode") === "update";

function showNotice(message, type = "error") {
  notice.textContent = message;
  notice.className = "auth-notice " + type;
  notice.hidden = false;
}

if (isUpdate) {
  document.getElementById("resetTitle").textContent = "Password baru";
  document.getElementById("resetSub").textContent = "Buat password baru untuk akun admin kamu.";
  requestForm.hidden = true;
  updateForm.hidden = false;
}

requestForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const redirectTo = new URL("reset-password.html?mode=update", location.href).href;
  const submit = event.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.textContent = "Mengirim…";
  try {
    await AuthAPI.resetPassword(email, redirectTo);
    showNotice("Tautan reset sudah dikirim. Cek inbox dan folder spam email kamu.", "success");
    requestForm.reset();
  } catch (error) {
    showNotice(friendlyError(error));
  } finally {
    submit.disabled = false;
    submit.textContent = "Kirim tautan reset →";
  }
});

updateForm.addEventListener("submit", async event => {
  event.preventDefault();
  const password = document.getElementById("newPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;
  if (password !== confirmation) {
    showNotice("Password dan konfirmasi tidak sama.");
    return;
  }
  const session = await AuthAPI.getSession();
  if (!session) {
    showNotice("Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
    return;
  }
  const submit = event.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.textContent = "Menyimpan…";
  try {
    await AuthAPI.updatePassword(password);
    await AuthAPI.signOut();
    location.replace("login.html?message=password");
  } catch (error) {
    showNotice(friendlyError(error));
    submit.disabled = false;
    submit.textContent = "Simpan password →";
  }
});
