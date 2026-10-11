-- ============================================================
-- The Embrione "Meet The Team" - Supabase setup
-- Run this whole file once in: Supabase Dashboard -> SQL Editor
-- It is safe to re-run (everything is idempotent).
-- ============================================================

-- 1) Members table ------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  position text not null,
  srn text not null,
  email text not null,
  linkedin_url text,
  github_url text,
  branch text not null,
  semester integer not null check (semester between 1 and 8),
  bio text,
  photo_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- One submission per SRN (case-insensitive). The app also checks this up front
-- to show a friendly message; this index is the safety net.
create unique index if not exists members_srn_unique
  on public.members (upper(srn));

-- 2) Row Level Security -------------------------------------------------
alter table public.members enable row level security;

drop policy if exists "Allow public insert" on public.members;
drop policy if exists "Allow public read" on public.members;
drop policy if exists "Allow admin updates" on public.members;
drop policy if exists "Allow admin deletes" on public.members;

-- Anyone can submit, but only as 'pending' (nobody can self-approve from the form).
create policy "Allow public insert" on public.members
  for insert with check (status = 'pending');

create policy "Allow public read" on public.members
  for select using (true);

-- The admin dashboard uses the public anon key, so these stay open (as in the task brief).
create policy "Allow admin updates" on public.members
  for update using (true);

create policy "Allow admin deletes" on public.members
  for delete using (true);

-- 3) Storage bucket for profile photos ------------------------------------
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read member photos" on storage.objects;
drop policy if exists "Public upload member photos" on storage.objects;
drop policy if exists "Public delete member photos" on storage.objects;

create policy "Public read member photos" on storage.objects
  for select using (bucket_id = 'member-photos');

create policy "Public upload member photos" on storage.objects
  for insert with check (bucket_id = 'member-photos');

create policy "Public delete member photos" on storage.objects
  for delete using (bucket_id = 'member-photos');

-- 4) Mock seed data (all fictional, already approved so /team looks alive) ----
insert into public.members
  (name, domain, position, srn, email, linkedin_url, github_url, branch, semester, bio, photo_url, status)
values
  ('Aarav Mehta', 'Web Development', 'Head', 'PES1UG23CS901', 'aarav.mehta@example.com',
   'https://www.linkedin.com/', 'https://github.com/', 'CSE', 5,
   'Leads the web team and loves shipping clean, fast interfaces. Big on open source, late-night debugging sessions and making every pixel count.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=Aarav%20Mehta&backgroundColor=b6e3f4', 'approved'),

  ('Diya Nair', 'Design', 'Vice-Head', 'PES1UG23EC902', 'diya.nair@example.com',
   'https://www.linkedin.com/', null, 'ECE', 5,
   'Turns rough ideas into slick visuals. Obsessed with typography, motion design and making sure every poster feels unmistakably Embrione.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=Diya%20Nair&backgroundColor=ffd5dc', 'approved'),

  ('Kabir Rao', 'Logistics', 'Core Member', 'PES1UG24ME903', 'kabir.rao@example.com',
   null, 'https://github.com/', 'ME', 3,
   'Keeps events running on time. If something needs to be moved, booked or sorted at 2 AM, Kabir already has a plan and a spreadsheet for it.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=Kabir%20Rao&backgroundColor=c0aede', 'approved'),

  ('Ishita Verma', 'Sponsorship', 'Head', 'PES1UG23AM904', 'ishita.verma@example.com',
   'https://www.linkedin.com/', null, 'AIML', 5,
   'Builds partnerships that fund big ideas. Calm under pressure, great at cold emails and brilliant at turning a polite maybe into a firm yes.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=Ishita%20Verma&backgroundColor=ffdfbf', 'approved'),

  ('Rohan Iyer', 'Social Media', 'Member', 'PES1UG25CS905', 'rohan.iyer@example.com',
   'https://www.linkedin.com/', 'https://github.com/', 'CSE', 1,
   'Writes the captions, edits the reels and watches the analytics. Firmly believes a good meme can do more than a long announcement ever will.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=Rohan%20Iyer&backgroundColor=d1d4f9', 'approved'),

  ('Meera Kulkarni', 'Event Management', 'Core Member', 'PES1UG24BT906', 'meera.kulkarni@example.com',
   'https://www.linkedin.com/', null, 'Biotech', 3,
   'Plans every detail from stage setup to the final vote of thanks. Loves a tight schedule and a crowd that walks out smiling at the end.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=Meera%20Kulkarni&backgroundColor=b6e3f4', 'approved')
on conflict do nothing;
