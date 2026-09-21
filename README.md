# LimoHunter v2

A used limousine & luxury-transportation marketplace — buy, sell, compare and finance
second-hand livery equipment.

This is an **original, from-scratch implementation**, not a copy of any existing site's
files. All code, styling, artwork and copy in this repository were written for this
project, so the codebase is yours to own, modify and deploy without third-party theme
or plugin licensing.

---

## Quick start

```bash
npm install      # install dependencies
npm run seed     # create data/limohunter.db and load demo inventory
npm run dev      # http://localhost:3000
```

For a production build:

```bash
npm run build
npm start
```

**Demo account:** `demo@limohunter.com` / `demo1234`

---

## What's included

| Area | Status |
|---|---|
| Homepage — hero search, category tiles, featured & recent listings, how-it-works | Working |
| Inventory — faceted filtering, keyword search, 6 sort orders, pagination | Working |
| Listing detail — gallery, full spec table, features, seller contact, similar vehicles | Working |
| Compare — up to 4 vehicles side by side, persisted across pages | Working |
| Sell / list a vehicle — validated multi-section submission form | Working |
| Accounts — register, sign in, session cookies, my listings, saved vehicles | Working |
| Finance & insurance — content page plus a live payment calculator | Working |
| Inquiry capture — listing, finance and general enquiry forms, stored in the database | Working |
| SEO — per-page metadata, Open Graph, `Vehicle` JSON-LD, sitemap, robots | Working |
| Responsive layout, keyboard focus states, semantic landmarks | Working |

### Stack

- **Next.js 15** (App Router, React 19, server components and server actions)
- **TypeScript** in strict mode
- **Tailwind CSS 3**
- **SQLite** via `better-sqlite3` — a single file at `data/limohunter.db`, no external
  database server to run
- **bcryptjs** for password hashing; HMAC-signed, `httpOnly` session cookies

### Layout

```
src/
  app/            routes (home, inventory, listing/[slug], compare, sell,
                  finance, about, contact, login, register, account, sitemap, robots)
  components/     UI: header, footer, cards, filters, gallery, forms, calculator
  lib/
    db.ts         schema + connection (idempotent, created on first boot)
    queries.ts    all reads: search, facets, detail, similar, favourites
    actions.ts    all writes: inquiries, auth, listing create/delete, favourites
    auth.ts       password hashing, session signing/verification
    format.ts     currency, mileage, dates, slugs, amortisation
    types.ts      shared types and the body-style vocabulary
scripts/
  seed.ts         loads demo inventory        (npm run seed)
  verify.ts       34-check data-layer test    (npm run verify)
  make-images.mjs regenerates placeholder art
```

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build and serve |
| `npm run seed` | Reset and reload demo inventory |
| `npm run verify` | Run the data-layer checks (search, sorting, auth, writes) |
| `npm run typecheck` | `tsc --noEmit` |

---

## Placeholder content to replace

Three things are deliberately generic and should be swapped before launch:

1. **Vehicle photography** — `public/img/*.svg` are simple original silhouettes, one set
   per body style. Replace them with real photos (JPG/WebP) and update the `images`
   column, which holds a JSON array of paths per listing.
2. **Inventory data** — the 32 seeded listings in `scripts/seed.ts` are illustrative
   sample records, not real stock. Replace them with a real import.
3. **Logo** — `src/components/Logo.tsx` is a plain generic mark. Drop in the real brand
   asset and the brand palette in `tailwind.config.ts` (`brand.*`).

The phone number and business hours used throughout (`(253) 314-7568`, Mon–Fri
9:00 AM – 5:00 PM) are in `SiteHeader.tsx`, `SiteFooter.tsx`, `about/page.tsx` and
`contact/page.tsx` — update them in one pass if they change.

---

## Importing real inventory

Listings live in one table. The simplest migration path is a script that reads your
existing export (CSV or a database dump) and inserts rows using the same statement as
`scripts/seed.ts`. The columns that matter:

`slug` (unique, URL path) · `title` · `body_style` · `make` · `model` · `year` ·
`price` · `mileage` · `passengers` · `condition` · `fuel` · `city` · `state` ·
`description` · `features` (JSON array) · `images` (JSON array) · `seller_name` ·
`seller_phone` · `featured` · `status`

`body_style` should come from the list in `src/lib/types.ts` so the filters and
category tiles stay in sync; add new values there first if you need more.

---

## Configuration

Copy `.env.example` to `.env` and set:

- `SITE_URL` — absolute URL of the deployment, used for canonical links and the sitemap
- `SESSION_SECRET` — **required in production**; generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DATABASE_PATH` — optional override for the SQLite file location

---

## Deploying

Any host that runs a Node server works (Railway, Render, Fly, a VPS, or Vercel).

The one thing to plan for: the SQLite file must live on **persistent storage**. On a
platform with an ephemeral filesystem, mount a volume and point `DATABASE_PATH` at it,
or move the data layer to Postgres — `src/lib/queries.ts` and `src/lib/actions.ts` are
the only files that talk to the database.

---

## Notes on scope

Deliberately not built, because they need decisions or credentials that belong to the
business:

- **Real photo uploads** — the form applies placeholder art; wiring S3/Cloudinary or
  local disk uploads is a contained change to `ListingForm` and `createListing`.
- **Outbound email** — inquiries are stored in the `inquiries` table but nothing is
  emailed yet. Add an SMTP or API provider in `saveInquiry`.
- **Payments** — there is no checkout; the marketplace connects buyer and seller.
- **Admin moderation UI** — the `role` column exists and sellers manage their own
  listings, but there is no cross-account admin screen.
