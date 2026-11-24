/* ============================================================
   NyemilYuk! - Proteksi halaman admin
   Proteksi utama tetap RLS di database; file ini menjaga UX
   dan mencegah dashboard dirender sebelum identitas diverifikasi.
   ============================================================ */

async function requireAdmin() {
  let session = null;
  try {
    session = await AuthAPI.getSession();
  } catch (error) {
    session = null;
  }

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`login.html?next=${next}`);
    return null;
  }

  try {
    const role = await AuthAPI.getRole(session.user.id);
    if (role !== "admin") {
      await AuthAPI.signOut().catch(() => {});
      location.replace("login.html?error=forbidden");
      return null;
    }
  } catch (error) {
    await AuthAPI.signOut().catch(() => {});
    location.replace("login.html?error=config");
    return null;
  }

  /* Memastikan token yang hampir kedaluwarsa langsung disegarkan. */
  sb.auth.onAuthStateChange((event, newSession) => {
    if (event === "SIGNED_OUT") location.replace("login.html?error=session");
  });

  window.addEventListener("focus", () => {
    sb.auth.getSession().catch(() => {});
  });

  return session.user;
}

async function logoutAdmin() {
  try {
    await AuthAPI.signOut();
  } catch (error) {
    /* Tetap arahkan ke login; sesi lokal akan dibersihkan supabase. */
  }
  location.replace("login.html?message=logout");
}
