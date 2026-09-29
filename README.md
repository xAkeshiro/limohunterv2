# Fleet Marketplace

A used limousine & luxury-transportation marketplace — buy, sell, compare and finance
second-hand livery equipment, with a full admin back office.

This is an **original, from-scratch implementation**. All code, styling, artwork and copy
were written for this project, so the codebase is yours to own, modify and deploy without
third-party theme or plugin licensing.

---

## Quick start

```bash
npm install      # install dependencies
npm run dev      # http://localhost:3000
```

No database server is needed locally: without `DATABASE_URL` the app runs on PGlite (real
Postgres compiled to WebAssembly) in `data/pglite/`, creates its tables and loads sample
data on first start. `npm run seed` resets it to a clean state.

Production build:

```bash
npm run build && SESSION_SECRET=<32+ random chars> npm start
```

`npm start` runs in production mode, which refuses to sign anyone in without a real
`SESSION_SECRET` (see *Configuration*).

### Demo accounts (local only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fleetmarketplace.com` | `demo1234` |
| Seller | `demo@fleetmarketplace.com` | `demo1234` |

These exist only on the built-in local database. A hosted database gets **no** demo
accounts (the password is public), and its admin comes from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` instead. The demo seller is on the Silver Club plan (2 slots) with one
live and one expired listing, so quotas and renewal are visible straight away.

---

## What's included

### Public site

| Area | Status |
|---|---|
| Homepage — hero search, category tiles, featured & recent listings | Working |
| Inventory — faceted filtering, keyword search, 6 sort orders, pagination | Working |
| Listing detail — gallery, spec table, features, seller contact, similar vehicles | Working |
| Compare — up to 4 vehicles side by side, persisted across pages | Working |
| Sell / list a vehicle — gated by account, plan and free listing slot | Working |
| Subscriptions — 3 tiers × private and dealer, quotas and 30-day listing periods | Working |
| Accounts — register, sign in, my listings, saved vehicles | Working |
| Finance & insurance — content page plus a live payment calculator | Working |
| Inquiry capture — listing, finance and general forms, stored in the database | Working |
| SEO — metadata, Open Graph, `Vehicle` JSON-LD, sitemap, robots | Working |

### Admin back office (`/admin`)

| Area | Status |
|---|---|
| Dashboard — counts for listings, drafts, featured, sold, users, inquiries, views, inventory value | Working |
| Listings — every listing across all statuses, with search, status/type filters and 6 sort orders | Working |
| Inline controls — change status, toggle featured, mark sold, delete (with confirmation) | Working |
| Edit listing — full field editing, photo add/remove, publishing controls | Working |
| Add listing — create directly from the admin | Working |
| Inquiries — read and delete every message, linked to its listing | Working |
| Users — all accounts with listing counts and role promotion/demotion | Working |
| Access control — non-admins are redirected before any admin data renders | Working |

Admin routes are `noindex` and the guard runs in the layout, so it covers every page
underneath it. An admin cannot demote their own account, which prevents locking everyone out.

### Stack

- **Next.js 15** (App Router, React 19 server components and server actions)
- **TypeScript** strict mode
- **Tailwind CSS 3**
- **Postgres** via [`postgres`](https://github.com/porsager/postgres) in production (Supabase,
  Neon or any Postgres), and **PGlite** locally and in tests, so both run the same SQL
- **bcryptjs** password hashing; HMAC-signed `httpOnly` session cookies

### Layout

```
src/
  app/
    admin/        dashboard, listings (+ new / [id]/edit), inquiries, users
    (public)      home, inventory, listing/[slug], compare, sell, finance,
                  about, contact, login, register, account, sitemap, robots
  components/
    admin/        admin nav, filters, forms, status + role controls
    (shared)      header, footer, cards, filters, gallery, forms, calculator
  lib/
    db.ts            connection (Postgres or PGlite), schema, first-boot setup
    seed.ts          admin-from-env bootstrap + sample data loader
    seed-data.ts     the 32 sample listings
    queries.ts       public reads
    actions.ts       public writes (inquiries, auth, listings, favourites)
    admin.ts         admin guard + admin-only reads
    admin-actions.ts admin writes, photo uploads, auto-fill
    photos.ts        Wikimedia Commons photo search and matching
    plans.ts         subscription catalogue
    subscriptions.ts quotas, listing expiry, renewals, cancel/resume
    auth.ts          hashing, session signing/verification
    format.ts        currency, mileage, dates, slugs, amortisation
    types.ts         shared types and the body-style vocabulary
scripts/
  seed.ts           reset + reload sample data  (npm run seed; guarded on hosted DBs)
  verify.ts         52-check data-layer test    (npm run verify)
  verify-photos.ts  30-check photo matcher test (npm run verify)
  verify-subscriptions.ts  30-check plan rules test (npm run verify)
  make-images.mjs   regenerates illustrations
  import-photos.ts  bulk-attaches real photos   (npm run import-photos)

`npm run verify` runs every suite against a throwaway in-memory Postgres; it never
touches a real database. Run it before every push.
```

---

## Subscriptions

Selling requires an account and a monthly plan, matching the original LimoHunter pricing.

| Plan | Subscriptions | Dealer subscriptions |
|---|---|---|
| Bronze Club | 1 listing · $59/mo | 5 listings · $199/mo |
| Silver Club | 2 listings · $109/mo | 10 listings · $349/mo (popular) |
| Gold Club | 3 listings · $149/mo | 30 listings · $899/mo |

Plans live in `src/lib/plans.ts`; the rules live in `src/lib/subscriptions.ts`.

**What is enforced**

- **Active listing quota**: a plan caps how many of your listings are live at once. The
  sell page and the server both check it, so a stale form cannot exceed the limit.
- **30-day listing period**: each listing expires 30 days after it goes live and drops out
  of search, inventory and the sitemap. Renew it from **My account**. Extending a live
  listing needs no free slot; bringing back an expired one does.
- Sold, removed and expired listings free their slot.
- **Changing plan** takes effect immediately. Downgrading below your current usage keeps
  existing listings live but blocks new ones until you are under the limit.
- **Cancelling** keeps the plan working until the end of the paid period, then it ends;
  you can resume before then.
- Admins list house inventory with no plan and no expiry.

**Flow:** Pricing → Sign up → create account (name, email, password) → confirm plan →
account shows the plan and a quota meter → list a vehicle.

**Payments are in demo mode.** Confirming a plan activates it without charging, and an
active plan renews itself each period. To take real payments with Stripe:

1. In `subscribeToPlan` (`src/lib/actions.ts`), send the user to Stripe Checkout instead of
   calling `subscribe()` directly; call `subscribe()` from the webhook once payment succeeds.
2. In `settleLapsed()` (`src/lib/subscriptions.ts`), stop rolling active plans forward and let
   `invoice.paid` / `customer.subscription.updated|deleted` webhooks move
   `current_period_end` and `status`, so an unpaid plan lapses. The comment marked
   `STRIPE:` shows the spot.
3. The schema already has `users.stripe_customer_id` and
   `subscriptions.stripe_subscription_id` (both unique) for mapping webhook events back to
   rows, and a unique index guarantees one current plan per user even if webhooks race.

The admin dashboard shows active subscriptions, plans cancelling at period end, and
monthly recurring revenue; **Users** shows each person's plan.

---

## Photography

### Automatic photos (on by default)

Listings that only have the bundled drawings automatically show **real photos of their
make and model**, pulled from [Wikimedia Commons](https://commons.wikimedia.org) at render
time. No API key, no setup: it works as soon as the site is deployed.

- Searches are built from make, model and vehicle class. Stretch and bus conversions
  are never matched to their base vehicle (a party bus on an F-550 won't show a pickup).
- Results are filtered for relevance: landscape only, at least 800px wide, file title must
  name the make or model, and logos, interiors and scale models are skipped.
- Every Commons file is freely licensed, most with an attribution requirement, so each
  photo's **author and license are shown** under the gallery with links back to the file.
- Pages label them **"Representative photo"**. They show the model, not the vehicle for
  sale, so replace them with real photos before any listing goes to a buyer.
- Lookups are cached. If Wikimedia is unreachable, pages fall back to the drawings
  immediately and stop retrying for a minute, so an outage never slows the site.

Set `AUTO_PHOTOS=0` to turn it off.

### Choosing and storing photos

- **Auto-fill photos** (admin → Listings) finds and *stores* photos for every listing still
  on drawings in one click. Stored photos no longer depend on Wikimedia being reachable.
- **Find photos online** (listing editor) searches Commons and adds picks one by one, with
  credits kept automatically.
- **Upload** real photos (needs `BLOB_READ_WRITE_TOKEN` on Vercel) or **paste image URLs**.

Adding any real photo retires the drawings for that listing. Removing every photo returns
it to automatic photos.

### Bulk import from your own files

```bash
npm run import-photos -- --dir ./photos          # photos/<listing-slug>/*.jpg
npm run import-photos -- --manifest ./photos.json [--link] [--replace]
```

Make sure you hold the rights to any photography you publish.

---

## Other placeholder content

- **Inventory** — the 32 sample listings in `src/lib/seed-data.ts` are illustrative, not
  real stock. They load once into a fresh database; delete them from the admin (they will
  not come back), or set `SEED_DEMO_INVENTORY=0` before first boot to skip them.
- **Logo** — `src/components/Logo.tsx` is a plain generic mark. Drop in the real brand
  asset and set the palette in `tailwind.config.ts` (`brand.*`).
- **Contact details** — the phone number and hours appear in `SiteHeader.tsx`,
  `SiteFooter.tsx`, `about/page.tsx` and `contact/page.tsx`.

---

## Importing real inventory

Listings live in one table. The simplest path is a script that reads your existing export
and inserts rows using the same statement as `seedSampleData` in `src/lib/seed.ts`. The
columns that matter:

`slug` (unique, URL path) · `title` · `body_style` · `make` · `model` · `year` · `price` ·
`mileage` · `passengers` · `condition` · `fuel` · `city` · `state` · `description` ·
`features` (JSON array) · `images` (JSON array) · `seller_name` · `seller_phone` ·
`featured` · `status`

`body_style` should come from the list in `src/lib/types.ts` so filters and category tiles
stay in sync.

---

## Configuration

All variables are documented in `.env.example`. The ones that matter in production:

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | **Yes** | Postgres connection string. `POSTGRES_URL` also works. Without it, data resets on every restart. |
| `SESSION_SECRET` | **Yes** | Signs login cookies. 16+ characters. Without it, nobody can sign in — deliberately, since the development key is in this public repo and would let anyone forge an admin session. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First deploy | Creates the first admin on boot. An existing account is promoted and keeps its password. |
| `BLOB_READ_WRITE_TOKEN` | For uploads | Vercel Blob, so uploaded photos persist. |

Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## Deploying (Vercel + Supabase)

1. **Create the database.** In Supabase, create a project, then open **Connect** and copy
   the **Transaction pooler** connection string (port `6543`). Replace `[YOUR-PASSWORD]`
   with the database password you chose. Use the pooler, not the direct connection:
   serverless functions open many short-lived connections.
2. **Add environment variables** in Vercel → Project → Settings → Environment Variables:
   `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (and
   `BLOB_READ_WRITE_TOKEN` for uploads).
3. **Redeploy.** On the first request the app creates its tables, creates the admin and
   loads the sample inventory once. Nothing to run by hand.
4. Sign in with `ADMIN_EMAIL`, and you can remove `ADMIN_PASSWORD` from Vercel afterwards.

Neon or any other Postgres works the same way: only the connection string changes.

The schema is created with `CREATE TABLE IF NOT EXISTS` on boot. For later schema
changes, add `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` statements to `SCHEMA` in
`src/lib/db.ts`, or adopt a migration tool once the schema starts changing often.

---

## Not built yet

- **Payments** — plans activate in demo mode without charging. See *Subscriptions* for
  exactly where Stripe plugs in.
- **Outbound email** — nothing is emailed: no receipts, no password reset, no listing-expiry
  reminders. Inquiries are stored and visible to admins only. Add a provider (e.g. Resend).
- **Seller self-service** — sellers can list, renew and remove, but cannot upload photos
  or edit a listing after publishing, and have no inbox for buyer inquiries. The admin
  editor (`AdminListingForm`) has the photo handling to reuse.
- **Account settings** — no change of password or email, and no account deletion.
- **Legal pages** — terms of service, privacy policy and a refund/cancellation policy are
  needed before taking payments.
- **Image resizing** — uploads are stored as sent. Add `sharp` if you want thumbnails.
