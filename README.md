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
    admin-actions.ts admin writes, including photo uploads
    auth.ts          hashing, session signing/verification
    format.ts        currency, mileage, dates, slugs, amortisation
    types.ts         shared types and the body-style vocabulary
scripts/
  seed.ts           demo inventory              (npm run seed)
  verify.ts         34-check data-layer test    (npm run verify)
  make-images.mjs   regenerates illustrations
  import-photos.mjs bulk-attaches real photos   (npm run import-photos)
```

---

## Photography

Listings ship with **original illustrations** — four views per vehicle class (side, front,
rear, interior) drawn for this project, carrying no manufacturer badging. They exist so the
site looks complete before real photography arrives. There are three ways to replace them:

**1. Upload in the admin** — edit any listing, remove the drawings, upload real photos
(JPG/PNG/WebP/AVIF, up to 8 MB each). Files land in `public/uploads`.

**2. Bulk import from folders** — one folder per listing slug:

```bash
npm run import-photos -- --dir ./photos
#   photos/2019-cadillac-xts-stretch-limousine-1/front.jpg
#   photos/2019-cadillac-xts-stretch-limousine-1/rear.jpg
```

**3. Bulk import from a manifest** — map slugs to URLs or local paths:

```bash
npm run import-photos -- --manifest ./photos.json
```

```json
{
  "2019-cadillac-xts-stretch-limousine-1": [
    "https://example.com/photo-1.jpg",
    "./local/photo-2.jpg"
  ]
}
```

Both importers append to a listing's existing real photos and always drop the drawn
placeholders. Pass `--replace` to clear everything first. Run them from a machine with
normal network access — a restricted environment may not be able to reach image hosts.

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
