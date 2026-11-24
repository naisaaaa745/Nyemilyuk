/* ============================================================
   NyemilYuk! - Logika katalog, keranjang, dan pemesanan WhatsApp
   ============================================================ */

let products = Store.getProducts();
let cart = {};
let toastTimer;

function renderProducts(category = "Semua") {
  const list = document.getElementById("products");
  const shown = category === "Semua" ? products : products.filter(p => p.category === category);

  if (!shown.length) {
    list.innerHTML = '<div class="note">Belum ada menu pada kategori ini.</div>';
    return;
  }

  list.innerHTML = shown.map(p => `
    <article class="card">
      <div class="photo">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
        <span class="tag">${escapeHtml(p.tag || "Menu")}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="desc">${escapeHtml(p.desc)}</p>
        <div class="card-bottom"><span class="price">${rupiah(p.price)}</span>
        <div class="product-actions">
          <button class="add" onclick="addToCart(${p.id})">+ Keranjang</button>
          <button class="order-now" onclick="orderProduct(${p.id})">Pesan</button>
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

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
  showToast("Berhasil ditambahkan ke keranjang!");
}

function changeQty(id, amount) {
  cart[id] = (cart[id] || 0) + amount;
  if (cart[id] <= 0) delete cart[id];
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
    const p = products.find(item => item.id === Number(id));
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);

  document.getElementById("cartCount").textContent = count;
  document.getElementById("totalPrice").textContent = rupiah(total);
  document.getElementById("checkoutBtn").disabled = count === 0;

  const area = document.getElementById("cartItems");
  if (!entries.length) {
    area.innerHTML = '<div class="empty">Keranjangmu masih kosong.<br>Yuk pilih cemilan favoritmu! 🍟</div>';
    return;
  }

  area.innerHTML = entries.map(([id, qty]) => {
    const p = products.find(item => item.id === Number(id));
    if (!p) return "";
    return `<div class="cart-row">
      <div><strong>${escapeHtml(p.name)}</strong><small>${rupiah(p.price)} / porsi</small>
      <div class="qty"><button onclick="changeQty(${p.id},-1)" aria-label="Kurangi">−</button><b>${qty}</b><button onclick="changeQty(${p.id},1)" aria-label="Tambah">+</button><button class="remove" onclick="removeItem(${p.id})">Hapus</button></div></div>
      <strong>${rupiah(p.price * qty)}</strong>
    </div>`;
  }).join("");
}

function openCart() {
  renderCart();
  document.getElementById("overlay").classList.add("show");
  document.getElementById("drawer").classList.add("show");
}

function closeCart() {
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("drawer").classList.remove("show");
}

function openWhatsApp(message) {
  const number = Store.getWhatsapp().replace(/\D/g, "");
  if (!number) {
    alert("Nomor WhatsApp toko belum diatur. Isi lewat Dashboard > Pengaturan.");
    return false;
  }
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function getCustomerName() {
  const field = document.getElementById("customerName");
  return field && field.value.trim() ? field.value.trim() : "Pelanggan WhatsApp";
}

function orderProduct(id) {
  const p = products.find(item => item.id === Number(id));
  if (!p) return;

  const message = `Halo, saya ingin memesan:\n\n${p.name}\nJumlah: 1\nHarga: ${rupiah(p.price)}\n\nNama: ${getCustomerName()}\n\nMohon konfirmasi ketersediaannya. Terima kasih!`;

  Store.addOrder({
    customer: getCustomerName(),
    source: "Pesan langsung",
    items: [{ id: p.id, name: p.name, qty: 1, price: Number(p.price), subtotal: Number(p.price) }],
    total: Number(p.price)
  });

  if (openWhatsApp(message)) showToast("Pesanan dicatat & dibuka di WhatsApp!");
}

function contactWhatsApp(event) {
  if (event) event.preventDefault();
  openWhatsApp("Halo NyemilYuk!, saya ingin bertanya mengenai menu dan pemesanan. Terima kasih!");
}

function checkout() {
  const entries = Object.entries(cart);
  if (!entries.length) return;

  let total = 0;
  const items = [];
  const lines = entries.map(([id, qty]) => {
    const p = products.find(item => item.id === Number(id));
    if (!p) return null;
    const subtotal = Number(p.price) * qty;
    total += subtotal;
    items.push({ id: p.id, name: p.name, qty, price: Number(p.price), subtotal });
    return `• ${p.name} x${qty} = ${rupiah(subtotal)}`;
  }).filter(Boolean);

  const customer = getCustomerName();
  const message = `Halo NyemilYuk!, saya ingin memesan:\n\n${lines.join("\n")}\n\nTotal: ${rupiah(total)}\nNama: ${customer}\n\nMohon konfirmasi ketersediaan dan informasi pembayaran. Terima kasih!`;

  Store.addOrder({ customer, source: "Keranjang", items, total });

  if (openWhatsApp(message)) {
    cart = {};
    renderCart();
    closeCart();
    showToast("Pesanan terkirim! Keranjang sudah dikosongkan.");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* Sinkron otomatis kalau produk diubah dari tab Dashboard. */
window.addEventListener("storage", e => {
  if (e.key === STORE_KEYS.products) {
    products = Store.getProducts();
    renderProducts(document.querySelector(".filter.active").dataset.category);
    renderCart();
  }
});

renderProducts();
renderCart();
