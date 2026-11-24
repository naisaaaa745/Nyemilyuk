/* ============================================================
   NyemilYuk! - Dashboard admin (Supabase)
   Semua perubahan langsung tersimpan di database.
   ============================================================ */

let products = [];
let orders = [];
let currentAdmin = null;
let statusFilter = "Semua";
let selectedOrderId = null;
let uploadedImage = "";
let dashToastTimer;

/* -------------------- Navigasi -------------------- */
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

/* -------------------- Ringkasan -------------------- */
function renderStats() {
  const available = products.filter(p => p.is_available && Number(p.stock) > 0).length;
  const categories = new Set(products.map(p => p.category)).size;
  const activeOrders = orders.filter(o => o.status !== "Dibatalkan");
  const revenue = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  document.getElementById("statProducts").textContent = products.length;
  document.getElementById("statAvailable").textContent = available;
  document.getElementById("statCategories").textContent = categories + " kategori";
  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("statNew").textContent = orders.filter(o => o.status === "Baru").length + " perlu diproses";
  document.getElementById("statRevenue").textContent = rupiah(revenue);
  document.getElementById("statWa").textContent = displayWhatsapp();
  document.getElementById("waInput").textContent = displayWhatsapp();
  document.getElementById("adminEmail").textContent = currentAdmin ? currentAdmin.email : "-";
}

/* -------------------- Pesanan -------------------- */
function orderRows(list, compact = false) {
  if (!list.length) {
    return `<tr><td colspan="6"><div class="empty-state"><span class="big">🧾</span>Belum ada pesanan.<br>Pesanan dari katalog akan muncul di sini.</div></td></tr>`;
  }
  return list.map(o => {
    const items = (o.order_items || []).map(i => `${escapeHtml(i.product_name)} ×${i.quantity}`).join(", ");
    const actions = compact
      ? `<button class="btn btn-ghost btn-small" onclick="showOrderDetail('${escapeHtml(o.id)}')">Detail</button>`
      : `<div class="actions">
           <button class="btn btn-ghost btn-small" onclick="showOrderDetail('${escapeHtml(o.id)}')">Detail</button>
           ${o.status === "Baru" ? `<button class="btn btn-green btn-small" onclick="setOrderStatus('${escapeHtml(o.id)}','Diproses')">Proses</button>` : ""}
           ${o.status === "Diproses" ? `<button class="btn btn-green btn-small" onclick="setOrderStatus('${escapeHtml(o.id)}','Selesai')">Selesai</button>` : ""}
           ${o.status === "Baru" || o.status === "Diproses" ? `<button class="btn btn-danger btn-small" onclick="setOrderStatus('${escapeHtml(o.id)}','Dibatalkan')">Batal</button>` : ""}
           <button class="btn btn-danger btn-small" onclick="deleteOrder('${escapeHtml(o.id)}')">Hapus</button>
         </div>`;
    return `<tr>
      <td data-label="Waktu"><div class="cell-title">${formatDate(o.created_at)}</div><div class="cell-sub">${escapeHtml(o.code)}</div></td>
      <td data-label="Pelanggan"><div class="cell-title">${escapeHtml(o.customer_name)}</div><div class="cell-sub">${escapeHtml(o.source || "-")}</div></td>
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
  document.getElementById("recentOrders").innerHTML = tableShell(orderRows(orders.slice(0, 5), true), ORDER_HEADERS);
}

function renderOrders() {
  const query = (document.getElementById("orderSearch").value || "").toLowerCase().trim();
  let list = orders;
  if (statusFilter !== "Semua") list = list.filter(o => (o.status || "Baru") === statusFilter);
  if (query) {
    list = list.filter(o =>
      String(o.code || "").toLowerCase().includes(query) ||
      String(o.customer_name || "").toLowerCase().includes(query) ||
      (o.order_items || []).some(i => String(i.product_name || "").toLowerCase().includes(query))
    );
  }
  document.getElementById("ordersTable").innerHTML = tableShell(orderRows(list), ORDER_HEADERS);
}

async function setOrderStatus(id, status) {
  try {
    await OrderAPI.setStatus(id, status);
    await reloadAll();
    dashboardToast("Status pesanan diperbarui.");
  } catch (error) {
    dashboardToast(friendlyError(error));
  }
}

async function deleteOrder(id) {
  if (!confirm("Hapus pesanan ini? Tindakan ini tidak bisa dibatalkan.")) return;
  try {
    await OrderAPI.remove(id);
    await reloadAll();
    dashboardToast("Pesanan dihapus.");
  } catch (error) {
    dashboardToast(friendlyError(error));
  }
}

function showOrderDetail(id) {
  const order = orders.find(o => String(o.id) === String(id));
  if (!order) return;
  selectedOrderId = id;
  document.getElementById("orderModalTitle").textContent = "Pesanan " + order.code;

  const items = (order.order_items || []).map(i => `
    <div class="detail-row"><span>${escapeHtml(i.product_name)} ×${i.quantity} <span style="color:var(--muted)">(${rupiah(i.unit_price)})</span></span><strong>${rupiah(i.subtotal)}</strong></div>
  `).join("");

  document.getElementById("orderDetail").innerHTML = `
    <div style="font-size:12px;color:var(--muted);line-height:1.8;margin-top:6px">
      ${formatDate(order.created_at)}<br>
      Pelanggan: <strong style="color:var(--brown)">${escapeHtml(order.customer_name)}</strong><br>
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
  const order = orders.find(o => String(o.id) === String(selectedOrderId));
  if (!order) return;
  const text = `Pesanan ${order.code}\n${formatDate(order.created_at)}\nPelanggan: ${order.customer_name}\n\n` +
    (order.order_items || []).map(i => `• ${i.product_name} x${i.quantity} = ${rupiah(i.subtotal)}`).join("\n") +
    `\n\nTotal: ${rupiah(order.total)}\nStatus: ${order.status}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => dashboardToast("Detail pesanan disalin."))
      .catch(() => dashboardToast("Gagal menyalin detail."));
  } else {
    dashboardToast("Clipboard tidak tersedia di browser ini.");
  }
}

/* -------------------- Produk -------------------- */
function renderProductsTable() {
  const target = document.getElementById("productsTable");
  if (!products.length) {
    target.innerHTML = `<div class="empty-state"><span class="big">🍽️</span>Belum ada produk. Tambahkan menu pertama kamu!</div>`;
    return;
  }
  const rows = products.map(p => `<tr>
    <td data-label="Foto"><img class="thumb" src="${escapeHtml(safeImageUrl(p.image_url))}" alt="${escapeHtml(p.name)}"></td>
    <td data-label="Menu"><div class="cell-title">${escapeHtml(p.name)}</div><div class="cell-sub">${escapeHtml(p.description)}</div></td>
    <td data-label="Kategori">${escapeHtml(p.category)}</td>
    <td data-label="Harga"><strong>${rupiah(p.price)}</strong></td>
    <td data-label="Stok">${Number(p.stock)}</td>
    <td data-label="Status"><span class="badge ${p.is_available ? "badge-selesai" : "badge-hidden"}">${p.is_available ? "Tampil" : "Disembunyikan"}</span></td>
    <td data-label="Aksi"><div class="actions">
      <button class="btn btn-yellow btn-small" onclick="editProduct('${escapeHtml(p.id)}')">Edit</button>
      <button class="btn btn-ghost btn-small" onclick="toggleAvailability('${escapeHtml(p.id)}')">${p.is_available ? "Sembunyikan" : "Tampilkan"}</button>
      <button class="btn btn-danger btn-small" onclick="deleteProduct('${escapeHtml(p.id)}')">Hapus</button>
    </div></td>
  </tr>`).join("");
  target.innerHTML = tableShell(rows, ["Foto", "Menu", "Kategori", "Harga", "Stok", "Status", "Aksi"]);
}

function openProductModal() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("fImage").value = "";
  document.getElementById("imagePreview").hidden = true;
  document.getElementById("fAvailable").checked = true;
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
  const p = products.find(item => String(item.id) === String(id));
  if (!p) return;
  openProductModal();
  document.getElementById("productModalTitle").textContent = "Ubah produk";
  document.getElementById("productId").value = p.id;
  document.getElementById("fName").value = p.name;
  document.getElementById("fDesc").value = p.description;
  document.getElementById("fPrice").value = p.price;
  document.getElementById("fCategory").value = p.category;
  document.getElementById("fStock").value = p.stock;
  document.getElementById("fAvailable").checked = !!p.is_available;
  document.getElementById("fTag").value = p.tag || "";
  const imageUrl = safeImageUrl(p.image_url);
  document.getElementById("fImage").value = imageUrl.startsWith("https://") ? "" : imageUrl;
  uploadedImage = "";
  const preview = document.getElementById("imagePreview");
  preview.src = imageUrl;
  preview.hidden = false;
}

function previewImage(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    validateImageFile(file);
  } catch (error) {
    dashboardToast(error.message);
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

async function toggleAvailability(id) {
  const p = products.find(item => String(item.id) === String(id));
  if (!p) return;
  try {
    await CatalogAPI.update(id, { is_available: !p.is_available });
    await reloadAll();
    dashboardToast(p.is_available ? "Produk disembunyikan dari katalog." : "Produk ditampilkan di katalog.");
  } catch (error) {
    dashboardToast(friendlyError(error));
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const submit = event.currentTarget.querySelector("button[type=submit]");
  const id = document.getElementById("productId").value;
  const name = document.getElementById("fName").value.trim();
  const description = document.getElementById("fDesc").value.trim();
  const price = Number(document.getElementById("fPrice").value);
  const stock = Number(document.getElementById("fStock").value);

  if (!name || !description || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
    dashboardToast("Lengkapi nama, deskripsi, harga, dan stok dengan benar.");
    return;
  }

  const oldProduct = id ? products.find(p => String(p.id) === String(id)) : null;
  const typedUrl = document.getElementById("fImage").value.trim();
  const file = document.getElementById("fImageFile").files && document.getElementById("fImageFile").files[0];

  let imageUrl = oldProduct ? oldProduct.image_url : "assets/images/mangkuk-merah.png";
  if (typedUrl) {
    if (!/^https:\/\/[^\s"'<>]+$/.test(typedUrl) && !/^assets\/images\/[A-Za-z0-9._-]+$/.test(typedUrl)) {
      dashboardToast("URL foto harus https:// atau assets/images/.");
      return;
    }
    imageUrl = typedUrl;
  }

  submit.disabled = true;
  submit.textContent = "Menyimpan…";
  try {
    if (file) {
      const uploaded = await CatalogAPI.uploadImage(file);
      imageUrl = uploaded.url;
    }
    const payload = {
      name: name.slice(0, 80),
      description: description.slice(0, 300),
      price: Math.floor(price),
      category: (document.getElementById("fCategory").value.trim() || "Cemilan").slice(0, 40),
      tag: (document.getElementById("fTag").value.trim() || "Menu").slice(0, 30),
      image_url: imageUrl,
      stock: Math.floor(stock),
      is_available: document.getElementById("fAvailable").checked
    };

    if (id) await CatalogAPI.update(id, payload);
    else await CatalogAPI.create(payload);

    if (oldProduct && file && oldProduct.image_url !== imageUrl) {
      await CatalogAPI.removeImage(oldProduct.image_url).catch(() => {});
    }

    closeProductModal();
    await reloadAll();
    dashboardToast(id ? "Produk diperbarui." : "Produk ditambahkan.");
  } catch (error) {
    dashboardToast(friendlyError(error));
  } finally {
    submit.disabled = false;
    submit.textContent = "Simpan produk";
  }
}

async function deleteProduct(id) {
  const p = products.find(item => String(item.id) === String(id));
  if (!p || !confirm(`Hapus produk "${p.name}" dari katalog?`)) return;
  try {
    await CatalogAPI.remove(id);
    await CatalogAPI.removeImage(p.image_url).catch(() => {});
    await reloadAll();
    dashboardToast("Produk dihapus.");
  } catch (error) {
    dashboardToast(friendlyError(error));
  }
}

/* -------------------- Pengaturan -------------------- */
async function exportData() {
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      whatsapp: displayWhatsapp(),
      products,
      orders
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nyemilyuk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dashboardToast("Data berhasil diunduh.");
  } catch (error) {
    dashboardToast(friendlyError(error));
  }
}

/* -------------------- Umum -------------------- */
function renderAll() {
  renderStats();
  renderRecentOrders();
  renderOrders();
  renderProductsTable();
}

async function reloadAll() {
  try {
    const [productRows, orderRowsData] = await Promise.all([
      CatalogAPI.listAll(),
      OrderAPI.listAll()
    ]);
    products = productRows;
    orders = orderRowsData;
    renderAll();
  } catch (error) {
    dashboardToast(friendlyError(error));
  }
}

function dashboardToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(dashToastTimer);
  dashToastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeProductModal();
    closeOrderModal();
  }
});

/* -------------------- Inisialisasi -------------------- */
(async function init() {
  currentAdmin = await requireAdmin();
  if (!currentAdmin) return;

  renderAll();
  await reloadAll();

  document.documentElement.classList.remove("auth-checking");
  const gate = document.getElementById("authGate");
  if (gate) gate.remove();

  sb.channel("nyemilyuk-admin")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => reloadAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => reloadAll())
    .subscribe();
})();
