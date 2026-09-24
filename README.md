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
npm run seed     # create data/fleet-marketplace.db and load demo inventory
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fleetmarketplace.com` | `demo1234` |
| Seller | `demo@fleetmarketplace.com` | `demo1234` |

Sign in as the admin and the **Admin** link appears in the header.

---

## What's included

### Public site

| Area | Status |
|---|---|
| Homepage — hero search, category tiles, featured & recent listings | Working |
| Inventory — faceted filtering, keyword search, 6 sort orders, pagination | Working |
| Listing detail — gallery, spec table, features, seller contact, similar vehicles | Working |
| Compare — up to 4 vehicles side by side, persisted across pages | Working |
| Sell / list a vehicle — validated submission form | Working |
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
- **SQLite** via `better-sqlite3` — one file, no database server to run
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
    db.ts            schema + connection
    queries.ts       public reads
    actions.ts       public writes (inquiries, auth, listings, favourites)
    admin.ts         admin guard + admin-only reads
    admin-actions.ts admin writes, photo uploads, auto-fill
    photos.ts        Wikimedia Commons photo search and matching
    auth.ts          hashing, session signing/verification
    format.ts        currency, mileage, dates, slugs, amortisation
    types.ts         shared types and the body-style vocabulary
scripts/
  seed.ts           demo inventory              (npm run seed)
  verify.ts         34-check data-layer test    (npm run verify)
  verify-photos.ts  30-check photo matcher test (npm run verify)
  make-images.mjs   regenerates illustrations
  import-photos.mjs bulk-attaches real photos   (npm run import-photos)
```

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
  on drawings in one click. Stored photos survive in a downloaded database with no further
  calls to Wikimedia.
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

- **Inventory** — the 32 seeded listings in `scripts/seed.ts` are illustrative sample
  records, not real stock. Replace them with a real import.
- **Logo** — `src/components/Logo.tsx` is a plain generic mark. Drop in the real brand
  asset and set the palette in `tailwind.config.ts` (`brand.*`).
- **Contact details** — the phone number and hours appear in `SiteHeader.tsx`,
  `SiteFooter.tsx`, `about/page.tsx` and `contact/page.tsx`.

---

## Importing real inventory

Listings live in one table. The simplest path is a script that reads your existing export
and inserts rows using the same statement as `scripts/seed.ts`. The columns that matter:

`slug` (unique, URL path) · `title` · `body_style` · `make` · `model` · `year` · `price` ·
`mileage` · `passengers` · `condition` · `fuel` · `city` · `state` · `description` ·
`features` (JSON array) · `images` (JSON array) · `seller_name` · `seller_phone` ·
`featured` · `status`

`body_style` should come from the list in `src/lib/types.ts` so filters and category tiles
stay in sync.

---

## Configuration

Copy `.env.example` to `.env`:

- `SITE_URL` — absolute URL of the deployment, for canonical links and the sitemap
- `SESSION_SECRET` — **required in production**; generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DATABASE_PATH` — optional override for the SQLite file location

---

## Deploying

Any host that runs a Node server works (Railway, Render, Fly, a VPS, or Vercel).

Two things need persistent storage: the SQLite file and `public/uploads`. On a platform
with an ephemeral filesystem, mount a volume for both, or move to Postgres plus object
storage — `queries.ts`, `actions.ts`, `admin.ts` and `admin-actions.ts` are the only files
that touch the database.

---

## Not built yet

- **Outbound email** — inquiries are stored but nothing is emailed. Add a provider in
  `saveInquiry`.
- **Payments** — there is no checkout; the marketplace connects buyer and seller.
- **Image resizing** — uploads are stored as sent. Add `sharp` if you want thumbnails.
