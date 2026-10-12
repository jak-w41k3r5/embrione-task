# The Embrione: Meet The Team

A 3-page onboarding and moderation system built for The Embrione web development recruitment challenge.

- **Live site:** https://jahaanaara-embrione-task.vercel.app
- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Storage) · Vercel

## Pages

| Route | What it does |
| --- | --- |
| `/register` | Registration form with a **live member-card preview**. The profile photo is converted to **WebP in the browser** (max 800px wide, quality 0.8) and uploaded to Supabase Storage only when you press Submit. New profiles are saved with `status: 'pending'`. Duplicate SRNs are rejected. |
| `/admin` | Login-protected moderation dashboard with counters (Total, Pending, Approved, Rejected), tabs, and **Approve / Reject / Delete** buttons. |
| `/team` | Public directory showing **only approved** members, with Domain and Position filters. Seeded with 6 mock profiles. |

## Admin login (as required by the brief)

- Email: `admin@embrione.pes.edu`
- Password: `EmbrioneAdmin@2026`

## Run it locally

1. **Create a Supabase project** (free) at https://supabase.com.
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the `members` table, the policies, the public `member-photos` storage bucket, and 6 mock approved profiles.
3. Copy the env template and fill it in (Supabase -> Project Settings -> API):
   ```bash
   cp .env.local.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```
4. Install and start:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000.

## Deploy on Vercel

1. Push this repo to GitHub (public).
2. On https://vercel.com choose **Add New -> Project** and import the repo.
3. Under **Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`).
4. Deploy, then set the project's domain to `jahaanaara-embrione-task.vercel.app`(Project -> Settings -> Domains).

## How it works

- **Live preview:** one `form` state object in `app/register/page.tsx` feeds both the inputs and the `<MemberCard preview />` component, so every keystroke re-renders the card.
- **WebP conversion:** `lib/image.ts` draws the chosen image onto an HTML5 `<canvas>` (scaled down to 800px max width) and calls `canvas.toBlob(..., 'image/webp', 0.8)`. The result is previewed with a local `blob:` URL and uploaded to the `member-photos` bucket on submit as `<uuid>.webp`.
- **Moderation:** `/admin` updates the `status` column (`pending` -> `approved` / `rejected`). `/team` queries `.eq('status', 'approved')`, so rejected and pending profiles never appear.
- **Duplicate SRNs:** checked up front for a friendly message, and enforced by a unique index on `upper(srn)` in the database.
- **Safety details:** profile links are only rendered if they start with `http(s)://`; the public insert policy only allows `status = 'pending'`.

## Known limitations (kept simple on purpose)

- The admin login is a **client-side check** against the credentials given in the brief, and the update/delete policies are open to the anon key, as in the brief's SQL. A production app would use Supabase Auth with RLS policies tied to an admin role.
- Seed profiles use DiceBear avatars and fictional details.

## Project structure

```
app/
  register/page.tsx   live preview form + WebP upload
  admin/page.tsx      login + moderation dashboard
  team/page.tsx       public directory with filters
components/           MemberCard, Nav, ToastHost, Icons
lib/                  supabase client, WebP conversion, constants, helpers
supabase/schema.sql   table, policies, storage bucket, seed data
```
