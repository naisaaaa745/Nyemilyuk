// Backup foto produk dari Supabase Storage.
// Dijalankan hanya di GitHub Actions dengan SERVICE_ROLE key sebagai Secret.
// Key ini TIDAK boleh ada di frontend / repository.

import fs from "node:fs";
import path from "node:path";

const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_IMAGE_BUCKET || "product-images";
const outputDir = process.env.BACKUP_DIR || "storage-backup";

if (!url || !key) {
  console.error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json"
};

async function listAllObjects() {
  const objects = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prefix: "",
        limit,
        offset,
        sortBy: { column: "name", order: "asc" }
      })
    });

    if (!response.ok) {
      throw new Error(`Gagal mendaftar objek storage (${response.status})`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    objects.push(...rows.filter(row => row.id));
    offset += rows.length;
    if (rows.length < limit) break;
  }

  return objects;
}

function encodeObjectPath(name) {
  return String(name).split("/").map(encodeURIComponent).join("/");
}

const objects = await listAllObjects();
let downloaded = 0;

for (const object of objects) {
  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${encodeObjectPath(object.name)}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );

  if (!response.ok) {
    throw new Error(`Gagal mengunduh ${object.name} (${response.status})`);
  }

  const destination = path.join(outputDir, object.name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
  downloaded += 1;
}

console.log(`Backup storage selesai: ${downloaded} file foto.`);
