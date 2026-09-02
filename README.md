# Tutorly

A tutor marketplace for the UK. Tutors publish a profile with subjects, levels,
rates and a weekly availability pattern; students and parents search by subject,
level, distance from a postcode and the days and times that suit them, then
request a specific lesson slot that the tutor accepts or declines.

Responsive web app — it is built to be usable on a phone browser, and there is
no separate mobile build.

## Quick start

Requires Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env          # then set DATABASE_URL
npx prisma migrate deploy     # create the schema
npm run db:seed               # subjects, levels and demo accounts
npm run dev                   # http://localhost:3000
```

### Demo accounts

All seeded accounts use the password `password123`. They exist so you can try
the app immediately — do not seed demo data into a production database.

| Email | Role | What you can see |
| --- | --- | --- |
| `parent@example.com` | Parent | Two children on the account, can request lessons for either |
| `learner@example.com` | Adult learner | Books for themselves |
| `priya@example.com` | Tutor | A complete profile with availability |
| `admin@example.com` | Admin | Tutor verification screen |

Ten demo tutors are seeded across London, Cambridge, Oxford, Bristol,
Birmingham, Manchester and Leeds, so distance search has something to work with.
Try searching `SE1 9RT` within 20 miles.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:seed` | Seed reference data and demo accounts (safe to re-run) |
| `npm run db:reset` | **Wipes the database**, recreates the schema and reseeds |
| `npm run db:studio` | Prisma Studio, to browse the data |
| `npm run test:e2e` | Browser smoke test — see below |

### Smoke test

`scripts/e2e-smoke.mjs` drives a real browser through the flows that matter:
searching, a parent requesting a lesson, a tutor accepting it, the accepted slot
disappearing from availability, availability editing, access control and admin
verification. It asserts on exact counts, so it needs the app running on port
3000 against a freshly seeded database:

```bash
npm run db:reset && npm run build && npm start &
npm run test:e2e
```

## Deploying

The app needs a PostgreSQL database — it will build without one, but every page
that touches data fails at runtime until `DATABASE_URL` is set.

On Vercel (or any host):

1. Provision Postgres — Vercel Postgres, Neon and Supabase all work.
2. Set `DATABASE_URL` in the project's environment variables, for **all**
   environments you deploy (production and preview builds each need it).
3. Run `npx prisma migrate deploy` against that database once, then
   `npm run db:seed` if you want the subject and level lists populated.
   The seed also creates demo accounts, so skip it on anything public.

`npm run build` runs `prisma generate` before `next build`, which is required
on hosts that cache `node_modules` between builds. No page is prerendered at
build time, so the build itself never needs to reach the database.

`vercel.json` pins the framework, install and build commands explicitly. A
Vercel project created against an empty repository stores a "no framework"
preset and does not revisit it when a framework later appears, which makes
deployments fail in a way the repository alone cannot explain — declaring it
here overrides that.

## How it is built

- **Next.js 15** (App Router) with React 19 Server Components and server
  actions. There is no separate API layer — forms post directly to server
  actions.
- **PostgreSQL via Prisma**. The schema is in `prisma/schema.prisma`, with an
  initial migration in `prisma/migrations/`.
- **Tailwind CSS v4**, configured entirely in `src/app/globals.css`.
- **Session auth** rolled by hand in `src/lib/auth.ts`: bcrypt password hashes,
  and an opaque random token in an httpOnly cookie backed by a `Session` row, so
  signing out takes effect immediately. No third-party auth service, and no
  email provider is needed to sign in.

### The parts worth knowing about

**Time and dates** (`src/lib/time.ts`) — every scheduled time is UK local, but
every stored instant is UTC. All conversion goes through this one module so
British Summer Time is handled in a single place. Availability is stored as
minutes-from-midnight in `Europe/London`; bookings are stored as absolute UTC
timestamps.

**Availability** (`src/lib/availability.ts`) — a tutor's weekly pattern
(`AvailabilityRule`) is the base; dated exceptions (`AvailabilityException`)
carve time out of it for holidays and one-off clashes; accepted bookings block
their own span; and anything inside a 12-hour lead time is dropped. The booking
form only offers valid slots, but every request is re-checked server-side
because the form is a hint, not a guarantee.

**Distance** (`src/lib/geo.ts`, `src/lib/search.ts`) — tutor postcodes are
geocoded once, on save, via [postcodes.io](https://postcodes.io) (free, no API
key, UK only) and the coordinates cached on the profile, so search never calls
out. Searcher postcodes are cached in a `PostcodeLookup` table. Search narrows
candidates with a latitude/longitude bounding box in SQL, then applies the exact
haversine distance in application code to trim the corners of the box.

A geocoding failure is never fatal: a tutor can still save their profile (and is
told their listing will not show a distance until the lookup succeeds), and a
search still returns results with a notice that distance filtering was skipped.

**Search filters** are a plain GET form, so results live in the URL — shareable,
bookmarkable, and working with the back button. Choosing "Tuesday" and "evening"
finds Tuesday *evenings*, not a Tuesday plus some unrelated evening, because the
filter requires one single availability rule to satisfy both.

Tutors outside the search radius who teach online are still included, and are
labelled "too far to travel, so online lessons only" — otherwise a Leeds tutor
appearing in a London search looks like a bug.

**Money** is stored in pence as an integer, never as a float.

### Safeguarding

The account model supports both parents booking for a child and adults booking
for themselves; a parent adds children under *Who I book for* and picks one when
requesting a lesson. Only a child's first name and year group are shared, and
only on lessons booked for them.

Tutors can enter their own DBS certificate number and issue date, but that does
not verify them. The **verified badge is admin-only** (`/admin`) and is meant to
be set after a human has seen the certificate. Students can filter on it.
Profiles are searchable as soon as they are complete, without waiting for
approval.

## What is deliberately not built

These were scoped out of this version, in rough order of what I would add next:

1. **Email notifications.** A booking request and its accept/decline currently
   only appear in the dashboard. Nobody is emailed. This is the biggest gap for
   real use — it needs a provider (Resend, Postmark) and an API key.
2. **Payments.** Tutors set a rate and arrange payment directly. There is no
   Stripe integration, commission, invoicing or payout, and adding them brings
   real KYC obligations.
3. **In-app messaging.** Contact details are exchanged only once a booking is
   accepted.
4. **Reviews and ratings.**
5. **Recurring bookings** — a weekly slot for a term is currently ten separate
   requests.
6. **Password reset**, which needs the same email provider as (1).
7. **Rate limiting** on login and booking requests.
8. **Profile photos** — the schema has no image field and there is no upload or
   storage.

## Notes and caveats

- Seeded tutor coordinates are approximate district centres hard-coded in
  `prisma/seed.ts`, so seeding works without network access to the geocoder.
  Profiles created through the app are geocoded properly from the postcode.
- The seed also pre-populates the postcode cache with those same approximate
  coordinates, so you can search by a demo tutor's postcode offline.
- Search returns at most 200 profiles before filtering, and there is no
  pagination. That is fine at demo scale and would need revisiting well before
  it is not.
