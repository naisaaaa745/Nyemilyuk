/* ============================================================
   NyemilYuk! - Satu-satunya jalan frontend mengakses data.
   Semua penulisan produk/foto hanya bisa dilakukan admin
   karena RLS di database. Pembeli hanya memanggil place_order.
   ============================================================ */

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

/* ---------------- Produk ---------------- */
const CatalogAPI = {
  async listAvailable() {
    const rows = unwrap(await sb
      .from("products")
      .select("*")
      .eq("is_available", true)
      .gt("stock", 0)
      .order("name", { ascending: true }));
    return rows || [];
  },

  async listAll() {
    const rows = unwrap(await sb
      .from("products")
      .select("*")
      .order("created_at", { ascending: false }));
    return rows || [];
  },

  async create(payload) {
    return unwrap(await sb
      .from("products")
      .insert(payload)
      .select()
      .single());
  },

  async update(id, payload) {
    return unwrap(await sb
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single());
  },

  async remove(id) {
    return unwrap(await sb.from("products").delete().eq("id", id));
  },

  async uploadImage(file) {
    validateImageFile(file);
    const ext = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const upload = await sb.storage
      .from(APP_CONFIG.IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;
    const publicUrl = sb.storage.from(APP_CONFIG.IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    return { path, url: publicUrl };
  },

  async removeImage(url) {
    const marker = `/storage/v1/object/public/${APP_CONFIG.IMAGE_BUCKET}/`;
    const raw = String(url || "");
    const index = raw.indexOf(marker);
    if (index === -1) return;
    const path = decodeURIComponent(raw.slice(index + marker.length).split("?")[0]);
    if (!path) return;
    await sb.storage.from(APP_CONFIG.IMAGE_BUCKET).remove([path]);
  }
};

/* ---------------- Pesanan ---------------- */
const OrderAPI = {
  /* Browser hanya mengirim product_id + quantity. Harga dihitung database. */
  async placeOrder(customer, source, items) {
    const payload = items.map(item => ({
      product_id: item.id || item.product_id,
      quantity: Number(item.quantity || item.qty)
    }));
    return unwrap(await sb.rpc("place_order", {
      p_customer: String(customer || "").slice(0, 60),
      p_source: source,
      p_items: payload
    }));
  },

  async listAll() {
    const rows = unwrap(await sb
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false }));
    return rows || [];
  },

  async setStatus(id, status) {
    return unwrap(await sb
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single());
  },

  async remove(id) {
    return unwrap(await sb.from("orders").delete().eq("id", id));
  }
};

/* ---------------- Autentikasi ---------------- */
const AuthAPI = {
  async getSession() {
    const result = await sb.auth.getSession();
    return result.data.session;
  },

  async getRole(userId) {
    const result = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data ? result.data.role : null;
  },

  async signIn(email, password) {
    const result = await sb.auth.signInWithPassword({
      email: String(email || "").trim().toLowerCase(),
      password: String(password || "")
    });
    if (result.error) throw result.error;

    const role = await AuthAPI.getRole(result.data.user.id);
    if (role !== "admin") {
      await sb.auth.signOut();
      const error = new Error("Akun ini tidak memiliki akses admin.");
      error.code = "not_admin";
      throw error;
    }
    return result.data.user;
  },

  async signOut() {
    const result = await sb.auth.signOut();
    if (result.error) throw result.error;
  },

  async resetPassword(email, redirectTo) {
    const result = await sb.auth.resetPasswordForEmail(String(email || "").trim().toLowerCase(), {
      redirectTo
    });
    if (result.error) throw result.error;
  },

  async updatePassword(password) {
    const result = await sb.auth.updateUser({ password: String(password || "") });
    if (result.error) throw result.error;
    return result.data.user;
  },

  onAuthStateChange(callback) {
    return sb.auth.onAuthStateChange(callback);
  }
};
