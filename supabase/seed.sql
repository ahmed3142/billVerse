-- Seed categories from project brief
insert into public.charge_categories(name, type) values
  ('Electricity','common'),
  ('Water','common'),
  ('Gas','common'),
  ('Garbage','common'),
  ('Project security','common'),
  ('Others','common'),
  ('Cleaner','common'),
  ('Fuel','common'),
  ('Generator maintenance','common'),
  ('Electricity','individual'),
  ('Water','individual'),
  ('Gas','individual'),
  ('Dish line','individual'),
  ('Internet line','individual')
on conflict (name, type) do nothing;

-- Example flats in block format (A1, A2... adjust to your building)
insert into public.flats (flat_no) values
  ('A1'), ('A2'), ('A3'), ('A4'),
  ('B1'), ('B2'), ('B3'), ('B4'),
  ('C1'), ('C2'), ('C3'), ('C4')
on conflict (flat_no) do nothing;

-- Profiles must reference existing auth.users rows.
-- Create users in Supabase Auth first, then insert/update profiles with:
--   user_id, flat_id, role, full_name, email
