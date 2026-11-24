/* ============================================================
   NyemilYuk! - Klien Supabase
   Hanya memakai project URL + anon/publishable key.
   TIDAK ADA service_role key di sini.
   ============================================================ */

const sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "nyemilyuk.auth"
  },
  global: {
    headers: { "x-application-name": "nyemilyuk" }
  }
});
