-- ============================================================
-- NyemilYuk! - Migrasi awal Supabase
-- Jalankan lewat Supabase Dashboard > SQL Editor > New query.
-- Aman dijalankan ulang (idempotent).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabel produk
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  price integer not null check (price >= 0),
  category text not null default 'Cemilan' check (char_length(btrim(category)) between 1 and 40),
  tag text not null default 'Menu' check (char_length(tag) <= 30),
  image_url text not null check (image_url <> ''),
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_available_idx
  on public.products (is_available, category) where is_available = true;

-- ------------------------------------------------------------
-- Tabel role. Role TIDAK bisa diisi/diubah dari frontend:
-- sengaja tidak dibuatkan policy INSERT/UPDATE/DELETE.
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabel pesanan. Pembeli TIDAK diberi INSERT langsung;
-- checkout lewat fungsi public.place_order() di bawah.
-- ------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('NYM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name text not null default 'Pelanggan WhatsApp' check (char_length(customer_name) <= 60),
  source text not null default 'Keranjang' check (source in ('Keranjang', 'Pesan langsung')),
  status text not null default 'Baru' check (status in ('Baru', 'Diproses', 'Selesai', 'Dibatalkan')),
  total integer not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_price integer not null check (unit_price >= 0),
  subtotal integer not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ------------------------------------------------------------
-- Fungsi pembantu: cek apakah user saat ini admin.
-- Dibuat SETELAH tabel user_roles ada, karena body SQL
-- diverifikasi saat fungsi dibuat.
-- SECURITY DEFINER sengaja dipakai supaya tidak terjadi rekursi RLS.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ------------------------------------------------------------
-- updated_at otomatis
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Checkout: satu-satunya jalan bagi pembeli untuk membuat pesanan.
-- Harga, nama produk, dan total DIAMBIL DARI DATABASE, bukan dikirim
-- bebas dari browser. Browser hanya mengirim product_id + quantity.
-- ------------------------------------------------------------
create or replace function public.place_order(
  p_customer text,
  p_source text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_total integer := 0;
  v_customer text;
  v_count integer;
begin
  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count is null or v_count < 1 or v_count > 20 then
    raise exception 'Keranjang kosong atau terlalu banyak item';
  end if;

  if p_source not in ('Keranjang', 'Pesan langsung') then
    raise exception 'Sumber pesanan tidak valid';
  end if;

  v_customer := nullif(btrim(coalesce(p_customer, '')), '');
  if v_customer is null then
    v_customer := 'Pelanggan WhatsApp';
  end if;
  v_customer := left(v_customer, 60);

  insert into public.orders (customer_name, source, status, total)
  values (v_customer, p_source, 'Baru', 0)
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_qty := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Jumlah tidak valid';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Jumlah tidak valid';
    end if;

    begin
      select * into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid
        and is_available = true
        and stock > 0;
    exception when others then
      raise exception 'Produk tidak ditemukan';
    end;

    if not found then
      raise exception 'Produk tidak tersedia';
    end if;

    insert into public.order_items
      (order_id, product_id, product_name, quantity, unit_price, subtotal)
    values
      (v_order.id, v_product.id, v_product.name, v_qty, v_product.price, v_product.price * v_qty);

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  update public.orders set total = v_total where id = v_order.id returning * into v_order;

  return jsonb_build_object(
    'id', v_order.id,
    'code', v_order.code,
    'customer', v_order.customer_name,
    'source', v_order.source,
    'status', v_order.status,
    'total', v_order.total,
    'created_at', v_order.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', oi.product_name,
        'quantity', oi.quantity,
        'price', oi.unit_price,
        'subtotal', oi.subtotal
      ) order by oi.created_at)
      from public.order_items oi
      where oi.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.place_order(text, text, jsonb) from public;
grant execute on function public.place_order(text, text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- Hak akses tabel (RLS tetap berlaku di atas ini)
-- ------------------------------------------------------------
revoke all on public.products from anon, authenticated;
grant select on public.products to anon;
-- Tidak memberi TRUNCATE: hak itu mengabaikan RLS.
grant select, insert, update, delete on public.products to authenticated;

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

revoke all on public.orders from anon, authenticated;
grant select, insert, update, delete on public.orders to authenticated;

revoke all on public.order_items from anon, authenticated;
grant select, insert, update, delete on public.order_items to authenticated;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.products enable row level security;
alter table public.user_roles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (is_available = true);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "roles_self_read" on public.user_roles;
create policy "roles_self_read"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
  on public.order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- Storage untuk foto produk: publik saat dibaca, admin saat diubah.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  1572864,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ------------------------------------------------------------
-- Realtime: katalog pembeli langsung berubah saat admin mengubah menu.
-- ------------------------------------------------------------
alter table public.products replica identity full;
alter table public.orders replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ------------------------------------------------------------
-- Memindahkan 4 menu yang sudah berjalan ke database.
-- Ini bukan data dummy: ini menu asli yang sebelumnya ada di localStorage.
-- Hanya dijalankan jika tabel masih kosong, jadi aman dijalankan ulang.
-- ------------------------------------------------------------
insert into public.products (name, description, price, category, tag, image_url, stock, is_available)
select * from (values
  ('Piscok', 'Pisang berbalut cokelat renyah, manis legit dan bikin nagih.', 3000, 'Cemilan', 'Favorit', 'assets/images/1-piscok.jpg', 50, true),
  ('Pisang Crispy Madu', 'Pisang renyah dengan taburan madu, manis alami dan gurih.', 5000, 'Cemilan', 'Best seller', 'assets/images/2-pisang-crispy-madu.jpg', 50, true),
  ('Indomie Bakso Nyemek', 'Indomie nyemek hangat dengan bakso dan bumbu mantap.', 15000, 'Makanan berat', 'Bikin kenyang', 'assets/images/3-indomie-bakso-nyemek.jpg', 30, true),
  ('Tahu Isi', 'Tahu isi goreng dengan balutan tepung renyah dan isian gurih.', 5000, 'Cemilan', 'Gurih & renyah', 'assets/images/5-tahu-isi.jpg', 50, true)
) as seed(name, description, price, category, tag, image_url, stock, is_available)
where not exists (select 1 from public.products);

-- ============================================================
-- LANJUTAN WAJIB (sekali, setelah migration ini):
-- 1. Supabase Dashboard > Authentication > Providers > Email:
--    matikan "Confirm email" jika ingin langsung bisa login, atau
--    biarkan aktif dan konfirmasi email admin terlebih dahulu.
-- 2. Supabase Dashboard > Authentication > Users > Add user:
--    buat akun admin (email + password), lalu salin UUID/user_id-nya.
-- 3. Jalankan SQL ini di SQL Editor (ganti UUID di bawah):
--    insert into public.user_roles (user_id, role)
--    values ('UUID_ADMIN_DI_SINI', 'admin')
--    on conflict (user_id) do update set role = 'admin';
-- ============================================================
