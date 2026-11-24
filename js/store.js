/* ============================================================
   NyemilYuk! - Lapisan penyimpanan lokal (localStorage)
   Dipakai bersama oleh katalog (index.html) dan dashboard.
   ============================================================ */

const STORE_KEYS = {
  products: "nyemilyuk.products.v2",
  orders: "nyemilyuk.orders.v1",
  whatsapp: "nyemilyuk.whatsapp.v1"
};

const DEFAULT_WHATSAPP = "628129793540"; // 085129793540

const Store = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn("Gagal membaca", key, e);
      return fallback;
    }
  },

  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Gagal menyimpan", key, e);
      return false;
    }
  },

  getProducts() {
    const saved = this._read(STORE_KEYS.products, null);
    if (Array.isArray(saved)) return saved;
    const defaults = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    this._write(STORE_KEYS.products, defaults);
    return defaults;
  },

  saveProducts(products) {
    return this._write(STORE_KEYS.products, products);
  },

  getOrders() {
    const saved = this._read(STORE_KEYS.orders, []);
    return Array.isArray(saved) ? saved : [];
  },

  addOrder(order) {
    const orders = this.getOrders();
    const record = Object.assign({
      id: "NYM-" + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      status: "Baru",
      customer: "Pelanggan WhatsApp",
      source: "Keranjang",
      items: [],
      total: 0
    }, order);
    orders.unshift(record);
    this._write(STORE_KEYS.orders, orders);
    return record;
  },

  updateOrder(id, patch) {
    const orders = this.getOrders().map(o => (o.id === id ? Object.assign({}, o, patch) : o));
    return this._write(STORE_KEYS.orders, orders);
  },

  deleteOrder(id) {
    return this._write(STORE_KEYS.orders, this.getOrders().filter(o => o.id !== id));
  },

  getWhatsapp() {
    const saved = localStorage.getItem(STORE_KEYS.whatsapp);
    return saved || DEFAULT_WHATSAPP;
  },

  setWhatsapp(value) {
    const digits = String(value || "").replace(/\D/g, "");
    const normalized = digits.startsWith("62") ? digits : "62" + digits.replace(/^0/, "");
    localStorage.setItem(STORE_KEYS.whatsapp, normalized);
    return normalized;
  },

  resetAll() {
    Object.values(STORE_KEYS).forEach(k => localStorage.removeItem(k));
    return this.getProducts();
  },

  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      whatsapp: this.getWhatsapp(),
      products: this.getProducts(),
      orders: this.getOrders()
    };
  }
};

/* Format harga dan escape HTML dipakai oleh kedua halaman. */
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
