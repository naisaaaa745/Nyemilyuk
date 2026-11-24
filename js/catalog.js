/* ============================================================
   NyemilYuk! - Katalog, keranjang, dan pemesanan WhatsApp
   Sumber data: Supabase. Harga selalu berasal dari database.
   ============================================================ */

let products = [];
let cart = {};
let toastTimer;
let currentCategory = "Semua";

/* -------------------- Memuat produk dari database -------------------- */
async function loadProducts() {
  const list = document.getElementById("products");
  try {
    products = await CatalogAPI.listAvailable();
    renderProducts(currentCategory);
    renderCart();
  } catch (error) {
    list.innerHTML = '<div class="note">Menu belum bisa dimuat. Periksa koneksi lalu segarkan halaman.</div>';
    showToast(friendlyError(error));
  }
}

function renderProducts(category = "Semua") {
  const list = document.getElementById("products");
  currentCategory = category;
  const shown = category === "Semua" ? products : products.filter(p => p.category === category);

  if (!shown.length) {
    list.innerHTML = '<div class="note">Belum ada menu pada kategori ini.</div>';
    return;
  }

  list.innerHTML = shown.map(p => `
    <article class="card">
      <div class="photo">
        <img src="${escapeHtml(safeImageUrl(p.image_url))}" alt="${escapeHtml(p.name)}" loading="lazy">
        <span class="tag">${escapeHtml(p.tag || "Menu")}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="desc">${escapeHtml(p.description)}</p>
        <div class="card-bottom"><span class="price">${rupiah(p.price)}</span>
        <div class="product-actions">
          <button class="add" data-action="add" data-id="${escapeHtml(p.id)}">+ Keranjang</button>
          <button class="order-now" data-action="order" data-id="${escapeHtml(p.id)}">Pesan</button>
        </div></div>
      </div>
    </article>`).join("");
}

document.getElementById("filters").addEventListener("click", e => {
  const btn = e.target.closest(".filter");
  if (!btn) return;
  document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderProducts(btn.dataset.category);
});

document.getElementById("products").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  if (btn.dataset.action === "add") addToCart(btn.dataset.id);
  if (btn.dataset.action === "order") orderProduct(btn.dataset.id);
});

/* -------------------- Keranjang -------------------- */
function findProduct(id) {
  return products.find(item => String(item.id) === String(id));
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;
  const next = (cart[id] || 0) + 1;
  if (next > Number(product.stock)) {
    showToast("Stok tidak mencukupi.");
    return;
  }
  cart[id] = next;
  renderCart();
  showToast("Berhasil ditambahkan ke keranjang!");
}

function changeQty(id, amount) {
  const next = (cart[id] || 0) + amount;
  const product = findProduct(id);
  if (next > 0 && product && next > Number(product.stock)) {
    showToast("Stok tidak mencukupi.");
    return;
  }
  if (next <= 0) delete cart[id];
  else cart[id] = next;
  renderCart();
}

function removeItem(id) {
  delete cart[id];
  renderCart();
  showToast("Produk dihapus dari keranjang.");
}

function renderCart() {
  const entries = Object.entries(cart);
  const count = entries.reduce((sum, [, qty]) => sum + qty, 0);
  const total = entries.reduce((sum, [id, qty]) => {
    const p = findProduct(id);
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);

  document.getElementById("cartCount").textContent = count;
  document.getElementById("totalPrice").textContent = rupiah(total);
  document.getElementById("checkoutBtn").disabled = count === 0;

  const area = document.getElementById("cartItems");
  if (!entries.length) {
    area.innerHTML = '<div class="empty">Keranjangmu masih kosong.<br>Yuk pilih cemilan favoritmu! 🍜</div>';
    return;
  }

  area.innerHTML = entries.map(([id, qty]) => {
    const p = findProduct(id);
    if (!p) return "";
    return `<div class="cart-row">
      <div><strong>${escapeHtml(p.name)}</strong><small>${rupiah(p.price)} / porsi</small>
      <div class="qty"><button data-cart-action="minus" data-id="${escapeHtml(id)}" aria-label="Kurangi">−</button><b>${qty}</b><button data-cart-action="plus" data-id="${escapeHtml(id)}" aria-label="Tambah">+</button><button class="remove" data-cart-action="remove" data-id="${escapeHtml(id)}">Hapus</button></div></div>
      <strong>${rupiah(p.price * qty)}</strong>
    </div>`;
  }).join("");
}

document.getElementById("cartItems").addEventListener("click", e => {
  const btn = e.target.closest("button[data-cart-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.cartAction === "plus") changeQty(id, 1);
  if (btn.dataset.cartAction === "minus") changeQty(id, -1);
  if (btn.dataset.cartAction === "remove") removeItem(id);
});

function openCart() {
  renderCart();
  document.getElementById("overlay").classList.add("show");
  document.getElementById("drawer").classList.add("show");
}

function closeCart() {
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("drawer").classList.remove("show");
}

/* -------------------- WhatsApp -------------------- */
function buildWhatsappUrl(message) {
  const number = normalizeWhatsapp(APP_CONFIG.WHATSAPP_NUMBER);
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function openWhatsApp(message) {
  const url = buildWhatsappUrl(message);
  if (!url) {
    showToast("Nomor WhatsApp toko belum dikonfigurasi.");
    return false;
  }
  const target = window.open("", "_blank");
  if (target) {
    target.opener = null;
    target.location.replace(url);
  } else {
    window.location.href = url;
  }
  return true;
}

function getCustomerName() {
  const field = document.getElementById("customerName");
  const value = field && field.value.trim() ? field.value.trim().slice(0, 60) : "";
  return value || "Pelanggan WhatsApp";
}

function orderMessage(order) {
  const lines = (order.items || []).map(item =>
    `• ${item.name} x${item.quantity} = ${rupiah(item.subtotal)}`
  ).join("\n");
  return `Halo NyemilYuk!, saya ingin memesan:\n\n${lines}\n\nTotal: ${rupiah(order.total)}\nNama: ${order.customer}\nKode: ${order.code}\n\nMohon konfirmasi ketersediaan dan informasi pembayaran. Terima kasih!`;
}

/* -------------------- Checkout -------------------- */
async function submitOrder(entries, source, button) {
  if (!entries.length) return;
  if (button) {
    button.disabled = true;
    button.dataset.original = button.textContent;
    button.textContent = "Mengirim pesanan…";
  }
  try {
    const order = await OrderAPI.placeOrder(getCustomerName(), source, entries.map(([id, qty]) => ({
      id,
      quantity: qty
    })));
    if (openWhatsApp(orderMessage(order))) {
      cart = {};
      renderCart();
      closeCart();
      showToast("Pesanan tercatat & dibuka di WhatsApp!");
    }
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.original || "Pesan via WhatsApp ↗";
    }
  }
}

async function orderProduct(id) {
  const product = findProduct(id);
  if (!product) return;
  await submitOrder([[id, 1]], "Pesan langsung");
}

async function checkout(event) {
  const entries = Object.entries(cart);
  if (!entries.length) return;
  await submitOrder(entries, "Keranjang", event ? event.currentTarget : document.getElementById("checkoutBtn"));
}

function contactWhatsApp(event) {
  if (event) event.preventDefault();
  openWhatsApp("Halo NyemilYuk!, saya ingin bertanya mengenai menu dan pemesanan. Terima kasih!");
}

/* -------------------- Realtime -------------------- */
sb.channel("nyemilyuk-catalog")
  .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
    loadProducts();
  })
  .subscribe();

window.addEventListener("focus", () => loadProducts());

loadProducts();
renderCart();
