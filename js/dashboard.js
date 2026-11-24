/* ============================================================
   NyemilYuk! - Logika dashboard toko
   ============================================================ */

let statusFilter = "Semua";
let selectedOrderId = null;
let uploadedImage = "";
let dashToastTimer;

/* ---------- Navigasi tab ---------- */
document.querySelectorAll(".tab[data-target]").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab[data-target]").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function setStatusFilter(btn) {
  statusFilter = btn.dataset.status;
  document.querySelectorAll(".tab[data-status]").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderOrders();
}

/* ---------- Ringkasan ---------- */
function renderStats() {
  const products = Store.getProducts();
  const orders = Store.getOrders();
  const categories = new Set(products.map(p => p.category)).size;
  const revenue = orders
    .filter(o => o.status !== "Dibatalkan")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  document.getElementById("statProducts").textContent = products.length;
  document.getElementById("statCategories").textContent = categories + " kategori";
  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("statNew").textContent = orders.filter(o => o.status === "Baru").length + " perlu diproses";
  document.getElementById("statRevenue").textContent = rupiah(revenue);
  document.getElementById("statWa").textContent = "0" + Store.getWhatsapp().replace(/^62/, "");
}

function orderRows(orders, compact = false) {
  if (!orders.length) {
    return `<tr><td colspan="6"><div class="empty-state"><span class="big">🧾</span>Belum ada pesanan.<br>Pesanan dari katalog akan muncul di sini.</div></td></tr>`;
  }
  return orders.map(o => {
    const items = (o.items || []).map(i => `${escapeHtml(i.name)} ×${i.qty}`).join(", ");
    const actions = compact
      ? `<button class="btn btn-ghost btn-small" onclick="showOrderDetail('${o.id}')">Detail</button>`
      : `<div class="actions">
           <button class="btn btn-ghost btn-small" onclick="showOrderDetail('${o.id}')">Detail</button>
           ${o.status === "Baru" ? `<button class="btn btn-green btn-small" onclick="setOrderStatus('${o.id}','Diproses')">Proses</button>` : ""}
           ${o.status === "Diproses" ? `<button class="btn btn-green btn-small" onclick="setOrderStatus('${o.id}','Selesai')">Selesai</button>` : ""}
           ${o.status === "Baru" || o.status === "Diproses" ? `<button class="btn btn-danger btn-small" onclick="setOrderStatus('${o.id}','Dibatalkan')">Batal</button>` : ""}
           <button class="btn btn-danger btn-small" onclick="deleteOrder('${o.id}')">Hapus</button>
         </div>`;
    return `<tr>
      <td data-label="Waktu"><div class="cell-title">${formatDate(o.createdAt)}</div><div class="cell-sub">${escapeHtml(o.id)}</div></td>
      <td data-label="Pelanggan"><div class="cell-title">${escapeHtml(o.customer)}</div><div class="cell-sub">${escapeHtml(o.source || "-")}</div></td>
      <td data-label="Item"><div class="cell-sub">${items || "-"}</div></td>
      <td data-label="Total"><strong>${rupiah(o.total)}</strong></td>
      <td data-label="Status"><span class="badge badge-${String(o.status || "Baru").toLowerCase()}">${escapeHtml(o.status || "Baru")}</span></td>
      <td data-label="Aksi">${actions}</td>
    </tr>`;
  }).join("");
}

function tableShell(body, headers) {
  return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

const ORDER_HEADERS = ["Waktu", "Pelanggan", "Item", "Total", "Status", "Aksi"];

function renderRecentOrders() {
  const orders = Store.getOrders().slice(0, 5);
  document.getElementById("recentOrders").innerHTML = tableShell(orderRows(orders, true), ORDER_HEADERS);
}

function renderOrders() {
  const query = (document.getElementById("orderSearch").value || "").toLowerCase().trim();
  let orders = Store.getOrders();
  if (statusFilter !== "Semua") orders = orders.filter(o => (o.status || "Baru") === statusFilter);
  if (query) orders = orders.filter(o =>
    o.id.toLowerCase().includes(query) ||
    String(o.customer || "").toLowerCase().includes(query) ||
    (o.items || []).some(i => String(i.name).toLowerCase().includes(query))
  );
  document.getElementById("ordersTable").innerHTML = tableShell(orderRows(orders), ORDER_HEADERS);
}

function setOrderStatus(id, status) {
  Store.updateOrder(id, { status });
  renderAll();
  dashboardToast("Status pesanan diperbarui: " + status);
}

function deleteOrder(id) {
  if (!confirm("Hapus pesanan " + id + "? Tindakan ini tidak bisa dibatalkan.")) return;
  Store.deleteOrder(id);
  renderAll();
  dashboardToast("Pesanan dihapus.");
}

/* ---------- Detail pesanan ---------- */
function showOrderDetail(id) {
  const order = Store.getOrders().find(o => o.id === id);
  if (!order) return;
  selectedOrderId = id;
  document.getElementById("orderModalTitle").textContent = "Pesanan " + order.id;

  const items = (order.items || []).map(i => `
    <div class="detail-row"><span>${escapeHtml(i.name)} ×${i.qty} <span style="color:var(--muted)">(${rupiah(i.price)})</span></span><strong>${rupiah(i.subtotal)}</strong></div>
  `).join("");

  document.getElementById("orderDetail").innerHTML = `
    <div style="font-size:12px;color:var(--muted);line-height:1.8;margin-top:6px">
      ${formatDate(order.createdAt)}<br>
      Pelanggan: <strong style="color:var(--brown)">${escapeHtml(order.customer)}</strong><br>
      Sumber: ${escapeHtml(order.source || "-")} ·
      Status: <span class="badge badge-${String(order.status || "Baru").toLowerCase()}">${escapeHtml(order.status || "Baru")}</span>
    </div>
    <div class="detail-list">${items || '<div class="detail-row"><span>Tidak ada item</span></div>'}
      <div class="detail-row" style="border-top:1px solid var(--line);border-bottom:0;padding-top:10px;font-size:15px"><strong>Total</strong><strong>${rupiah(order.total)}</strong></div>
    </div>`;

  document.getElementById("orderOverlay").classList.add("show");
  document.getElementById("orderModal").classList.add("show");
}

function closeOrderModal() {
  document.getElementById("orderOverlay").classList.remove("show");
  document.getElementById("orderModal").classList.remove("show");
  selectedOrderId = null;
}

function copyOrderDetail() {
  const order = Store.getOrders().find(o => o.id === selectedOrderId);
  if (!order) return;
  const text = `Pesanan ${order.id}\n${formatDate(order.createdAt)}\nPelanggan: ${order.customer}\n\n` +
    (order.items || []).map(i => `• ${i.name} x${i.qty} = ${rupiah(i.subtotal)}`).join("\n") +
    `\n\nTotal: ${rupiah(order.total)}\nStatus: ${order.status}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => dashboardToast("Detail pesanan disalin.")).catch(() => dashboardToast("Gagal menyalin detail."));
  } else {
    dashboardToast("Clipboard tidak tersedia di browser ini.");
  }
}

/* ---------- Produk ---------- */
function renderProductsTable() {
  const products = Store.getProducts();
  if (!products.length) {
    document.getElementById("productsTable").innerHTML = `<div class="empty-state"><span class="big">🍽️</span>Belum ada produk. Tambahkan menu pertama kamu!</div>`;
    return;
  }
  const rows = products.map(p => `<tr>
    <td data-label="Foto"><img class="thumb" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"></td>
    <td data-label="Menu"><div class="cell-title">${escapeHtml(p.name)}</div><div class="cell-sub">${escapeHtml(p.desc)}</div></td>
    <td data-label="Kategori">${escapeHtml(p.category)}</td>
    <td data-label="Harga"><strong>${rupiah(p.price)}</strong></td>
    <td data-label="Aksi"><div class="actions">
      <button class="btn btn-yellow btn-small" onclick="editProduct(${p.id})">Edit</button>
      <button class="btn btn-danger btn-small" onclick="deleteProduct(${p.id})">Hapus</button>
    </div></td>
  </tr>`).join("");
  document.getElementById("productsTable").innerHTML = tableShell(rows, ["Foto", "Menu", "Kategori", "Harga", "Aksi"]);
}

function openProductModal() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("fImage").value = "";
  document.getElementById("imagePreview").hidden = true;
  uploadedImage = "";
  document.getElementById("productModalTitle").textContent = "Tambah produk";
  document.getElementById("productOverlay").classList.add("show");
  document.getElementById("productModal").classList.add("show");
}

function closeProductModal() {
  document.getElementById("productOverlay").classList.remove("show");
  document.getElementById("productModal").classList.remove("show");
}

function editProduct(id) {
  const p = Store.getProducts().find(item => item.id === Number(id));
  if (!p) return;
  openProductModal();
  document.getElementById("productModalTitle").textContent = "Ubah produk";
  document.getElementById("productId").value = p.id;
  document.getElementById("fName").value = p.name;
  document.getElementById("fDesc").value = p.desc;
  document.getElementById("fPrice").value = p.price;
  document.getElementById("fCategory").value = p.category;
  document.getElementById("fTag").value = p.tag || "";
  document.getElementById("fImage").value = p.image.startsWith("data:") ? "" : p.image;
  uploadedImage = p.image.startsWith("data:") ? p.image : "";
  const preview = document.getElementById("imagePreview");
  preview.src = p.image;
  preview.hidden = false;
}

function previewImage(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) {
    alert("Ukuran foto terlalu besar (maksimal 1,5 MB). Kompres foto dulu ya.");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    uploadedImage = e.target.result;
    const preview = document.getElementById("imagePreview");
    preview.src = uploadedImage;
    preview.hidden = false;
  };
  reader.readAsDataURL(file);
}

function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById("productId").value;
  const products = Store.getProducts();
  const image = document.getElementById("fImage").value.trim() || uploadedImage || "assets/images/hero-cemilan.jpg";
  const data = {
    name: document.getElementById("fName").value.trim(),
    desc: document.getElementById("fDesc").value.trim(),
    price: Number(document.getElementById("fPrice").value) || 0,
    category: document.getElementById("fCategory").value.trim() || "Cemilan",
    tag: document.getElementById("fTag").value.trim() || "Menu",
    image
  };

  if (id) {
    const index = products.findIndex(p => p.id === Number(id));
    if (index >= 0) products[index] = Object.assign({}, products[index], data);
  } else {
    const nextId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    products.push(Object.assign({ id: nextId }, data));
  }

  if (!Store.saveProducts(products)) {
    alert("Gagal menyimpan. Penyimpanan browser mungkin penuh — coba pakai URL foto, bukan upload.");
    return;
  }
  closeProductModal();
  renderAll();
  dashboardToast(id ? "Produk diperbarui." : "Produk ditambahkan.");
}

function deleteProduct(id) {
  const p = Store.getProducts().find(item => item.id === Number(id));
  if (!p || !confirm("Hapus produk " + p.name + " dari katalog?")) return;
  Store.saveProducts(Store.getProducts().filter(item => item.id !== Number(id)));
  renderAll();
  dashboardToast("Produk dihapus.");
}

/* ---------- Pengaturan ---------- */
function saveWhatsapp() {
  const value = document.getElementById("waInput").value.trim();
  if (value.replace(/\D/g, "").length < 10) {
    alert("Nomor WhatsApp tidak valid. Contoh: 085129793540");
    return;
  }
  const normalized = Store.setWhatsapp(value);
  document.getElementById("waInput").value = normalized;
  renderAll();
  dashboardToast("Nomor WhatsApp disimpan: 0" + normalized.replace(/^62/, ""));
}

function exportData() {
  const blob = new Blob([JSON.stringify(Store.exportData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nyemilyuk-data.json";
  a.click();
  URL.revokeObjectURL(url);
  dashboardToast("Data berhasil diunduh.");
}

function resetData() {
  if (!confirm("Reset semua data? Pesanan akan hilang dan menu kembali ke 5 produk awal.")) return;
  Store.resetAll();
  renderAll();
  dashboardToast("Data toko dikembalikan ke awal.");
}

/* ---------- Umum ---------- */
function renderAll() {
  renderStats();
  renderRecentOrders();
  renderOrders();
  renderProductsTable();
  document.getElementById("waInput").value = Store.getWhatsapp();
}

function dashboardToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(dashToastTimer);
  dashToastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeProductModal();
    closeOrderModal();
  }
});

window.addEventListener("storage", renderAll);

if (location.protocol === "file:") {
  document.getElementById("fileNote").hidden = false;
}

renderAll();
