-- ============================================================
-- CARA MEMBUAT ADMIN PERTAMA (jalankan SETELAH migration utama)
-- ============================================================
-- 1. Supabase Dashboard > Authentication > Users > Add user
--    - Email: email admin kamu sendiri
--    - Password: password kuat (minimum 8 karakter)
--    - Centang "Auto Confirm User" agar bisa langsung login
-- 2. Setelah user dibuat, klik baris user itu dan salin UUID / User UID.
-- 3. Ganti UUID_DI_SINI di bawah dengan UUID tersebut.
-- 4. Jalankan query di SQL Editor.
-- 5. Jangan pernah menjalankan ini dari frontend / browser.
-- ============================================================

insert into public.user_roles (user_id, role)
values ('UUID_DI_SINI', 'admin')
on conflict (user_id) do update set role = 'admin';

-- Cek hasilnya:
-- select u.email, r.role, r.created_at
-- from auth.users u
-- join public.user_roles r on r.user_id = u.id;
