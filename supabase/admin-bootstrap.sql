-- First platform-owner setup
-- Run this once in Supabase SQL Editor while you are logged in as the platform owner.
-- Replace YOUR_EMAIL with the email of the owner account.
-- This file is intentionally separate from production migrations so it cannot
-- accidentally promote another user.

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'YOUR_EMAIL'
  limit 1
);

-- Verify
select p.id, p.display_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'YOUR_EMAIL';
